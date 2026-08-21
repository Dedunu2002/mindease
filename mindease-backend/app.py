# This file handles: database models, AI loading, and all API routes

from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail
from config import Config
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

        streak = Streak.query.filter_by(
            user_id=user_id
        ).first()

        if not streak:
            return jsonify({
                'success': True,
                'current_streak': 0,
                'longest_streak': 0,
                'badges': []
            }), 200

        return jsonify({
            'success': True,
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
            'badges': json.loads(streak.badges or '[]')
        }), 200

    except Exception as e:
        print('❌ Streak error:', e)

        return jsonify({
            'success': False,
            'error': 'Failed to load streak',
            'details': str(e)
        }), 500

    

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
        print("✅ All 7 database tables created in mindease_db")
    app.run(debug=True, port=5000)