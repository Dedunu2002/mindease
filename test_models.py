import joblib
import json
import pandas as pd


print("=" * 55)
print("  MINDEASEAI MODEL VERIFICATION TEST")
print("=" * 55)


# ============================================================
# AI MODEL 1 — RISK CLASSIFIER
# ============================================================

print("\nLoading AI Model 1 (Risk Classifier)...")

risk_model = joblib.load(
    "ai_models/mindease_risk_model_final.pkl"
)

risk_encoder = joblib.load(
    "ai_models/mindease_risk_label_encoder.pkl"
)

feature_encoders = joblib.load(
    "ai_models/mindease_risk_feature_encoders.pkl"
)

with open(
    "ai_models/mindease_risk_features.json",
    "r"
) as f:
    risk_features = json.load(f)


print("✅ Risk model loaded")
print("✅ Label encoder loaded")
print("✅ Feature encoders loaded")

print("Labels:", risk_encoder.classes_)
print("Features:", risk_features)


# ============================================================
# TEST INPUT
# ============================================================

sample = {
    "age": 22,
    "gender": "Male",
    "academic_year": 3,
    "study_hours_per_day": 4,
    "exam_pressure": 3,
    "academic_performance": 75,
    "stress_level": 2,
    "sleep_hours": 7,
    "physical_activity": 4,
    "social_support": 7,
    "screen_time": 3,
    "internet_usage": 5,
    "financial_stress": 2,
    "family_expectation": 3
}


# ============================================================
# CREATE DATAFRAME IN EXACT FEATURE ORDER
# ============================================================

row = {
    col: sample.get(col)
    for col in risk_features
}

df = pd.DataFrame([row])


print("\nInput before encoding:")
print(df)


# ============================================================
# APPLY SAVED FEATURE ENCODERS
# ============================================================

for col, encoder in feature_encoders.items():

    if col in df.columns:

        value = str(df.at[0, col])

        if value in encoder.classes_:

            df[col] = encoder.transform([value])

        else:

            print(
                f"⚠️ Unknown value '{value}' "
                f"for feature '{col}'"
            )

            df[col] = 0


print("\nInput after encoding:")
print(df)


# ============================================================
# PREDICTION
# ============================================================

prediction = risk_model.predict(df)[0]

risk_label = risk_encoder.inverse_transform(
    [prediction]
)[0]


# ============================================================
# RESULT
# ============================================================

print("\n" + "=" * 55)
print("  MODEL 1 RESULT")
print("=" * 55)

print("Prediction number :", prediction)
print("Risk level        :", risk_label)

print("\n✅ AI Model 1 test completed successfully!")