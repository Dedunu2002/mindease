# test_model1.py — Run this to confirm AI Model 1 works in your project
# Run with: python test_model1.py

import joblib
import numpy as np

print("Loading AI Model 1...")

# Load both saved files
model   = joblib.load('ai_models/risk_model.pkl')
encoder = joblib.load('ai_models/risk_encoder.pkl')

print("✅ Model loaded successfully")
print(f"   Model type    : {type(model).__name__}")
print(f"   Output labels : {list(encoder.classes_)}")
print(f"   Input features: {model.n_features_in_}")

# Test with a sample prediction
# Order: [Sleep_Hours, Study_Hours, Social_Support,
#         Anxiety_Level, Stress_Level, Depression_Score, Burnout_Score]
sample = np.array([[7, 5, 3, 4, 4, 3, 30]])

prediction_num   = model.predict(sample)[0]
prediction_label = encoder.inverse_transform([prediction_num])[0]

print(f"\nTest prediction  : {prediction_label}")
print("\n✅ AI Model 1 is ready to use in MindEase!")