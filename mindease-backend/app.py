# This file handles: database models, AI loading, and all API routes

from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
from config import Config
from google import genai
from datetime import datetime, date, timedelta
import joblib
import numpy as np
import pandas as pd
import re
import json
import bcrypt

from functools import wraps
# ── Initialise app ────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)

# ── CORS — allows React (port 3000) to call Flask (port 5000) ─
# Without this, the browser blocks requests between the two servers
CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:3000",
        "http://localhost:3001"
    ]
)
# ── Extensions ────────────────────────────────────────────────
db   = SQLAlchemy(app)
mail = Mail(app)

# ── Load AI models at startup ─────────────────────────────────

# AI Model 1 — Mental Health Risk Classifier
risk_model = joblib.load(Config.RISK_MODEL_PATH)
risk_encoder = joblib.load(Config.RISK_ENCODER_PATH)
risk_feature_encoders = joblib.load(
    Config.RISK_FEATURE_ENCODERS_PATH
)

with open(Config.RISK_FEATURES_PATH, "r") as f:
    risk_features = json.load(f)


# AI Model 2 — Journal Sentiment Analyzer
sentiment_model = joblib.load(Config.SENTIMENT_MODEL_PATH)
tfidf = joblib.load(Config.TFIDF_PATH)

with open(Config.MOOD_MAP_PATH, "r") as f:
    mood_map = json.load(f)


# ════════════════════════════════════════════════════════════
# AI MODEL 3 — MindBot Gemini
# ════════════════════════════════════════════════════════════

if not Config.GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured. "
        "Add it to the backend .env file."
    )

gemini_client = genai.Client(
    api_key=Config.GEMINI_API_KEY
)

GEMINI_MODEL = "gemini-3.6-flash"

print("✅ AI Model 3 — MindBot Gemini configured")   

MINDBOT_SYSTEM_PROMPT = """
You are MindBot, a compassionate and supportive mental wellness
assistant for university students in Sri Lanka.

Your role is to:

- Listen empathetically to students who feel stressed, anxious,
  overwhelmed, lonely or burned out.
- Provide practical, evidence-informed wellness suggestions such as
  breathing exercises, grounding techniques, study planning,
  time-management strategies and sleep-hygiene advice.
- Encourage students to contact their university counsellor when
  professional support would be useful.
- Respond in a warm, friendly, respectful and non-judgmental tone.
- Use simple language suitable for university students.
- Keep normal responses concise, usually 2 to 4 short paragraphs.

You must NEVER:

- Diagnose a mental health condition.
- Claim to replace a counsellor, psychologist, doctor or therapist.
- Recommend prescription medication.
- Shame, dismiss or minimise the student's feelings.
- Pretend to be a human counsellor.

If a student expresses suicidal thoughts or thoughts of self-harm:

- Respond with compassion.
- Encourage immediate real-world support.
- Provide the Sri Lankan Crisis Support Line: 1333.
- Encourage them to contact their university counsellor or a trusted
  person immediately.
- If they are in immediate danger, encourage emergency assistance.
- Do not continue with a long normal conversation.

For normal conversations, finish with one brief practical suggestion
the student can try right now.
"""

CRISIS_KEYWORDS = [
    'kill myself',
    'kill me',
    'end my life',
    'want to die',
    'wish i was dead',
    'suicide',
    'suicidal',
    'self harm',
    'self-harm',
    'hurt myself',
    'harm myself',
    'not worth living',
    'no reason to live',
]


print("✅ AI Model 1 loaded")
print("✅ AI Model 2 loaded")
print("✅ Risk feature encoders loaded")
print("✅ Risk feature list loaded")

# ════════════════════════════════════════════════════════════
# DATABASE MODELS — all 7 tables
# Each class = one table in MySQL
# ════════════════════════════════════════════════════════════

