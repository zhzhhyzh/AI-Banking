"""
Risk Assessment Model - Runtime inference module.
Loads the trained model and provides risk predictions.
"""

import os
import numpy as np
import joblib
from typing import Literal

RISK_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
MODEL_PATH = os.path.join(os.path.dirname(__file__), "risk_model.pkl")

_model = None


def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Risk model not found at {MODEL_PATH}. "
                "Run 'python models/train_model.py' first."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def assess_risk(
    amount: float,
    is_new_recipient: bool,
    transaction_frequency: int = 10,
    hour_of_day: int = 12,
    country_risk_score: float = 0.3,
) -> dict:
    """
    Assess the risk level of a transaction.

    Returns:
        dict with keys: risk_level (LOW/MEDIUM/HIGH), confidence, details
    """
    model = _load_model()

    features = np.array([[
        amount,
        int(is_new_recipient),
        transaction_frequency,
        hour_of_day,
        country_risk_score,
    ]])

    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]

    risk_level = RISK_LABELS[prediction]
    confidence = float(max(probabilities))

    # Build human-readable explanation
    reasons = []
    if amount > 3000:
        reasons.append(f"Large transaction amount (${amount:,.2f})")
    if is_new_recipient:
        reasons.append("New/unknown recipient")
    if transaction_frequency < 3:
        reasons.append("Low account activity (unusual behavior)")
    if hour_of_day < 6 or hour_of_day > 22:
        reasons.append(f"Unusual transaction time ({hour_of_day}:00)")
    if country_risk_score > 0.7:
        reasons.append(f"High-risk geography (score: {country_risk_score:.2f})")

    return {
        "risk_level": risk_level,
        "confidence": round(confidence, 3),
        "probabilities": {
            "LOW": round(float(probabilities[0]), 3),
            "MEDIUM": round(float(probabilities[1]), 3),
            "HIGH": round(float(probabilities[2]), 3),
        },
        "reasons": reasons if reasons else ["No significant risk factors detected"],
    }
