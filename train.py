"""
train.py
Trains an XGBoost classifier on synthetic Philippine MSME borrower data.
Serialises the trained model + preprocessing pipeline to model.pkl.
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import xgboost as xgb

from synthetic_data import generate_dataset

FEATURE_COLS = [
    "telco_provider",
    "monthly_topup",
    "topup_frequency",
    "utility_payments_on_time",
    "gcash_maya_active",
    "monthly_send_volume",
    "livelihood_type",
    "years_in_livelihood",
    "psychometric_score",
]
TARGET_COL = "repaid"
MODEL_PATH = "model.pkl"


def train():
    print("Generating synthetic dataset...")
    df = generate_dataset(n=1000)
    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n=== Evaluation ===")
    print(classification_report(y_test, y_pred))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_prob):.4f}")

    artifact = {
        "model": model,
        "feature_cols": FEATURE_COLS,
        "version": "v1.0.0-hackathon",
    }
    joblib.dump(artifact, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")


if __name__ == "__main__":
    train()
