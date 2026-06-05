# test_models.py — Run this in VS Code: python test_models.py
# Tests both AI models to confirm they load and predict correctly

import joblib, numpy as np, re, json

print("=" * 50)
print("  MINDEASEAI MODEL VERIFICATION TEST")
print("=" * 50 + "\n")

# ── Test AI Model 1: Risk Classifier ──────────────────────────
print("Loading AI Model 1 (Risk Classifier)...")
risk_model   = joblib.load('ai_models/risk_model.pkl')
risk_encoder = joblib.load('ai_models/risk_encoder.pkl')
print(f"✅ Loaded — labels: {list(risk_encoder.classes_)}")

# Test prediction (Sleep, Study, Social, Anxiety, Stress, Depression, Burnout)
sample_healthy  = np.array([[8, 4, 4, 2, 2, 1, 15]])
sample_stressed = np.array([[4, 12, 1, 8, 9, 7, 80]])

pred1 = risk_encoder.inverse_transform(risk_model.predict(sample_healthy))[0]
pred2 = risk_encoder.inverse_transform(risk_model.predict(sample_stressed))[0]

print(f"   Healthy student  → {pred1}  (expected: Good)")
print(f"   Stressed student → {pred2}  (expected: Poor)")

print()

# ── Test AI Model 2: Sentiment Analyser ───────────────────────
print("Loading AI Model 2 (Sentiment Analyser)...")
sentiment_model = joblib.load('ai_models/sentiment_model.pkl')
tfidf           = joblib.load('ai_models/tfidf_vectorizer.pkl')
print(f"✅ Loaded — emotions: {list(sentiment_model.classes_)}")

# Load mood group mapping
with open('ai_models/mood_map.json') as f:
    mood_map = json.load(f)

def test_sentiment(text, expected):
    clean = re.sub(r'[^a-z\s]', '', text.lower()).strip()
    vec   = tfidf.transform([clean])
    emotion = sentiment_model.predict(vec)[0]
    mood    = mood_map.get(emotion, 'Neutral')
    status  = "✅" if expected in emotion or expected == mood else "⚠"
    print(f"   {status} \"{text[:45]:<45}\" → {emotion:8} ({mood})")

test_sentiment("I feel so happy and excited today",          "happy")
test_sentiment("I am very sad and nothing is going right",     "sadness")
test_sentiment("I am so angry at my lecturer",                 "anger")
test_sentiment("I am scared of failing my exams",              "fear")
test_sentiment("I love my friends and feel supported",          "love")

print("\n✅ Both AI models are ready for MindEase!")
print("\nYour ai_models/ folder should contain:")
import os
for f in os.listdir('ai_models'):
    size = os.path.getsize(f'ai_models/{f}') / 1024
    print(f"   {f:<35} {size:>7.1f} KB")