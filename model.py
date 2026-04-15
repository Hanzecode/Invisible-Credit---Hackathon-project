"""
model.py
Loads the trained XGBoost model and provides predict() with SHAP explanations.
"""

import os
import joblib
import numpy as np
import pandas as pd
import shap
from functools import lru_cache
from typing import Any

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

FEATURE_LABELS = {
    "telco_provider": "Telco provider",
    "monthly_topup": "Monthly top-up amount",
    "topup_frequency": "Top-up frequency",
    "utility_payments_on_time": "Utility payments on time",
    "gcash_maya_active": "GCash / Maya active",
    "monthly_send_volume": "Monthly send volume",
    "livelihood_type": "Livelihood type",
    "years_in_livelihood": "Years in livelihood",
    "psychometric_score": "Psychometric score",
}

TELCO_MAP = {"Smart": 0, "Globe": 1, "DITO": 2}
LIVELIHOOD_MAP = {"vendor": 0, "farmer": 1, "fisher": 2, "other": 3}


@lru_cache(maxsize=1)
def load_model() -> dict[str, Any]:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. Run train.py first."
        )
    return joblib.load(MODEL_PATH)


def _encode_features(data: dict) -> pd.DataFrame:
    """Convert API payload dict to model-ready DataFrame."""
    row = {
        "telco_provider": TELCO_MAP.get(data["telco_provider"], 1),
        "monthly_topup": float(data["monthly_topup"]),
        "topup_frequency": float(data["topup_frequency"]),
        "utility_payments_on_time": float(data["utility_payments_on_time"]),
        "gcash_maya_active": int(data["gcash_maya_active"]),
        "monthly_send_volume": float(data["monthly_send_volume"]),
        "livelihood_type": LIVELIHOOD_MAP.get(data["livelihood_type"], 3),
        "years_in_livelihood": float(data["years_in_livelihood"]),
        "psychometric_score": float(data["psychometric_score"]),
    }
    artifact = load_model()
    return pd.DataFrame([row], columns=artifact["feature_cols"])


def _band(score: int) -> str:
    if score >= 70:
        return "Approve"
    elif score >= 50:
        return "Conditional Approve"
    else:
        return "Decline"


def _shap_reason_codes(model, X: pd.DataFrame) -> list[str]:
    """Return top-3 plain-language SHAP reason codes."""
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)

    # shap_values shape: (1, n_features)
    vals = shap_values[0]  # array of shap values for this prediction
    feature_names = list(X.columns)

    # Sort by absolute value descending
    sorted_idx = np.argsort(np.abs(vals))[::-1]

    codes = []
    for i in sorted_idx[:3]:
        name = FEATURE_LABELS.get(feature_names[i], feature_names[i])
        impact = vals[i]
        pts = int(round(abs(impact) * 100))
        direction = "+" if impact > 0 else "-"
        codes.append(f"{name} {direction}{pts} pts")

    return codes


def predict(data: dict) -> dict:
    artifact = load_model()
    model = artifact["model"]
    X = _encode_features(data)

    prob = float(model.predict_proba(X)[0, 1])
    credit_score = int(round(prob * 100))
    band = _band(credit_score)
    reason_codes = _shap_reason_codes(model, X)

    return {
        "credit_score": credit_score,
        "band": band,
        "probability": round(prob, 4),
        "reason_codes": reason_codes,
        "model_version": artifact.get("version", "v1.0.0-hackathon"),
    }