# ── Table 1: User ─────────────────────────────────────────────
# Stores all registered accounts (students, counsellors, admins)
class User(db.Model):
    __tablename__ = 'users'

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(150), unique=True, nullable=False)
    password   = db.Column(db.String(255), nullable=False)
    role       = db.Column(db.String(20),  default='student')
    # role can be: 'student', 'counsellor', 'admin'
    is_approved = db.Column(db.Boolean, default=True)
    # counsellors need admin approval — set to False until approved
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary so Flask can send as JSON to React"""
        return {
            'id':         self.id,
            'name':       self.name,
            'email':      self.email,
            'role':       self.role,
            'is_approved':self.is_approved,
            'created_at': self.created_at.isoformat()
        }


# ── Table 2: CheckIn ──────────────────────────────────────────
# Stores each daily mental health check-in submission
class CheckIn(db.Model):
    __tablename__ = 'checkins'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )

    # ── AI Model 1 features ───────────────────────────────

    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(30), nullable=False)
    academic_year = db.Column(db.Integer, nullable=False)

    study_hours_per_day = db.Column(db.Float, nullable=False)
    exam_pressure = db.Column(db.Float, nullable=False)
    academic_performance = db.Column(db.Float, nullable=False)
    stress_level = db.Column(db.Float, nullable=False)
    sleep_hours = db.Column(db.Float, nullable=False)
    physical_activity = db.Column(db.Float, nullable=False)
    social_support = db.Column(db.Float, nullable=False)
    screen_time = db.Column(db.Float, nullable=False)
    internet_usage = db.Column(db.Float, nullable=False)
    financial_stress = db.Column(db.Float, nullable=False)
    family_expectation = db.Column(db.Float, nullable=False)

    # ── Prediction result ─────────────────────────────────

    risk_result = db.Column(
        db.String(20),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    checkin_date = db.Column(
        db.Date,
        default=date.today
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,

            'age': self.age,
            'gender': self.gender,
            'academic_year': self.academic_year,
            'study_hours_per_day': self.study_hours_per_day,
            'exam_pressure': self.exam_pressure,
            'academic_performance': self.academic_performance,
            'stress_level': self.stress_level,
            'sleep_hours': self.sleep_hours,
            'physical_activity': self.physical_activity,
            'social_support': self.social_support,
            'screen_time': self.screen_time,
            'internet_usage': self.internet_usage,
            'financial_stress': self.financial_stress,
            'family_expectation': self.family_expectation,

            'risk_result': self.risk_result,

            'created_at': (
                self.created_at.isoformat()
                if self.created_at else None
            ),

            'checkin_date': (
                self.checkin_date.isoformat()
                if self.checkin_date else None
            )
        }

# ── Table 3: Journal ──────────────────────────────────────────
# Stores each daily journal entry with AI sentiment result
class Journal(db.Model):
    __tablename__ = 'journals'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content      = db.Column(db.Text, nullable=False)
    # AI Model 2 results
    emotion      = db.Column(db.String(30))
    # emotion: 'joy', 'sadness', 'anger', 'fear', 'love', 'surprise'
    mood_group   = db.Column(db.String(20))
    # mood_group: 'Positive', 'Negative', 'Cautious'
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'content':    self.content,
            'emotion':    self.emotion,
            'mood_group': self.mood_group,
            'date':       self.created_at.isoformat()
        }


# ── Table 4: Streak ───────────────────────────────────────────
# Tracks each student's consecutive daily check-in streak
class Streak(db.Model):
    __tablename__ = 'streaks'

    id                = db.Column(db.Integer, primary_key=True)
    user_id           = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True)
    # unique=True means one row per student
    current_streak    = db.Column(db.Integer, default=0)
    longest_streak    = db.Column(db.Integer, default=0)
    last_checkin_date = db.Column(db.Date)
    badges            = db.Column(db.Text, default='[]')
    # badges stored as JSON string: '["Week Warrior", "Monthly Master"]'

    def to_dict(self):
        return {
            'current_streak': self.current_streak,
            'longest_streak': self.longest_streak,
            'badges':         json.loads(self.badges or '[]')
        }


# ── Table 5: Appointment ──────────────────────────────────────
# Stores counsellor appointment bookings
class Appointment(db.Model):
    __tablename__ = 'appointments'

    id             = db.Column(db.Integer, primary_key=True)
    student_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    counsellor_id  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    requested_date = db.Column(db.Date, nullable=False)
    time_slot      = db.Column(db.String(20), nullable=False)
    # time_slot: '09:00', '10:00', '11:00', etc.
    status         = db.Column(db.String(20), default='pending')
    # status: 'pending', 'confirmed', 'rejected', 'completed'
    notes          = db.Column(db.Text)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        student    = User.query.get(self.student_id)
        counsellor = User.query.get(self.counsellor_id)
        return {
            'id':            self.id,
            'student_name':  student.name if student else 'Unknown',
            'counsellor_name':counsellor.name if counsellor else 'Unknown',
            'date':          self.requested_date.isoformat(),
            'time_slot':     self.time_slot,
            'status':        self.status,
        }


# ── Table 6: Goal ─────────────────────────────────────────────
# Stores weekly wellness goals set by students
class Goal(db.Model):
    __tablename__ = 'goals'

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    goal_text       = db.Column(db.Text, nullable=False)
    week_start_date = db.Column(db.Date, nullable=False)
    status          = db.Column(db.String(20), default='pending')
    # status: 'pending', 'achieved', 'not_achieved'
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':        self.id,
            'goal_text': self.goal_text,
            'week_start':self.week_start_date.isoformat(),
            'status':    self.status,
        }


# ── Table 7: CommunityPost ────────────────────────────────────
# Stores anonymous community board posts
class CommunityPost(db.Model):
    __tablename__ = 'community_posts'

    id         = db.Column(db.Integer, primary_key=True)
    content    = db.Column(db.Text, nullable=False)
    reactions  = db.Column(db.Text, default='{"heart":0,"star":0,"hug":0}')
    # reactions stored as JSON: {"heart": 5, "star": 2, "hug": 8}
    is_flagged = db.Column(db.Boolean, default=False)
    # counsellors can flag inappropriate posts for removal
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # NO user_id — fully anonymous by design

    def to_dict(self):
        return {
            'id':        self.id,
            'content':   self.content,
            'reactions': json.loads(self.reactions),
            'is_flagged':self.is_flagged,
            'created_at':self.created_at.isoformat()
        }

# ── Add Resource model to the database models section ─────────
class Resource(db.Model):
    __tablename__ = 'resources'

    id          = db.Column(db.Integer, primary_key=True)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category    = db.Column(db.String(50), nullable=False)
    # category: 'Anxiety', 'Sleep', 'Stress', 'Motivation', 'Loneliness'
    content     = db.Column(db.Text)       # longer article text
    url         = db.Column(db.String(300)) # optional external link
    icon        = db.Column(db.String(10), default='📄')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'title':       self.title,
            'description': self.description,
            'category':    self.category,
            'content':     self.content,
            'url':         self.url,
            'icon':        self.icon,
        }



# ════════════════════════════════════════════════════════════
# AI HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════

# ── AI Model 1: Mental Health Risk Prediction ────────────────

def predict_risk(form_data):
    """
    Predict mental-health risk using the exact 14 features
    used when training the saved Risk Model.
    """

    # Create one row in the exact feature order
    row = {
        feature: form_data.get(feature)
        for feature in risk_features
    }

    df = pd.DataFrame([row])

    # Apply the SAME encoders used during model training
    for column, encoder in risk_feature_encoders.items():

        if column in df.columns:

            value = str(df.at[0, column])

            if value in encoder.classes_:
                df[column] = encoder.transform([value])
            else:
                # Unknown categorical value
                df[column] = 0

    # Make prediction
    prediction_number = risk_model.predict(df)[0]

    # Convert numeric prediction to label
    prediction_label = risk_encoder.inverse_transform(
        [prediction_number]
    )[0]

    return prediction_label

def predict_sentiment(text):
    clean   = re.sub(r'[^a-z\s]', '', str(text).lower()).strip()
    vec     = tfidf.transform([clean])
    emotion = sentiment_model.predict(vec)[0]
    mood    = mood_map.get(emotion, 'Neutral')
    return emotion, mood   # ('joy', 'Positive')


# ════════════════════════════════════════════════════════════
# STARTER ROUTE — test Flask is running
# ════════════════════════════════════════════════════════════

@app.route('/api/health')
def health():
    return jsonify({
        'status':  'MindEase Flask API is running ✅',
        'models':  'AI Model 1 and 2 loaded',
        'version': '1.0.0'
    })

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated

# ── Check-In API ─────────────────────────────────────────────

@app.route('/api/checkin', methods=['POST'])
@login_required
def checkin():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'error': 'No check-in data received'
            }), 400

        # ----------------------------------------------------
        # Required AI model features
        # ----------------------------------------------------

        required_features = [
            'age',
            'gender',
            'academic_year',
            'study_hours_per_day',
            'exam_pressure',
            'academic_performance',
            'stress_level',
            'sleep_hours',
            'physical_activity',
            'social_support',
            'screen_time',
            'internet_usage',
            'financial_stress',
            'family_expectation'
        ]

        # Check that every required feature was submitted
        missing_features = [
            feature
            for feature in required_features
            if feature not in data
        ]

        if missing_features:
            return jsonify({
                'error': 'Missing required fields',
                'missing_fields': missing_features
            }), 400

        # ----------------------------------------------------
        # Convert values to the correct types
        # ----------------------------------------------------

        checkin_data = {
            'age': int(data['age']),
            'gender': str(data['gender']).strip(),
            'academic_year': int(data['academic_year']),

            'study_hours_per_day': float(
                data['study_hours_per_day']
            ),

            'exam_pressure': float(
                data['exam_pressure']
            ),

            'academic_performance': float(
                data['academic_performance']
            ),

            'stress_level': float(
                data['stress_level']
            ),

            'sleep_hours': float(
                data['sleep_hours']
            ),

            'physical_activity': float(
                data['physical_activity']
            ),

            'social_support': float(
                data['social_support']
            ),

            'screen_time': float(
                data['screen_time']
            ),

            'internet_usage': float(
                data['internet_usage']
            ),

            'financial_stress': float(
                data['financial_stress']
            ),

            'family_expectation': float(
                data['family_expectation']
            )
        }

        # ----------------------------------------------------
        # AI MODEL 1 — Predict mental health risk
        # ----------------------------------------------------

        risk_result = predict_risk(checkin_data)

        # ----------------------------------------------------
        # Save check-in to database
        # ----------------------------------------------------

        new_checkin = CheckIn(
            user_id=session['user_id'],

            age=checkin_data['age'],
            gender=checkin_data['gender'],
            academic_year=checkin_data['academic_year'],

            study_hours_per_day=
                checkin_data['study_hours_per_day'],

            exam_pressure=
                checkin_data['exam_pressure'],

            academic_performance=
                checkin_data['academic_performance'],

            stress_level=
                checkin_data['stress_level'],

            sleep_hours=
                checkin_data['sleep_hours'],

            physical_activity=
                checkin_data['physical_activity'],

            social_support=
                checkin_data['social_support'],

            screen_time=
                checkin_data['screen_time'],

            internet_usage=
                checkin_data['internet_usage'],

            financial_stress=
                checkin_data['financial_stress'],

            family_expectation=
                checkin_data['family_expectation'],

            risk_result=risk_result
        )

        db.session.add(new_checkin)
        db.session.commit()

        # ----------------------------------------------------
        # UPDATE WELLNESS STREAK
        # ----------------------------------------------------

        user_id = session['user_id']

        streak = Streak.query.filter_by(
            user_id=user_id
        ).first()

        if not streak:
            streak = Streak(
                user_id=user_id,
                current_streak=1,
                longest_streak=1,
                last_checkin_date=new_checkin.checkin_date,
                badges='[]'
            )

            db.session.add(streak)

        else:
            today = new_checkin.checkin_date
            last_date = streak.last_checkin_date

            if last_date == today:
                # Already checked in today
                pass

            elif last_date == today - timedelta(days=1):
                # Consecutive day
                streak.current_streak += 1
                streak.last_checkin_date = today

                if streak.current_streak > streak.longest_streak:
                    streak.longest_streak = streak.current_streak

            else:
                # Streak broken
                streak.current_streak = 1
                streak.last_checkin_date = today

        db.session.commit()

        # ----------------------------------------------------
        # RETURN RESULT TO REACT
        # ----------------------------------------------------

        return jsonify({
            'message': 'Check-in submitted successfully',
            'risk_result': risk_result,
            'checkin': new_checkin.to_dict()
        }), 201

    except ValueError as e:

        db.session.rollback()

        return jsonify({
            'error': 'Invalid input value',
            'details': str(e)
        }), 400

    except Exception as e:

        db.session.rollback()

        print('❌ Check-in error:', e)

        return jsonify({
            'error': 'Failed to process check-in',
            'details': str(e)
        }), 500
 
        # ----------------------------------------------------
        # Return result to React
        # ----------------------------------------------------

        return jsonify({
            'message': 'Check-in submitted successfully',
            'risk_result': risk_result,
            'checkin': new_checkin.to_dict()
        }), 201

    except ValueError as e:

        db.session.rollback()

        return jsonify({
            'error': 'Invalid input value',
            'details': str(e)
        }), 400

    except Exception as e:

        db.session.rollback()

        print('❌ Check-in error:', e)

        return jsonify({
            'error': 'Failed to process check-in',
            'details': str(e)
        }), 500

    # ── Student Check-In History ────────────────────────────────

@app.route('/api/checkins/history', methods=['GET'])
@login_required
def checkin_history():
    try:
        user_id = session['user_id']

        checkins = (
            CheckIn.query
            .filter_by(user_id=user_id)
            .order_by(CheckIn.checkin_date.desc(), CheckIn.id.desc())
            .all()
        )

        history = []

        for item in checkins:
            history.append({
                'id': item.id,
                'user_id': item.user_id,
                'date': (
                    item.checkin_date.isoformat()
                    if item.checkin_date else None
                ),
                'created_at': (
                    item.created_at.isoformat()
                    if item.created_at else None
                ),

                # AI result
                'risk_result': item.risk_result,

                # Wellbeing indicators
                'stress_level': item.stress_level,
                'sleep_hours': item.sleep_hours,
                'physical_activity': item.physical_activity,
                'social_support': item.social_support,

                # Other useful dashboard data
                'study_hours_per_day': item.study_hours_per_day,
                'exam_pressure': item.exam_pressure,
                'academic_performance': item.academic_performance,
                'screen_time': item.screen_time,
                'internet_usage': item.internet_usage,
                'financial_stress': item.financial_stress,
                'family_expectation': item.family_expectation
            })

        return jsonify({
            'success': True,
            'count': len(history),
            'checkins': history
        }), 200

    except Exception as e:
        print('❌ Check-in history error:', e)

        return jsonify({
            'success': False,
            'error': 'Failed to load check-in history',
            'details': str(e)
        }), 500

    # ── Latest Student Check-In ───────────────────────────────────

@app.route('/api/checkins/latest', methods=['GET'])
@login_required
def latest_checkin():
    try:
        user_id = session['user_id']

        latest = (
            CheckIn.query
            .filter_by(user_id=user_id)
            .order_by(
                CheckIn.checkin_date.desc(),
                CheckIn.id.desc()
            )
            .first()
        )

        if not latest:
            return jsonify({
                'success': True,
                'checkin': None
            }), 200

        return jsonify({
            'success': True,
            'checkin': latest.to_dict()
        }), 200

    except Exception as e:
        print('❌ Latest check-in error:', e)

        return jsonify({
            'success': False,
            'error': 'Failed to load latest check-in',
            'details': str(e)
        }), 500


# ── Student Wellness Streak ───────────────────────────────────

@app.route('/api/streak', methods=['GET'])
@login_required
def get_streak():
    try:
        user_id = session['user_id']

        # ----------------------------------------------------
        # GET STUDENT CHECK-INS
        # ----------------------------------------------------

        checkins = (
            CheckIn.query
            .filter_by(user_id=user_id)
            .order_by(CheckIn.checkin_date.asc())
            .all()
        )

        checkin_count = len(checkins)

        # ----------------------------------------------------
        # GET / CREATE STREAK RECORD
        # ----------------------------------------------------

        streak = Streak.query.filter_by(
            user_id=user_id
        ).first()

        if not streak:
            streak = Streak(
                user_id=user_id,
                current_streak=0,
                longest_streak=0,
                badges='[]'
            )

            db.session.add(streak)

        # ----------------------------------------------------
        # CALCULATE CURRENT STREAK
        # ----------------------------------------------------

        current_streak = 0
        longest_streak = 0

        if checkins:

            dates = sorted(
                set(
                    item.checkin_date
                    for item in checkins
                    if item.checkin_date
                )
            )

            if dates:

                # Calculate longest streak
                temp_streak = 1
                longest_streak = 1

                for i in range(1, len(dates)):

                    difference = (
                        dates[i] - dates[i - 1]
                    ).days

                    if difference == 1:
                        temp_streak += 1
                    else:
                        temp_streak = 1

                    if temp_streak > longest_streak:
                        longest_streak = temp_streak

                # Calculate current streak
                current_streak = 1

                for i in range(len(dates) - 1, 0, -1):

                    difference = (
                        dates[i] - dates[i - 1]
                    ).days

                    if difference == 1:
                        current_streak += 1
                    else:
                        break

        # ----------------------------------------------------
        # CALCULATE BADGES
        # ----------------------------------------------------

        badges = []

        # 🌱 First Step
        if checkin_count >= 1:
            badges.append({
                'id': 'first_step',
                'name': 'First Step',
                'icon': '🌱',
                'description': 'Completed your first wellbeing check-in'
            })

        # 💛 Wellness Explorer
        if checkin_count >= 5:
            badges.append({
                'id': 'wellness_explorer',
                'name': 'Wellness Explorer',
                'icon': '💛',
                'description': 'Completed 5 wellbeing check-ins'
            })

        # 🔥 3-Day Streak
        if longest_streak >= 3:
            badges.append({
                'id': 'three_day_streak',
                'name': '3-Day Streak',
                'icon': '🔥',
                'description': 'Completed check-ins for 3 consecutive days'
            })

        # 🌸 7-Day Streak
        if longest_streak >= 7:
            badges.append({
                'id': 'seven_day_streak',
                'name': '7-Day Streak',
                'icon': '🌸',
                'description': 'Completed check-ins for 7 consecutive days'
            })

        # 📖 Reflective Mind
        journal_count = Journal.query.filter_by(
            user_id=user_id
        ).count()

        if journal_count >= 3:
            badges.append({
                'id': 'reflective_mind',
                'name': 'Reflective Mind',
                'icon': '📖',
                'description': 'Completed 3 journal entries'
            })

        # 🏆 Wellness Champion
        if checkin_count >= 10:
            badges.append({
                'id': 'wellness_champion',
                'name': 'Wellness Champion',
                'icon': '🏆',
                'description': 'Completed 10 wellbeing check-ins'
            })

        # ----------------------------------------------------
        # SAVE STREAK + BADGES
        # ----------------------------------------------------

        streak.current_streak = current_streak
        streak.longest_streak = longest_streak
        streak.badges = json.dumps(badges)

        if checkins:
            streak.last_checkin_date = checkins[-1].checkin_date

        db.session.commit()

        # ----------------------------------------------------
        # RETURN RESULT
        # ----------------------------------------------------

        return jsonify({
            'success': True,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'badges': badges,
            'checkin_count': checkin_count,
            'journal_count': journal_count,
            'total_badges': 6
        }), 200

    except Exception as e:

        db.session.rollback()

        print('❌ Streak error:', e)

        return jsonify({
            'success': False,
            'error': 'Failed to calculate streak',
            'details': str(e)
        }), 500
    
# Add to app.py after the check-in routes

@app.route('/api/journal', methods=['POST'])
@login_required
def save_journal():
    user_id = session['user_id']
    data    = request.get_json()
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': 'Journal entry cannot be empty'}), 400

    if len(content) < 10:
        return jsonify({'error': 'Please write at least a sentence'}), 400

    # ── Run AI Model 2 — NO API, fully local ──────────────────────
    # predict_sentiment() is defined in app.py from Day 6
    # It calls tfidf.transform() then sentiment_model.predict()
    emotion, mood_group = predict_sentiment(content)

    # ── Save to Journal table ─────────────────────────────────────
    entry = Journal(
        user_id    = user_id,
        content    = content,
        emotion    = emotion,
        mood_group = mood_group,
    )
    db.session.add(entry)
    db.session.commit()

    # Build a friendly response message based on detected emotion
    messages = {
        'joy':      'Great to hear you are feeling joyful today! 😊',
        'love':     'Feeling loved and connected is wonderful 💚',
        'surprise': 'Something surprised you today — interesting! 🤔',
        'fear':     'It sounds like something is worrying you. Try a breathing exercise. 🌿',
        'sadness':  'I hear that you are feeling down. Consider talking to someone. 💙',
        'anger':    'Feeling frustrated is valid. Take a moment to breathe. 💨',
    }
    message = messages.get(emotion, 'Thank you for journalling today.')

    return jsonify({
        'id':         entry.id,
        'emotion':    emotion,
        'mood_group': mood_group,
        'message':    message,
    }), 201

@app.route('/api/journals')
@login_required
def get_journals():
    user_id  = session['user_id']
    page     = request.args.get('page', 1, type=int)
    per_page = 10

    journals = (Journal.query
                .filter_by(user_id=user_id)
                .order_by(Journal.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all())

    total = Journal.query.filter_by(user_id=user_id).count()

    return jsonify({
        'entries':    [j.to_dict() for j in journals],
        'total':      total,
        'page':       page,
        'has_more':   (page * per_page) < total,
    }), 200


@app.route('/api/sentiment-data')
@login_required
def sentiment_data():
    user_id = session['user_id']
    from datetime import datetime, timedelta

    # Get last 7 days of journal entries
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    entries = (Journal.query
               .filter(Journal.user_id == user_id,
                       Journal.created_at >= seven_days_ago)
               .order_by(Journal.created_at.asc())
               .all())

    if not entries:
        return jsonify([]), 200

    # Group by date and return one entry per day
    # (last entry of each day wins if multiple exist)
    by_date = {}
    for e in entries:
        d = e.created_at.strftime('%Y-%m-%d')
        by_date[d] = {
            'date':       d,
            'emotion':    e.emotion,
            'mood_group': e.mood_group,
        }

    return jsonify(list(by_date.values())), 200


# Also add DELETE so student can remove an entry
@app.route('/api/journal/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_journal(entry_id):
    user_id = session['user_id']
    entry   = Journal.query.filter_by(id=entry_id, user_id=user_id).first()
    if not entry:
        return jsonify({'error': 'Entry not found'}), 404
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Entry deleted'}), 200


# Add to app.py after existing journal routes

@app.route('/api/sentiment-weekly')
@login_required
def sentiment_weekly():
    user_id = session['user_id']
    from datetime import datetime, timedelta

    # Get last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    entries = (Journal.query
               .filter(Journal.user_id == user_id,
                       Journal.created_at >= seven_days_ago)
               .order_by(Journal.created_at.asc())
               .all())

    if not entries:
        return jsonify({'entries': [], 'summary': {}}), 200

    # One entry per day — last journal of each day
    by_date = {}
    for e in entries:
        d = e.created_at.strftime('%Y-%m-%d')
        by_date[d] = {
            'date':       d,
            'emotion':    e.emotion,
            'mood_group': e.mood_group,
        }

    daily = list(by_date.values())

    # Count mood groups for summary
    counts = {'Positive': 0, 'Cautious': 0, 'Negative': 0}
    for d in daily:
        mg = d.get('mood_group', 'Positive')
        if mg in counts:
            counts[mg] += 1

    # Dominant mood this week
    dominant = max(counts, key=counts.get) if any(counts.values()) else 'Positive'

    # Wellness tip based on dominant mood
    tips = {
        'Positive': 'You have had a great week emotionally! Keep nurturing your positive habits and social connections.',
        'Cautious': 'Some anxiety detected this week. Try the 5-4-3-2-1 grounding exercise in the Wellness section.',
        'Negative': 'It has been a tough week. Please consider booking a counsellor appointment or talking to MindBot.',
    }

    return jsonify({
        'entries':  daily,
        'summary': {
            'counts':   counts,
            'dominant': dominant,
            'tip':      tips[dominant],
            'total':    len(daily),
        }
    }), 200

# ════════════════════════════════════════════════════════════
# MINDBOT — AI MODEL 3
# ════════════════════════════════════════════════════════════

@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    data = request.get_json() or {}
    message = data.get('message', '').strip()

    if not message:
        return jsonify({
            'error': 'Message cannot be empty'
        }), 400

    # ── Crisis detection ────────────────────────────────────
    msg_lower = message.lower()

    if any(keyword in msg_lower for keyword in CRISIS_KEYWORDS):

        crisis_response = (
            "I can hear that you are going through a very "
            "difficult moment, and I am glad you reached out.\n\n"
            "🆘 Sri Lanka Crisis Support Line: 1333\n\n"
            "Please contact someone you trust or your university "
            "counsellor right now. If you are in immediate danger, "
            "please seek emergency help in person immediately."
        )

        return jsonify({
            'reply': crisis_response,
            'is_crisis': True
        }), 200

    # ── Initialise chat history ─────────────────────────────
    if 'chat_history' not in session:
        session['chat_history'] = []

    history = session['chat_history']

    # Keep only the most recent 10 messages
    recent_history = history[-10:]

    # ── Build conversation ──────────────────────────────────
    conversation = MINDBOT_SYSTEM_PROMPT + "\n\n"

    for turn in recent_history:

        role = (
            "Student"
            if turn['role'] == 'user'
            else 'MindBot'
        )

        conversation += (
            f"{role}: {turn['content']}\n"
        )

    conversation += (
        f"Student: {message}\n"
        "MindBot:"
    )

    try:

        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=conversation
        )

        bot_reply = (
            response.text.strip()
            if response.text
            else "I'm sorry, I couldn't generate a response right now."
        )

    except Exception as e:

        print("❌ Gemini API error:", e)

        bot_reply = (
            "I'm temporarily having trouble connecting to my AI service. "
            "Please try again in a moment. If you need immediate "
            "support, please contact the Sri Lankan Crisis Support "
            "Line at 1333 or your university counsellor."
        )

    # ── Save conversation ───────────────────────────────────
    history.append({
        'role': 'user',
        'content': message
    })

    history.append({
        'role': 'assistant',
        'content': bot_reply
    })

    # Keep session reasonably small
    session['chat_history'] = history[-20:]
    session.modified = True

    return jsonify({
        'reply': bot_reply,
        'is_crisis': False
    }), 200

@app.route('/api/chat/clear', methods=['POST'])
@login_required
def clear_chat():

    session.pop('chat_history', None)

    return jsonify({
        'message': 'Chat history cleared'
    }), 200

# Add to app.py after the chat routes

@app.route('/api/sos', methods=['POST'])
@login_required
def sos_alert():
    """
    Sends an anonymous SOS alert email to all approved counsellors.
    The student's identity is NEVER included in the email.
    Only a timestamp and alert message are sent.
    """
    # ── Find all approved counsellors ─────────────────────────────
    counsellors = User.query.filter_by(
        role='counsellor',
        is_approved=True
    ).all()

    if not counsellors:
        # No counsellors registered yet — still return success
        # so the student sees the modal and gets the hotline number
        return jsonify({
            'message': 'Alert noted. Please call 1926 for immediate support.',
            'sent_to': 0
        }), 200

    # ── Build the alert email ─────────────────────────────────────
    now        = datetime.now().strftime('%d %B %Y at %H:%M')
    subject    = f'🆘 MindEase SOS Alert — Anonymous Student Needs Support'

    email_body = f"""
