"""
psychometric.py
Sends borrower quiz answers to Gemini and parses
the psychometric score + reasoning flags.
"""
import os
import re
import json
import asyncio
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "put key here")

# Configure the SDK with the API key (required before creating a model)
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

MODEL = "gemini-2.5-flash"

PSYCHOMETRIC_QUESTIONS = [
    "If you borrowed ₱5,000 today, when and how would you plan to repay it?",
    "Describe a time when money was tight. What did you do to manage?",
    "How do you usually decide whether to spend or save when you have extra cash?",
    "If a neighbour asked to borrow money but you had bills due, what would you do?",
    "What is your biggest financial goal in the next two years, and what steps are you taking toward it?",
]

SYSTEM_PROMPT = """You are a financial psychometrics analyst specialising in micro-lending for informal-economy borrowers in the Philippines.
Your task is to analyse a borrower's free-text responses to five questions and return a JSON object with:
- "psychometric_score": a float from 0 to 100 indicating overall financial conscientiousness (higher = more conscientious)
- "flags": an array of 2–3 short strings (each under 15 words) noting key behavioural signals observed
- "conscientiousness_band": one of "High" (score ≥ 70), "Medium" (50–69), or "Low" (< 50)
Scoring dimensions:
1. Future orientation – does the borrower plan ahead?
2. Loss aversion – are they risk-aware without being paralysed?
3. Social accountability – do they honour commitments to others?
4. Spending discipline – can they delay gratification?
Return ONLY valid JSON, no preamble, no markdown fences.
"""


def _build_prompt(borrower_name: str, answers: list[str]) -> str:
    lines = [f"Borrower name: {borrower_name}\n"]
    for i, (q, a) in enumerate(zip(PSYCHOMETRIC_QUESTIONS, answers), 1):
        lines.append(f"Q{i}: {q}")
        lines.append(f"A{i}: {a}\n")
    return "\n".join(lines)


async def score_psychometric(answers: list[str], borrower_name: str = "Borrower") -> dict:
    """Call Gemini and return parsed psychometric result."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set in environment")

    # Create model instance per-call to avoid shared-state issues across async calls
    model = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=SYSTEM_PROMPT,  # Pass system prompt properly via system_instruction
    )

    prompt_body = _build_prompt(borrower_name, answers)

    # Use get_running_loop() instead of deprecated get_event_loop()
    loop = asyncio.get_running_loop()
    response = await loop.run_in_executor(
        None,
        lambda: model.generate_content(prompt_body),
    )

    raw_text = response.text

    # Strip any accidental markdown fences
    raw_text = re.sub(r"^```(?:json)?", "", raw_text).strip()
    raw_text = re.sub(r"```$", "", raw_text).strip()

    result = json.loads(raw_text)

    # Validate / normalise
    score = float(result.get("psychometric_score", 50))
    score = max(0.0, min(100.0, score))

    flags = result.get("flags", [])
    if not flags:
        flags = ["Insufficient signal — manual review recommended"]

    band_raw = result.get("conscientiousness_band", "")
    if band_raw not in ("High", "Medium", "Low"):
        band_raw = "High" if score >= 70 else ("Medium" if score >= 50 else "Low")

    return {
        "psychometric_score": round(score, 2),
        "flags": flags[:3],
        "conscientiousness_band": band_raw,
    }


def score_psychometric_fallback(manual_score: float, justification: str) -> dict:
    """Fallback when Gemini API is unavailable — accept officer's manual entry."""
    score = max(0.0, min(100.0, float(manual_score)))
    band = "High" if score >= 70 else ("Medium" if score >= 50 else "Low")
    return {
        "psychometric_score": round(score, 2),
        "flags": [f"Manual score: {justification}"],
        "conscientiousness_band": band,
    }