import joblib
import json
import random
import warnings
import pandas as pd
from pathlib import Path

# Hide the repetitive scikit-learn/joblib warnings
warnings.filterwarnings("ignore")

# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "mindease-backend" / "ai_models"

MODEL_PATH = MODEL_DIR / "mindease_risk_model_final.pkl"
FEATURES_PATH = MODEL_DIR / "mindease_risk_features.json"
ENCODERS_PATH = MODEL_DIR / "mindease_risk_feature_encoders.pkl"
LABEL_ENCODER_PATH = MODEL_DIR / "mindease_risk_label_encoder.pkl"


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 70)
print("MINDEASE HIGH-RISK SEARCH")
print("=" * 70)

print("\nLoading model files...")

model = joblib.load(MODEL_PATH)

with open(FEATURES_PATH, "r") as f:
    features = json.load(f)

feature_encoders = joblib.load(ENCODERS_PATH)
label_encoder = joblib.load(LABEL_ENCODER_PATH)

print("✅ Model loaded")
print("✅ Features loaded")
print("✅ Encoders loaded")
print("✅ Label encoder loaded")

print("\nModel classes:")
print(label_encoder.classes_)

print("\nFeatures:")
print(features)


# ============================================================
# CREATE TEST CASES
# ============================================================

def generate_cases(number):

    cases = []

    for _ in range(number):

        cases.append({
            "age": random.randint(18, 30),

            "gender": random.choice([
                "Male",
                "Female"
            ]),

            "academic_year": random.randint(1, 4),

            "study_hours_per_day": random.uniform(0, 20),

            "exam_pressure": random.uniform(1, 5),

            "academic_performance": random.uniform(0, 100),

            "stress_level": random.uniform(1, 5),

            "sleep_hours": random.uniform(2, 10),

            "physical_activity": random.uniform(0, 10),

            "social_support": random.uniform(1, 10),

            "screen_time": random.uniform(0, 15),

            "internet_usage": random.uniform(0, 20),

            "financial_stress": random.uniform(1, 5),

            "family_expectation": random.uniform(1, 5)
        })

    return cases


# ============================================================
# CONVERT CASES TO DATAFRAME
# ============================================================

def prepare_dataframe(cases):

    df = pd.DataFrame(cases)

    # Make sure columns are in exactly the same order
    df = df[features]

    # Apply the same categorical encoders
    for column, encoder in feature_encoders.items():

        if column in df.columns:

            values = df[column].astype(str)

            known_values = set(
                str(x) for x in encoder.classes_
            )

            df[column] = values.apply(
                lambda value:
                    encoder.transform([value])[0]
                    if value in known_values
                    else 0
            )

    return df


# ============================================================
# SEARCH
# ============================================================

TOTAL_CASES = 50000
BATCH_SIZE = 5000

best_high_probability = -1
best_case = None
best_prediction = None
best_probabilities = None

high_found = False


print("\n")
print("=" * 70)
print(f"SEARCHING {TOTAL_CASES:,} POSSIBLE CASES")
print("=" * 70)


for start in range(0, TOTAL_CASES, BATCH_SIZE):

    current_size = min(
        BATCH_SIZE,
        TOTAL_CASES - start
    )

    cases = generate_cases(current_size)

    df = prepare_dataframe(cases)

    # --------------------------------------------------------
    # Batch prediction
    # --------------------------------------------------------

    predictions = model.predict(df)

    probabilities = model.predict_proba(df)


    # --------------------------------------------------------
    # Find High class
    # --------------------------------------------------------

    high_class_number = None

    for model_class in model.classes_:

        label = label_encoder.inverse_transform(
            [model_class]
        )[0]

        if str(label).lower() == "high":

            high_class_number = model_class
            break


    if high_class_number is None:

        print("\n❌ ERROR: Model does not contain a High class.")

        print(
            "Available classes:",
            label_encoder.classes_
        )

        break


    high_index = list(
        model.classes_
    ).index(high_class_number)


    high_probabilities = probabilities[:, high_index]


    # --------------------------------------------------------
    # Find best case in this batch
    # --------------------------------------------------------

    batch_best_index = high_probabilities.argmax()

    batch_best_probability = high_probabilities[
        batch_best_index
    ]


    if batch_best_probability > best_high_probability:

        best_high_probability = batch_best_probability

        best_case = cases[batch_best_index]

        best_prediction = label_encoder.inverse_transform(
            [predictions[batch_best_index]]
        )[0]

        best_probabilities = probabilities[
            batch_best_index
        ]


    # --------------------------------------------------------
    # Check whether High was actually predicted
    # --------------------------------------------------------

    high_prediction_indices = []

    for i, prediction in enumerate(predictions):

        label = label_encoder.inverse_transform(
            [prediction]
        )[0]

        if str(label).lower() == "high":

            high_prediction_indices.append(i)


    print(
        f"Checked {start + current_size:>6,} / "
        f"{TOTAL_CASES:,} | "
        f"Best High probability: "
        f"{best_high_probability:.4f}"
    )


    # --------------------------------------------------------
    # HIGH FOUND
    # --------------------------------------------------------

    if high_prediction_indices:

        index = high_prediction_indices[0]

        found_case = cases[index]

        found_probabilities = probabilities[index]

        found_prediction = label_encoder.inverse_transform(
            [predictions[index]]
        )[0]


        print("\n")
        print("=" * 70)
        print("🎯 HIGH-RISK CASE FOUND!")
        print("=" * 70)

        print("\nENTER THESE VALUES IN YOUR CHECK-IN FORM:\n")

        for key, value in found_case.items():

            if isinstance(value, float):

                print(
                    f"{key:25}: {value:.2f}"
                )

            else:

                print(
                    f"{key:25}: {value}"
                )


        print("\nMODEL PROBABILITIES:\n")

        for model_class, probability in zip(
            model.classes_,
            found_probabilities
        ):

            label = label_encoder.inverse_transform(
                [model_class]
            )[0]

            print(
                f"{label:10}: {probability:.4f}"
            )


        print("\nFINAL PREDICTION:")
        print(found_prediction)

        print("=" * 70)

        high_found = True

        break


# ============================================================
# NO HIGH FOUND
# ============================================================

if not high_found:

    print("\n")
    print("=" * 70)
    print("NO HIGH PREDICTION FOUND")
    print("=" * 70)

    print(
        f"\nTested {TOTAL_CASES:,} combinations."
    )

    print(
        f"Highest High probability found: "
        f"{best_high_probability:.4f}"
    )

    print("\nBEST CASE FOUND:\n")

    if best_case:

        for key, value in best_case.items():

            if isinstance(value, float):

                print(
                    f"{key:25}: {value:.2f}"
                )

            else:

                print(
                    f"{key:25}: {value}"
                )


        print(
            "\nPredicted class:",
            best_prediction
        )


        print("\nProbabilities:\n")

        for model_class, probability in zip(
            model.classes_,
            best_probabilities
        ):

            label = label_encoder.inverse_transform(
                [model_class]
            )[0]

            print(
                f"{label:10}: {probability:.4f}"
            )

    print("=" * 70)