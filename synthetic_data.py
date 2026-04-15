"""
synthetic_data.py
Generates a realistic 1,000-row training dataset for the credit scoring model.
Based on Philippine MSME borrower profiles per BSP and USAID research.
"""

import numpy as np
import pandas as pd

SEED = 42


def generate_dataset(n: int = 1000, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # Livelihood distribution: 40% vendors, 35% farmers/fishers, 25% other
    livelihood_choices = ["vendor", "farmer", "fisher", "other"]
    livelihood_probs = [0.40, 0.175, 0.175, 0.25]
    livelihood_type = rng.choice(livelihood_choices, size=n, p=livelihood_probs)

    # Telco provider — arbitrary distribution
    telco_provider = rng.choice(["Smart", "Globe", "DITO"], size=n, p=[0.40, 0.45, 0.15])

    # Monthly top-up amount (PHP)
    monthly_topup = rng.integers(50, 1500, size=n).astype(float)

    # Top-up frequency per month
    topup_frequency = rng.integers(1, 31, size=n).astype(float)

    # Utility payments on time (months in last 12) — key predictor (r≈0.61 with repayment)
    # We'll bake in the correlation below via a latent variable
    latent_repayment = rng.standard_normal(n)  # base latent factor

    utility_payments_on_time = np.clip(
        np.round(6 + 4 * 0.61 * latent_repayment + rng.standard_normal(n) * 2),
        0, 12
    ).astype(int)

    # GCash / Maya active
    gcash_maya_active = (rng.uniform(size=n) < 0.65).astype(int)

    # Monthly send volume (PHP)
    monthly_send_volume = np.clip(
        rng.integers(0, 8000, size=n).astype(float),
        0, 8000
    )

    # Years in livelihood
    years_in_livelihood = np.clip(
        rng.integers(1, 20, size=n).astype(float),
        1, 30
    )

    # Psychometric score: N(58, 15), clipped 0-100, correlated at r≈0.44
    psychometric_score = np.clip(
        58 + 15 * (0.44 * latent_repayment + np.sqrt(1 - 0.44**2) * rng.standard_normal(n)),
        0, 100
    )

    # Encode livelihood as numeric for model
    livelihood_map = {"vendor": 0, "farmer": 1, "fisher": 2, "other": 3}
    livelihood_num = np.array([livelihood_map[l] for l in livelihood_type])

    # Telco encoded
    telco_map = {"Smart": 0, "Globe": 1, "DITO": 2}
    telco_num = np.array([telco_map[t] for t in telco_provider])

    # Construct repayment label: 72% repaid per BSP 2024 data
    # Driven by latent factor + some noise
    repayment_prob = 1 / (1 + np.exp(-(
        0.8 * latent_repayment
        + 0.3 * (utility_payments_on_time / 12 - 0.5)
        + 0.2 * (psychometric_score / 100 - 0.5)
        + 0.1 * (gcash_maya_active - 0.5)
        + 0.05 * (years_in_livelihood / 20 - 0.5)
    )))
    # Shift so ~72% repay
    threshold = np.percentile(repayment_prob, 28)
    repaid = (repayment_prob >= threshold).astype(int)

    df = pd.DataFrame({
        "telco_provider": telco_num,
        "monthly_topup": monthly_topup,
        "topup_frequency": topup_frequency,
        "utility_payments_on_time": utility_payments_on_time,
        "gcash_maya_active": gcash_maya_active,
        "monthly_send_volume": monthly_send_volume,
        "livelihood_type": livelihood_num,
        "years_in_livelihood": years_in_livelihood,
        "psychometric_score": psychometric_score,
        "repaid": repaid,
    })

    return df


if __name__ == "__main__":
    df = generate_dataset()
    print(df.describe())
    print(f"\nRepayment rate: {df['repaid'].mean():.2%}")
    df.to_csv("training_data.csv", index=False)
    print("Saved training_data.csv")