Dear Counsellor,

This is an automated anonymous alert from the MindEase student wellbeing system.

A student has pressed the SOS button and may need immediate support.

Alert time: {now}

IMPORTANT:
- The student's identity has NOT been shared to protect their privacy.
- Please be available for walk-in students who may approach you today.
- If you are able to, please check in with students in common areas.

Immediate crisis resources for students:
- Sumithrayo Sri Lanka: 1926 (24/7 crisis helpline)
- University counselling office (please make yourself available)

This alert was generated automatically by MindEase.
Do not reply to this email.

— MindEase Student Wellbeing System
"""

    # ── Send one email per counsellor ────────────────────────────
    sent_count = 0
    errors     = []

    for counsellor in counsellors:
        try:
            msg = Message(
                subject    = subject,
                recipients = [counsellor.email],
                body       = email_body,
            )
            mail.send(msg)
            sent_count += 1
        except Exception as e:
            errors.append(str(e))
            print(f"Mail error to {counsellor.email}: {e}")

    # ── Always return success to the student ─────────────────────
    # Even if email fails, student still sees the hotline number
    return jsonify({
        'message': 'Alert sent. Please call 1926 if you need immediate help.',
        'sent_to': sent_count,
    }), 200


# ── Test email route — confirm Flask-Mail works ────────────────
# Visit http://localhost:5000/api/test-email in the browser
# Remove this route before final submission
@app.route('/api/test-email')
def test_email():
    try:
        msg = Message(
            subject    = 'MindEase — Email Test ✅',
            recipients = [Config.MAIL_USERNAME],
            body       = 'Flask-Mail is working correctly. SOS alerts are ready.'
        )
        mail.send(msg)
        return jsonify({'status': '✅ Test email sent! Check your Gmail inbox.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add to app.py after SOS routes

@app.route('/api/counsellors')
@login_required
def get_counsellors():
    """Returns all approved counsellors for the booking dropdown"""
    counsellors = User.query.filter_by(
        role='counsellor',
        is_approved=True
    ).all()

    return jsonify([{
        'id':   c.id,
        'name': c.name,
    } for c in counsellors]), 200

@app.route('/api/slots')
@login_required
def get_slots():
    """
    Returns available time slots for a counsellor on a specific date.
    Removes any slots already booked (status != rejected).
    Query params: counsellor_id, date (YYYY-MM-DD)
    """
    counsellor_id = request.args.get('counsellor_id', type=int)
    date_str      = request.args.get('date', '')

    if not counsellor_id or not date_str:
        return jsonify({'error': 'counsellor_id and date are required'}), 400

    try:
        from datetime import date as date_type
        appt_date = date_type.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Don't allow booking in the past
    if appt_date < date_type.today():
        return jsonify({'error': 'Cannot book a past date'}), 400

    # All possible time slots
    ALL_SLOTS = [
        '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30',
    ]

    # Find already-booked slots for this counsellor on this date
    # Rejected appointments free up the slot again
    booked = Appointment.query.filter(
        Appointment.counsellor_id  == counsellor_id,
        Appointment.requested_date == appt_date,
        Appointment.status.in_(['pending', 'confirmed'])
    ).all()

    booked_slots = {a.time_slot for a in booked}
    available    = [s for s in ALL_SLOTS if s not in booked_slots]

    return jsonify({
        'date':      date_str,
        'available': available,
        'booked':    list(booked_slots),
    }), 200

@app.route('/api/book', methods=['POST'])
@login_required
def book_appointment():
    student_id = session['user_id']
    data       = request.get_json()

    counsellor_id = data.get('counsellor_id')
    date_str      = data.get('date', '')
    time_slot     = data.get('time_slot', '')
    notes         = data.get('notes', '').strip()

    if not counsellor_id or not date_str or not time_slot:
        return jsonify({'error': 'Counsellor, date and time slot are all required'}), 400

    from datetime import date as date_type
    try:
        appt_date = date_type.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400

    if appt_date < date_type.today():
        return jsonify({'error': 'Cannot book a past date'}), 400

    # ── Conflict check ────────────────────────────────────────────
    # Reject if counsellor is already booked at this date + time
    conflict = Appointment.query.filter(
        Appointment.counsellor_id  == counsellor_id,
        Appointment.requested_date == appt_date,
        Appointment.time_slot      == time_slot,
        Appointment.status.in_(['pending', 'confirmed'])
    ).first()

    if conflict:
        return jsonify({
            'error': 'That time slot is no longer available. Please choose another.'
        }), 409

    # ── Prevent duplicate booking by same student ─────────────────
    existing = Appointment.query.filter(
        Appointment.student_id     == student_id,
        Appointment.counsellor_id  == counsellor_id,
        Appointment.requested_date == appt_date,
        Appointment.status.in_(['pending', 'confirmed'])
    ).first()

    if existing:
        return jsonify({
            'error': 'You already have a booking with this counsellor on this date.'
        }), 409

    # ── Save appointment ──────────────────────────────────────────
    appt = Appointment(
        student_id     = student_id,
        counsellor_id  = int(counsellor_id),
        requested_date = appt_date,
        time_slot      = time_slot,
        notes          = notes,
        status         = 'pending',
    )
    db.session.add(appt)
    db.session.commit()

    # ── Send confirmation emails ──────────────────────────────────
    student    = User.query.get(student_id)
    counsellor = User.query.get(counsellor_id)

    try:
        # Email to student
        student_msg = Message(
            subject    = 'MindEase — Appointment Request Received',
            recipients = [student.email],
            body       = f"""Dear {student.name},

