import joblib
import pandas as pd
import random

print("=" * 70)
print("MINDEASE MODEL - SEARCHING FOR HIGH-RISK REGION")
print("=" * 70)

# ------------------------------------------------------------
# LOAD MODEL
# ------------------------------------------------------------

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

print("\nModel classes:")
print(risk_encoder.classes_)

# ------------------------------------------------------------
# TRACK BEST RESULTS
# ------------------------------------------------------------

best_high_probability = -1
best_high_case = None

best_medium_probability = -1
best_medium_case = None

best_low_probability = -1
best_low_case = None

high_predictions = 0
medium_predictions = 0
low_predictions = 0

# ------------------------------------------------------------
# SEARCH
# ------------------------------------------------------------

for attempt in range(100000):

    data = {
        "age": random.randint(18, 30),

        "gender": random.choice([
            "Male",
            "Female"
        ]),

        "academic_year": random.randint(1, 4),

        "study_hours_per_day":
            round(random.uniform(0, 14), 1),

        "exam_pressure":
            random.randint(1, 5),

        "academic_performance":
            random.randint(0, 100),

        "stress_level":
            random.randint(1, 5),

        "sleep_hours":
            round(random.uniform(2, 12), 1),

        "physical_activity":
            random.randint(1, 7),

        "social_support":
            random.randint(1, 10),

        "screen_time":
            round(random.uniform(0, 16), 1),

        "internet_usage":
            round(random.uniform(0, 16), 1),

        "financial_stress":
            random.randint(1, 5),

        "family_expectation":
            random.randint(1, 5)
    }

    df = pd.DataFrame([data])

    # Encode categorical features
    for column, encoder in feature_encoders.items():
        if column in df.columns:
            df[column] = encoder.transform(df[column])

    X = df[features]

    prediction = model.predict(X)
    probabilities = model.predict_proba(X)[0]

    risk = risk_encoder.inverse_transform(prediction)[0]

    # Map probabilities correctly
    probability_map = dict(
        zip(
            risk_encoder.classes_,
            probabilities
        )
    )

    high_prob = probability_map.get("High", 0)
    medium_prob = probability_map.get("Medium", 0)
    low_prob = probability_map.get("Low", 0)

    # Count predictions
    if risk == "High":
        high_predictions += 1

    elif risk == "Medium":
        medium_predictions += 1

    elif risk == "Low":
        low_predictions += 1

    # Best HIGH probability
    if high_prob > best_high_probability:
        best_high_probability = high_prob
        best_high_case = data.copy()

    # Best MEDIUM probability
    if medium_prob > best_medium_probability:
        best_medium_probability = medium_prob
        best_medium_case = data.copy()

    # Best LOW probability
    if low_prob > best_low_probability:
        best_low_probability = low_prob
        best_low_case = data.copy()


# ------------------------------------------------------------
# RESULTS
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("SEARCH COMPLETE")
print("=" * 70)

print("\nPrediction counts:")
print("High   :", high_predictions)
print("Medium :", medium_predictions)
print("Low    :", low_predictions)

# ------------------------------------------------------------
# BEST HIGH PROBABILITY
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("BEST HIGH-PROBABILITY CASE")
print("=" * 70)

print(f"\nHighest High probability found: {best_high_probability:.4f}")

print("\nInput values:")

for key, value in best_high_case.items():
    print(f"{key:25s}: {value}")

# Recalculate exact probabilities
df = pd.DataFrame([best_high_case])

for column, encoder in feature_encoders.items():
    if column in df.columns:
        df[column] = encoder.transform(df[column])

prediction = model.predict(df[features])
probabilities = model.predict_proba(df[features])[0]

risk = risk_encoder.inverse_transform(prediction)[0]

print("\nPrediction:", risk)

print("\nProbabilities:")

for label, probability in zip(
    risk_encoder.classes_,
    probabilities
):
    print(f"{label:10s}: {probability:.4f}")

# ------------------------------------------------------------
# INTERPRETATION
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("INTERPRETATION")
print("=" * 70)

if high_predictions > 0:

    print("""
The model DOES predict High risk for some inputs.

Use the best High-risk case above
to test the React check-in form.
""")

else:

    print("""
The model did NOT predict High risk in 100,000
random test cases.

This does NOT automatically mean the model is broken.

The High class may be extremely difficult to reach
because of the way the model was trained.
The highest High probability above is important
for diagnosing this.
""")