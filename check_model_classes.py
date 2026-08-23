import joblib
import json
import pandas as pd

print("=" * 70)
print("MINDEASE MODEL CLASS DIAGNOSTIC")
print("=" * 70)

# Load model
model = joblib.load(".\\ai\\mindease_risk_model_final.pkl")
label_encoder = joblib.load(".\\ai\\mindease_risk_label_encoder.pkl")
feature_encoders = joblib.load(".\\ai\\mindease_risk_feature_encoders.pkl")

with open(".\\ai\\mindease_risk_features.json", "r") as f:
    features = json.load(f)

print("\nMODEL TYPE:")
print(type(model))

print("\nMODEL CLASSES:")
print(model.classes_)

print("\nLABEL ENCODER CLASSES:")
print(label_encoder.classes_)

print("\nFEATURES:")
for feature in features:
    print(" -", feature)

print("\nFEATURE ENCODERS:")
for column, encoder in feature_encoders.items():
    print(f"\n{column}")
    print("Classes:", encoder.classes_)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)