Your appointment request has been received and is pending confirmation.

Details:
  Counsellor : {counsellor.name}
  Date       : {appt_date.strftime('%d %B %Y')}
  Time       : {time_slot}
  Status     : Pending counsellor confirmation

You will receive another email once your counsellor confirms or reschedules.

— MindEase Student Wellbeing System"""
        )
        mail.send(student_msg)

        # Email to counsellor
        counsellor_msg = Message(
            subject    = 'MindEase — New Appointment Request',
            recipients = [counsellor.email],
            body       = f"""Dear {counsellor.name},

A student has requested an appointment with you.

Details:
  Student : {student.name}
  Date    : {appt_date.strftime('%d %B %Y')}
  Time    : {time_slot}
  Notes   : {notes or 'None provided'}

Please log in to MindEase to confirm or reschedule this appointment.

— MindEase Student Wellbeing System"""
        )
        mail.send(counsellor_msg)

    except Exception as e:
        # Email failure should not block the booking
        print(f"Email error: {e}")

    return jsonify({
        'message':        'Appointment booked successfully!',
        'appointment_id': appt.id,
        'status':         'pending',
        'counsellor':     counsellor.name,
        'date':           appt_date.strftime('%d %B %Y'),
        'time_slot':      time_slot,
    }), 201


@app.route('/api/appointments')
@login_required
def get_appointments():
    """Returns this student's appointment history"""
    user_id = session['user_id']
    appts   = (Appointment.query
               .filter_by(student_id=user_id)
               .order_by(Appointment.requested_date.desc())
               .all())
    return jsonify([a.to_dict() for a in appts]), 200        

