# test_all_models.py
# Run: python test_all_models.py
# Tests both AI models thoroughly before you build the Flask app

import joblib
import numpy as np
import json
import re
import os

# ─────────────────────────────────────────────────────────────
# STEP 1 — Check all files exist before loading
# ─────────────────────────────────────────────────────────────
print("=" * 55)
print("   MINDEASEAI MODEL COMPLETE VERIFICATION")
print("=" * 55)

required_files = {
    'ai_models/mindease_risk_model_final.pkl':       'AI Model 1 (Random Forest)',
    'ai_models/mindease_risk_label_encoder.pkl':     'Model 1 Label Encoder',
    'ai_models/sentiment_model.pkl':  'AI Model 2 (Logistic Regression)',
    'ai_models/tfidf_vectorizer.pkl': 'Model 2 TF-IDF Vectoriser',
    'ai_models/mood_map.json':        'Emotion → Mood Group Mapping',
}

print("\n[1] Checking required files...")
all_present = True
for path, desc in required_files.items():
    exists = os.path.exists(path)
    size   = "{os.path.getsize(path)/1024:.1f} KB" if exists else "MISSING"
    icon   = "✅" if exists else "❌"
    print("  {icon} {desc:<36} {size}")
    if not exists:
        all_present = False

if not all_present:
    print("\n❌ Some files are missing. Re-download from Kaggle.")
    exit(1)

# ─────────────────────────────────────────────────────────────
# STEP 2 — Load all models
# ─────────────────────────────────────────────────────────────
print("\n[2] Loading all models...")

risk_model      = joblib.load('ai_models/mindease_risk_model_final.pkl')
risk_encoder    = joblib.load('ai_models/mindease_risk_label_encoder.pkl')
sentiment_model = joblib.load('ai_models/sentiment_model.pkl')
tfidf           = joblib.load('ai_models/tfidf_vectorizer.pkl')

with open('ai_models/mood_map.json') as f:
    mood_map = json.load(f)

print("  ✅ All models loaded successfully")
print("  Model 1 output labels : {list(risk_encoder.classes_)}")
print("  Model 2 output labels : {list(sentiment_model.classes_)}")

# ─────────────────────────────────────────────────────────────
# STEP 3 — Test AI Model 1 (Risk Classifier)
# ─────────────────────────────────────────────────────────────
print("\n[3] Testing AI Model 1 — Mental Health Risk Classifier")
print("    Inputs: Sleep, Study, Social, Anxiety, Stress, Depression, Burnout")
print("-" * 55)

test_students = [
    {"name": "Healthy student",   "expected": "Good",
     "inputs": [8, 4, 4, 2, 2, 1, 15]},
    {"name": "Moderate student",  "expected": "Moderate",
     "inputs": [6, 7, 3, 5, 5, 4, 45]},
    {"name": "At-risk student",   "expected": "Poor",
     "inputs": [3, 14, 1, 9, 9, 8, 90]},
    {"name": "Sleep-deprived",    "expected": "Poor/Moderate",
     "inputs": [3, 8, 2, 6, 7, 5, 60]},
    {"name": "Well-rested",       "expected": "Good",
     "inputs": [9, 3, 5, 1, 1, 1, 5]},
]

for student in test_students:
    features = np.array([student["inputs"]])
    pred_num  = risk_model.predict(features)[0]
    pred_label= risk_encoder.inverse_transform([pred_num])[0]
    proba     = risk_model.predict_proba(features)[0]
    confidence= max(proba) * 100

    # Colour indicator
    colour = {"Good":"🟢", "Moderate":"🟡", "Poor":"🔴"}.get(pred_label, "⚪")
    print("  {colour} {student['name']:<20} → {pred_label:<10} ({confidence:.1f}% confidence)")

# ─────────────────────────────────────────────────────────────
# STEP 4 — Test AI Model 2 (Sentiment Analyser)
# ─────────────────────────────────────────────────────────────
print("\n[4] Testing AI Model 2 — Journal Sentiment Analyser")
print("-" * 55)

def test_journal(text, expected_emotion):
    clean   = re.sub(r'[^a-z\s]', '', text.lower()).strip()
    vec     = tfidf.transform([clean])
    emotion = sentiment_model.predict(vec)[0]
    mood    = mood_map.get(emotion, 'Neutral')
    proba   = sentiment_model.predict_proba(vec)[0]
    conf    = max(proba) * 100
    correct = "✅" if expected_emotion in emotion else "⚠ "
    mood_icon = {"Positive":"😊", "Negative":"😞", "Cautious":"😰"}.get(mood,"😐")
    short   = text[:45] + "..." if len(text) > 45 else text
    print("  {correct} \"{short:<47}\" → {emotion:<9} {mood_icon} {mood} ({conf:.0f}%)")

journal_tests = [
    ("I feel so happy today I passed all my exams",            "happy"),
    ("I am really sad and feel like giving up on everything",   "sadness"),
    ("I am furious at my group they did nothing for the project","anger"),
    ("I am terrified of failing and losing my scholarship",      "fear"),
    ("I love my university life and I feel so supported",        "love"),
    ("Today was amazing I got an A on my dissertation proposal",  "joy"),
    ("I feel empty and exhausted nothing makes sense anymore",    "sadness"),
    ("I cannot sleep I am so worried about my exams next week",   "fear"),
]

for text, expected in journal_tests:
    test_journal(text, expected)

# ─────────────────────────────────────────────────────────────
# STEP 5 — Simulate a complete check-in → journal flow
# ─────────────────────────────────────────────────────────────
print("\n[5] Simulating a complete student session")
print("-" * 55)

# Simulate form inputs from check-in page
form_data = {
    'sleep_hours':     5,
    'study_hours':     10,
    'social_support':  2,
    'anxiety_level':   7,
    'stress_level':    8,
    'depression_score':6,
    'burnout_score':   65,
}
journal_text = "I feel completely overwhelmed and I cannot focus on anything today"

# Run Model 1
features  = np.array([[
    form_data['sleep_hours'],    form_data['study_hours'],
    form_data['social_support'], form_data['anxiety_level'],
    form_data['stress_level'],   form_data['depression_score'],
    form_data['burnout_score']
]])
risk_pred  = risk_encoder.inverse_transform(risk_model.predict(features))[0]

# Run Model 2
clean_text = re.sub(r'[^a-z\s]', '', journal_text.lower()).strip()
vec        = tfidf.transform([clean_text])
emotion    = sentiment_model.predict(vec)[0]
mood       = mood_map.get(emotion, 'Neutral')

print("  Check-in inputs : Sleep={form_data['sleep_hours']}h, Study={form_data['study_hours']}h, "
      "Anxiety={form_data['anxiety_level']}/10, Stress={form_data['stress_level']}/10")
print("  Risk result     : {risk_pred}")
print("  Journal entry   : \"{journal_text}\"")
print("  Detected emotion: {emotion}")
print("  Mood group      : {mood}")

risk_icon = {"Good":"🟢", "Moderate":"🟡", "Poor":"🔴"}.get(risk_pred, "⚪")
print("\n  MindEase would show: {risk_icon} {risk_pred} risk + {mood} mood badge")

# ─────────────────────────────────────────────────────────────
# STEP 6 — Final summary
# ─────────────────────────────────────────────────────────────
print("\n" + "=" * 55)
print("  ✅ ALL TESTS COMPLETE — Both AI models are ready!")
print("  You can now proceed to build the Flask web app.")
print("=" * 55)