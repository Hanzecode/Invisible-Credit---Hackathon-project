"""
main.py
FastAPI application for Invisible Credit — AI-powered micro-lending for the Philippines.
Exposes:
  POST /score          — credit scoring via XGBoost + SHAP
  POST /psychometric   — psychometric assessment via Gemini
  GET  /health         — liveness probe
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Annotated, Literal, Optional
import logging

from model import predict
from psychometric import score_psychometric, score_psychometric_fallback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("invisible-credit")

app = FastAPI(
    title="Invisible Credit API",
    description="AI-powered micro-lending credit scoring for Rural and Cooperative Banks in the Philippines.",
    version="1.0.0-hackathon",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ──────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    telco_provider: Literal["Smart", "Globe", "DITO"] = Field(
        ..., description="Borrower's mobile network operator"
    )
    monthly_topup: int = Field(..., ge=0, description="PHP monthly top-up amount")
    topup_frequency: int = Field(..., ge=0, le=31, description="Top-ups per month")
    utility_payments_on_time: int = Field(
        ..., ge=0, le=12, description="On-time utility payments in last 12 months"
    )
    gcash_maya_active: bool = Field(..., description="Has active GCash or Maya account")
    monthly_send_volume: int = Field(..., ge=0, description="PHP sent per month via mobile money")
    livelihood_type: Literal["vendor", "farmer", "fisher", "other"]
    years_in_livelihood: int = Field(..., ge=0, le=60)
    psychometric_score: float = Field(..., ge=0.0, le=100.0)


class ScoreResponse(BaseModel):
    credit_score: int
    band: Literal["Approve", "Conditional Approve", "Decline"]
    probability: float
    reason_codes: list[str]
    model_version: str


class PsychometricRequest(BaseModel):
    # Bug fix: min_length/max_length on list fields is not valid in Pydantic v2.
    # Use a field_validator to enforce exactly 5 answers instead.
    answers: list[str] = Field(..., description="Exactly 5 answers to the psychometric questions")
    borrower_name: str = Field(default="Borrower", max_length=100)

    @field_validator("answers")
    @classmethod
    def must_have_five_answers(cls, v: list[str]) -> list[str]:
        if len(v) != 5:
            raise ValueError(f"Exactly 5 answers are required, got {len(v)}.")
        for i, answer in enumerate(v, 1):
            if not answer or not answer.strip():
                raise ValueError(f"Answer {i} must not be empty.")
        return v


class PsychometricFallbackRequest(BaseModel):
    manual_score: float = Field(..., ge=0.0, le=100.0)
    justification: str = Field(..., min_length=5, max_length=300)


class PsychometricResponse(BaseModel):
    psychometric_score: float
    flags: list[str]
    conscientiousness_band: Literal["High", "Medium", "Low"]


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "invisible-credit-api"}


@app.post("/score", response_model=ScoreResponse)
def score_borrower(request: ScoreRequest):
    """
    Run credit scoring on a borrower's alternative data profile.
    Returns a 0–100 credit score, approval band, and top-3 SHAP reason codes.
    """
    try:
        result = predict(request.model_dump())
        logger.info(
            "Score computed | score=%s band=%s",
            result["credit_score"],
            result["band"],
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e) + " — start the server with a trained model (run train.py first).",
        )
    except Exception as e:
        logger.exception("Scoring error")
        raise HTTPException(status_code=500, detail=f"Scoring failed: {e}")


@app.post("/psychometric", response_model=PsychometricResponse)
async def psychometric_assessment(request: PsychometricRequest):
    """
    Forward borrower quiz answers to Gemini and return a psychometric score
    with reasoning flags and conscientiousness band.
    """
    try:
        result = await score_psychometric(
            answers=request.answers,
            borrower_name=request.borrower_name,
        )
        logger.info(
            "Psychometric scored | score=%.1f band=%s",
            result["psychometric_score"],
            result["conscientiousness_band"],
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Psychometric error")
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API call failed: {e}. Use /psychometric/fallback for manual entry.",
        )


@app.post("/psychometric/fallback", response_model=PsychometricResponse)
def psychometric_fallback(request: PsychometricFallbackRequest):
    """
    Manual fallback: loan officer assigns a psychometric score with written justification.
    Used when the Gemini API is unavailable.
    """
    result = score_psychometric_fallback(
        manual_score=request.manual_score,
        justification=request.justification,
    )
    logger.info("Psychometric fallback used | score=%.1f", result["psychometric_score"])
    return result