# ── GET /api/resources — return all resources ──────────────────
@app.route('/api/resources')
@login_required
def get_resources():
    category = request.args.get('category')   # optional filter
    search   = request.args.get('search', '').strip().lower()

    query = Resource.query
    if category and category != 'All':
        query = query.filter_by(category=category)
    if search:
        query = query.filter(
            Resource.title.ilike(f'%{search}%') |
            Resource.description.ilike(f'%{search}%')
        )

    resources = query.order_by(Resource.category, Resource.title).all()
    return jsonify([r.to_dict() for r in resources]), 200


# ── Seed starter resources — call once from app context ────────
# Add this helper function and call it in the if __name__ == '__main__' block
def seed_resources():
    if Resource.query.count() > 0:
        return   # already seeded

    starter = [
        # Anxiety
        {'title':'Box Breathing for Exam Anxiety','icon':'🌬','category':'Anxiety',
         'description':'A simple 4-4-4-4 breathing technique proven to calm the nervous system within minutes.',
         'content':'Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. Repeat 4 times.'},
        {'title':'5-4-3-2-1 Grounding Technique','icon':'🖐','category':'Anxiety',
         'description':'Ground yourself in the present moment using your five senses to break an anxiety spiral.',
         'content':'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.'},
        {'title':'Understanding Test Anxiety','icon':'📝','category':'Anxiety',
         'description':'Why exams make us anxious and evidence-based strategies to manage performance stress.',
         'content':'Test anxiety is caused by the brain perceiving the exam as a threat. Preparation, sleep, and breathing reduce its impact.'},
        # Sleep
        {'title':'7 Sleep Hygiene Rules for Students','icon':'😴','category':'Sleep',
         'description':'Practical steps to improve your sleep quality even during high-pressure study periods.',
         'content':'Consistent sleep times, dark room, no screens 1hr before bed, limit caffeine after 2pm, keep room cool.'},
        {'title':'Why Sleep Matters for Academic Performance','icon':'🧠','category':'Sleep',
         'description':'Research shows sleep-deprived students perform significantly worse on memory and reasoning tasks.',
         'content':'Memory consolidation occurs during sleep. Aim for 7-9 hours. Avoid all-nighters before exams.'},
        # Stress
        {'title':'Managing Deadline Stress','icon':'⏰','category':'Stress',
         'description':'Time-boxing, priority matrices, and short breaks can dramatically reduce academic overwhelm.',
         'content':'Break large tasks into 25-minute Pomodoro sessions. Take a 5-minute walk between each one.'},
        {'title':'Progressive Muscle Relaxation','icon':'💪','category':'Stress',
         'description':'Tense and release each muscle group to release physical tension stored by chronic stress.',
         'content':'Starting from feet, tense each muscle group for 5 seconds then release. Work upward to face. Takes 10 minutes.'},
        {'title':'Academic Burnout: Signs and Recovery','icon':'🔥','category':'Stress',
         'description':'Recognise the warning signs of burnout early and take steps to recover before it escalates.',
         'content':'Burnout signs: exhaustion, cynicism, reduced effectiveness. Recovery: rest, boundaries, social support.'},
        # Motivation
        {'title':'Finding Your Study Motivation','icon':'🎯','category':'Motivation',
         'description':'Reconnect with your goals and use proven techniques to restart momentum when feeling unmotivated.',
         'content':'Start with 2-minute tasks. Reward completion. Connect daily study to your long-term career vision.'},
        {'title':'The Power of Small Wins','icon':'⭐','category':'Motivation',
         'description':'How celebrating small daily achievements builds the momentum needed for long-term success.',
         'content':'Each small win releases dopamine, reinforcing study habits. Track completions with a checklist.'},
        # Loneliness
        {'title':'Combating University Loneliness','icon':'🤝','category':'Loneliness',
         'description':'Practical ways to build meaningful connections on campus even if you are shy or new to the area.',
         'content':'Join one campus club, sit with different people at lunch, volunteer for group projects. Quality over quantity.'},
        {'title':'Social Connection and Mental Health','icon':'💚','category':'Loneliness',
         'description':'Research consistently shows social connection is one of the strongest predictors of wellbeing.',
         'content':'Even brief positive social interactions reduce cortisol. Reach out to one person daily, even with a message.'},
    ]

    for r in starter:
        db.session.add(Resource(**r))
    db.session.commit()
    print(f"✅ Seeded {len(starter)} starter resources")


    

