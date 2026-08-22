import joblib
import pandas as pd

print("=" * 60)
print("MINDEASE HIGH-RISK MODEL TEST")
print("=" * 60)

model = joblib.load(
    "mindease-backend/ai_models/mindease_risk_model_final.pkl"
)

risk_encoder = joblib.load(
    "mindease-backend/ai_models/mindease_risk_label_encoder.pkl"
)

feature_encoders = joblib.load(
    "mindease-backend/ai_models/mindease_risk_feature_encoders.pkl"
)

features = [
    "age",
    "gender",
    "academic_year",
    "study_hours_per_day",
    "exam_pressure",
    "academic_performance",
    "stress_level",
    "sleep_hours",
    "physical_activity",
    "social_support",
    "screen_time",
    "internet_usage",
    "financial_stress",
    "family_expectation"
]

# Extreme high-risk test case
data = {
    "age": 22,
    "gender": "Male",
    "academic_year": 3,
    "study_hours_per_day": 10,
    "exam_pressure": 5,
    "academic_performance": 45,
    "stress_level": 5,
    "sleep_hours": 4,
    "physical_activity": 1,
    "social_support": 2,
    "screen_time": 10,
    "internet_usage": 10,
    "financial_stress": 5,
    "family_expectation": 5
}

df = pd.DataFrame([data])

print("\nINPUT:")
print(df.to_string(index=False))

# Encode categorical features
for column, encoder in feature_encoders.items():
    if column in df.columns:
        df[column] = encoder.transform(df[column])

print("\nENCODED INPUT:")
print(df.to_string(index=False))

# Prediction
prediction = model.predict(df[features])

risk = risk_encoder.inverse_transform(prediction)[0]

print("\n" + "=" * 60)
print("MODEL RESULT")
print("=" * 60)

print("Prediction number :", prediction[0])
print("Risk level        :", risk)

# Probability
if hasattr(model, "predict_proba"):
    probabilities = model.predict_proba(df[features])[0]

    print("\nPROBABILITIES:")

    for label, probability in zip(
        risk_encoder.classes_,
        probabilities
    ):
        print(f"{label:10s}: {probability:.4f}")

print("=" * 60)