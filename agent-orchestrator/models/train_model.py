"""
Risk Model Training Script
Generates synthetic transaction data, trains a RandomForestClassifier,
and saves the model to risk_model.pkl.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

np.random.seed(42)
N_SAMPLES = 5000


def generate_synthetic_data(n: int = N_SAMPLES) -> pd.DataFrame:
    """Generate synthetic transaction data for training."""
    data = {
        "amount": np.random.exponential(scale=500, size=n).clip(1, 50000),
        "is_new_recipient": np.random.choice([0, 1], size=n, p=[0.6, 0.4]),
        "transaction_frequency": np.random.poisson(lam=10, size=n),
        "hour_of_day": np.random.randint(0, 24, size=n),
        "country_risk_score": np.random.uniform(0, 1, size=n),
    }

    df = pd.DataFrame(data)

    # Create risk labels based on rules (simulating real patterns)
    risk_score = (
        (df["amount"] > 3000).astype(float) * 0.3
        + df["is_new_recipient"] * 0.25
        + (df["transaction_frequency"] < 3).astype(float) * 0.15
        + ((df["hour_of_day"] < 6) | (df["hour_of_day"] > 22)).astype(float) * 0.1
        + df["country_risk_score"] * 0.2
        + np.random.normal(0, 0.1, size=n)  # noise
    )

    # Map score to risk level: 0=LOW, 1=MEDIUM, 2=HIGH
    df["risk_level"] = pd.cut(
        risk_score,
        bins=[-np.inf, 0.35, 0.6, np.inf],
        labels=[0, 1, 2],
    ).astype(int)

    return df


def train_model():
    """Train and save the risk assessment model."""
    print("Generating synthetic training data...")
    df = generate_synthetic_data()

    print(f"Dataset shape: {df.shape}")
    print(f"\nRisk level distribution:")
    print(df["risk_level"].value_counts().sort_index().rename({0: "LOW", 1: "MEDIUM", 2: "HIGH"}))

    features = ["amount", "is_new_recipient", "transaction_frequency", "hour_of_day", "country_risk_score"]
    X = df[features]
    y = df["risk_level"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("\nTraining RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\nModel Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=["LOW", "MEDIUM", "HIGH"],
    ))

    # Feature importance
    print("Feature Importance:")
    for feat, imp in sorted(zip(features, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {feat}: {imp:.4f}")

    # Save model
    model_path = os.path.join(os.path.dirname(__file__), "risk_model.pkl")
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path}")

    return model


if __name__ == "__main__":
    train_model()