@app.route('/api/register', methods=['POST'])
def register():
    data  = request.get_json()          # React sends JSON body
    name  = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role  = data.get('role', 'student')  # student / counsellor

    # ── Validation ────────────────────────────────────────────────
    if not name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    # ── Check if email already exists ─────────────────────────────
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'An account with this email already exists'}), 409

    # ── Hash password with bcrypt ─────────────────────────────────
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    # ── Counsellors need admin approval before they can log in ────
    is_approved = False if role == 'counsellor' else True

    # ── Save new user to database ─────────────────────────────────
    new_user = User(
        name        = name,
        email       = email,
        password    = hashed.decode('utf-8'),
        role        = role,
        is_approved = is_approved
    )
    db.session.add(new_user)
    db.session.commit()

    # ── Create a Streak row for this student ──────────────────────
    if role == 'student':
        streak = Streak(user_id=new_user.id, current_streak=0)
        db.session.add(streak)
        db.session.commit()

    msg = ('Registered! Wait for admin approval before logging in.'
           if role == 'counsellor'
           else 'Account created successfully!')

    return jsonify({'message': msg, 'role': role}), 201



@app.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    # ── Find user by email ────────────────────────────────────────
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'No account found with this email'}), 404

    # ── Check password ────────────────────────────────────────────
    password_matches = bcrypt.checkpw(
        password.encode('utf-8'),
        user.password.encode('utf-8')
    )
    if not password_matches:
        return jsonify({'error': 'Incorrect password'}), 401

    # ── Check if counsellor is approved ───────────────────────────
    if not user.is_approved:
        return jsonify({'error': 'Your account is awaiting admin approval'}), 403

    # ── Save user to Flask session ────────────────────────────────
    # session is like a cookie — Flask remembers who is logged in
    session['user_id']   = user.id
    session['user_role'] = user.role
    session['user_name'] = user.name
    session.permanent    = True

    # ── Send user info back to React ──────────────────────────────
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id':   user.id,
            'name': user.name,
            'role': user.role,
        }
    }), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()   # wipe all session data
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/me')
def me():
    """
    React calls this when the page loads to check if user is still logged in.
    If Flask session has user_id → user is logged in → send their info.
    If not → send 401 → React redirects to login page.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'id':   user.id,
        'name': user.name,
        'role': user.role,
    }), 200


# ── Helper: protect any route that needs login ────────────────
# Use @login_required above any route that only logged-in users can access




# Example usage of @login_required (you will use this from Day 9 onwards):
# @app.route('/api/checkin', methods=['POST'])
# @login_required
# def checkin():
#     user_id = session['user_id']   ← get logged-in user's id
#     ...


# ════════════════════════════════════════════════════════════
# CREATE TABLES AND RUN
# ════════════════════════════════════════════════════════════

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_resources() 
        print("✅ All 7 database tables created in mindease_db")
    app.run(debug=False, port=5000)



