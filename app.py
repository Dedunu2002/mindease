# app.py — MindEase Main Application


from flask import Flask, render_template, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_required, current_user
from flask_mail import Mail
from config import Config
import os

# ── Initialise Flask app ──────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)

# ── Initialise extensions ─────────────────────────────────────
db           = SQLAlchemy(app)
login_manager = LoginManager(app)
mail         = Mail(app)

# Redirect to login page if user tries to access a protected route
login_manager.login_view = 'login'

# ── Database Models (tables) — will be filled in on Day 6 ────
# Placeholder — you will add all 7 models here

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id       = db.Column(db.Integer, primary_key=True)
    name     = db.Column(db.String(100), nullable=False)
    email    = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role     = db.Column(db.String(20), default='student')   # student / counsellor / admin

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ── Routes ────────────────────────────────────────────────────

@app.route('/')
def home():
    return '<h1>MindEase is running! ✅</h1><p>Setup complete.</p>'

# ── Run the app ───────────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        db.create_all()   # Creates all database tables automatically
        print("✅ Database tables created successfully")
    app.run(debug=True)





# ── Add this to app.py near the top (after imports) ───────────

import joblib, numpy as np, re, json
from config import Config

# ── Load both AI models at Flask startup ──────────────────────
# Models are loaded ONCE into memory — fast predictions every time
risk_model      = joblib.load(Config.RISK_MODEL_PATH)
risk_encoder    = joblib.load(Config.RISK_ENCODER_PATH)
sentiment_model = joblib.load(Config.SENTIMENT_MODEL_PATH)
tfidf           = joblib.load(Config.TFIDF_PATH)

with open('ai_models/mood_map.json') as f:
    mood_map = json.load(f)

print("✅ AI Model 1 (Risk Classifier) loaded")
print("✅ AI Model 2 (Sentiment Analyser) loaded")


# ── Helper: predict risk from check-in form inputs ────────────
def predict_risk(sleep, study, social, anxiety, stress, depression, burnout):
    """
    Takes 7 numeric inputs from the check-in form.
    Returns: 'Good', 'Moderate', or 'Poor'
    """
    features = np.array([[
        float(sleep), float(study), float(social),
        float(anxiety), float(stress),
        float(depression), float(burnout)
    ]])
    num   = risk_model.predict(features)[0]
    label = risk_encoder.inverse_transform([num])[0]
    return label


# ── Helper: predict emotion from journal text ─────────────────
def predict_sentiment(text):
    """
    Takes a student's journal entry as a string.
    Returns: (emotion, mood_group)
      emotion    — one of: happy, sadness, anger, fear, love, surprise
      mood_group — one of: Positive, Negative, Cautious
    """
    clean   = re.sub(r'[^a-z\s]', '', str(text).lower()).strip()
    vec     = tfidf.transform([clean])
    emotion = sentiment_model.predict(vec)[0]
    mood    = mood_map.get(emotion, 'Neutral')
    return emotion, mood


# ── Usage examples (in your Flask routes on Day 9 & 14) ───────
#
# CHECK-IN ROUTE (Day 9):
# risk = predict_risk(
#     request.form['sleep_hours'],   request.form['study_hours'],
#     request.form['social_support'], request.form['anxiety_level'],
#     request.form['stress_level'],  request.form['depression_score'],
#     request.form['burnout_score']
# )
# → risk is 'Good', 'Moderate', or 'Poor'
#
# JOURNAL ROUTE (Day 14):
# emotion, mood = predict_sentiment(request.form['journal_text'])
# → emotion is 'happy', mood is 'Positive'






    # Add this to app.py on Day 9 (check-in form feature)
# Load models once at startup — not on every request

import joblib
import numpy as np
from flask import request, jsonify

# Load at app startup (put this near the top of app.py)
risk_model   = joblib.load('ai_models/mindease_risk_model_final.pkl')
risk_encoder = joblib.load('ai_models/mindease_risk_label_encoder.pkl')

# ── Prediction helper function ─────────────────────────────────
def predict_mental_health_risk(sleep, study, social,
                                 anxiety, stress, depression, burnout):
    """
    Predicts student mental health risk from check-in form inputs.
    Returns: 'Good', 'Moderate', or 'Poor'
    """
    features = np.array([[
        float(sleep),
        float(study),
        float(social),
        float(anxiety),
        float(stress),
        float(depression),
        float(burnout)
    ]])
    prediction_num   = risk_model.predict(features)[0]
    prediction_label = risk_encoder.inverse_transform([prediction_num])[0]
    return prediction_label   # returns 'Good', 'Moderate', or 'Poor'


# ── Example usage inside a Flask route (Day 9) ────────────────
# @app.route('/checkin', methods=['POST'])
# def checkin():
#     risk = predict_mental_health_risk(
#         sleep      = request.form['sleep_hours'],
#         study      = request.form['study_hours'],
#         social     = request.form['social_support'],
#         anxiety    = request.form['anxiety_level'],
#         stress     = request.form['stress_level'],
#         depression = request.form['depression_score'],
#         burnout    = request.form['burnout_score']
#     )
#     # risk is now 'Good', 'Moderate', or 'Poor'
#     # save to DB, display to student ...