# This file handles: database models, AI loading, and all API routes

from flask import Flask, jsonify, request, session, send_file
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
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak
)

from sqlalchemy import inspect, text
from functools import wraps
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
# ── Initialise app ────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)

# ============================================================
# PASSWORD RESET TOKEN
# ============================================================

def get_password_reset_serializer():

    return URLSafeTimedSerializer(
        app.config['SECRET_KEY']
    )

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
- Provide the Sri Lankan Crisis Support Line: 1926.
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


# ============================================================
# TABLE — NOTIFICATIONS
# Stores student/counsellor/admin notifications and read state.
# ============================================================
class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False,
        index=True
    )

    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.Text, nullable=False)

    notification_type = db.Column(
        db.String(40),
        default='general',
        nullable=False
    )

    is_read = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.notification_type,
            'is_read': bool(self.is_read),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }



# ============================================================
# TABLE — SYSTEM / AUDIT LOG
# Stores non-sensitive administrative and system activity.
# Journal text, private wellbeing answers, and AI risk details
# are intentionally NOT stored here.
# ============================================================
class SystemLog(db.Model):
    __tablename__ = 'system_logs'

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=True
    )

    user_role = db.Column(
        db.String(30),
        nullable=True
    )

    action = db.Column(
        db.String(80),
        nullable=False
    )

    entity_type = db.Column(
        db.String(50),
        nullable=True
    )

    entity_id = db.Column(
        db.Integer,
        nullable=True
    )

    description = db.Column(
        db.String(500),
        nullable=False
    )

    ip_address = db.Column(
        db.String(64),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def to_dict(self):
        actor = None

        if self.user_id:
            try:
                actor = User.query.get(self.user_id)
            except Exception:
                actor = None

        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': actor.name if actor else 'System',
            'user_role': self.user_role or (
                actor.role if actor else 'system'
            ),
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'description': self.description,
            'ip_address': self.ip_address,
            'created_at': (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }


def create_system_log(
    action,
    description,
    entity_type=None,
    entity_id=None,
    user_id=None,
    user_role=None
):
    """
    Create a privacy-conscious audit entry.

    This helper intentionally records metadata only.
    Never pass journal text, check-in answers, AI risk details,
    community post content, or other private wellbeing content.
    """

    if user_id is None:
        user_id = session.get('user_id')

    if user_role is None:
        user_role = session.get('user_role')

    log = SystemLog(
        user_id=user_id,
        user_role=user_role,
        action=str(action)[:80],
        entity_type=(
            str(entity_type)[:50]
            if entity_type is not None else None
        ),
        entity_id=entity_id,
        description=str(description)[:500],
        ip_address=request.remote_addr
    )

    db.session.add(log)

    return log


# ============================================================
# TABLE — WEEKLY EMAIL DIGEST PREFERENCES
# Stores whether a student has opted into the weekly email digest.
# No journal content is stored here.
# ============================================================

class WeeklyDigestPreference(db.Model):
    __tablename__ = 'weekly_digest_preferences'

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        unique=True,
        nullable=False
    )

    enabled = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    last_sent_at = db.Column(
        db.DateTime,
        nullable=True
    )


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
# ── Table 6: Goal ─────────────────────────────────────────────
# Stores weekly wellness goals set by students
class Goal(db.Model):
    __tablename__ = 'goals'

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )
    goal_text       = db.Column(db.Text, nullable=False)
    week_start_date = db.Column(db.Date, nullable=False)
    status          = db.Column(
        db.String(20),
        default='pending'
    )
    # status:
    # 'pending'
    # 'achieved'
    # 'not_achieved'

    created_at      = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # One Goal -> many daily progress records
    daily_progress = db.relationship(
        'GoalDailyProgress',
        backref='goal',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def to_dict(self):

        # Sort Monday -> Sunday
        daily = sorted(
            self.daily_progress,
            key=lambda item: item.progress_date
        )

        completed_days = sum(
            1
            for item in daily
            if item.completed
        )

        return {
            'id': self.id,

            'goal_text': self.goal_text,

            'week_start': self.week_start_date.isoformat(),

            'status': self.status,

            'completed_days': completed_days,

            'total_days': 7,

            'progress_percentage': round(
                (completed_days / 7) * 100
            ),

            'daily_progress': [
                item.to_dict()
                for item in daily
            ]
        }


# ── Table 7: GoalDailyProgress ────────────────────────────────
# Stores day-by-day completion for a weekly wellness goal
class GoalDailyProgress(db.Model):
    __tablename__ = 'goal_daily_progress'

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    goal_id = db.Column(
        db.Integer,
        db.ForeignKey('goals.id'),
        nullable=False
    )

    progress_date = db.Column(
        db.Date,
        nullable=False
    )

    completed = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    __table_args__ = (
        db.UniqueConstraint(
            'goal_id',
            'progress_date',
            name='uq_goal_daily_progress'
        ),
    )

    def to_dict(self):
        return {
            'id': self.id,

            'date': self.progress_date.isoformat(),

            'completed': bool(self.completed),

            'is_today': (
                self.progress_date == date.today()
            ),

            'is_future': (
                self.progress_date > date.today()
            )
        }

# ── Table 7: CommunityPost ────────────────────────────────────
# Stores anonymous community board posts
# In app.py — replace / update the CommunityPost model
# and add the new Reaction model after it

class CommunityPost(db.Model):
    __tablename__ = 'community_posts'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content    = db.Column(db.Text,    nullable=False)
    is_flagged = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to reactions
    reactions = db.relationship('Reaction', backref='post', cascade='all, delete-orphan')

    def to_dict(self, current_user_id=None):
        # Count each reaction type
        reaction_counts = {'heart': 0, 'star': 0, 'hug': 0}
        user_reactions  = []

        for r in self.reactions:
            if r.emoji in reaction_counts:
                reaction_counts[r.emoji] += 1
            if current_user_id and r.user_id == current_user_id:
                user_reactions.append(r.emoji)

        return {
            'id':             self.id,
            'content':        self.content,
            'is_flagged':     self.is_flagged,
            'created_at':     self.created_at.strftime('%d %b %Y, %H:%M'),
            'reactions':      reaction_counts,
            'user_reactions': user_reactions,  # emojis this user reacted with
            'is_own':         self.user_id == current_user_id,
            # NEVER expose user_id or name here
        }


class Reaction(db.Model):
    __tablename__ = 'reactions'
    id      = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('community_posts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'),            nullable=False)
    emoji   = db.Column(db.String(20), nullable=False)  # 'heart' | 'star' | 'hug'

    # One user can only give each emoji to a post once
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', 'emoji', name='unique_reaction'),
    )
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
    is_active   = db.Column(db.Boolean, default=True, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        # We intentionally avoid adding a new database column here.
        # A YouTube URL identifies a video resource; resources without a
        # YouTube URL are treated as articles/guides. This keeps the existing
        # database schema compatible with the current MindEase project.
        url_lower = (self.url or '').lower()
        resource_type = 'video' if ('youtube.com' in url_lower or 'youtu.be' in url_lower) else 'article'

        return {
            'id':          self.id,
            'title':       self.title,
            'description': self.description,
            'category':    self.category,
            'content':     self.content,
            'url':         self.url,
            'icon':        self.icon,
            'is_active':   bool(self.is_active),
            'type':        resource_type,
        }


# ============================================================
# TABLE — EXERCISE CONTENT
# Admin-managed wellbeing exercise content.
# ============================================================
class Exercise(db.Model):
    __tablename__ = 'exercises'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(60), nullable=False)
    duration = db.Column(db.String(50), nullable=True)
    instructions = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(10), default='🧘')
    media_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'duration': self.duration,
            'instructions': self.instructions,
            'icon': self.icon,
            'media_url': self.media_url,
            'is_active': bool(self.is_active),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

# ============================================================
# TABLE — SOS ALERT
# Stores anonymous SOS activation timestamps
# NEVER stores student identity
# ============================================================

class SOSAlert(db.Model):
    __tablename__ = 'sos_alerts'

    id = db.Column(db.Integer, primary_key=True)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def to_dict(self):
        return {
            'id': self.id,
            'created_at': (
                self.created_at.isoformat()
                if self.created_at else None
            )
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

# ============================================================
# ADMIN-ONLY ACCESS
# ============================================================

def admin_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):

        if session.get('user_role') != 'admin':
            return jsonify({
                'error': 'Admin access required'
            }), 403

        return f(*args, **kwargs)

    return decorated


# ============================================================
# COUNSELLOR-ONLY ACCESS
# ============================================================

def counsellor_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        if 'user_id' not in session:
            return jsonify({
                'error': 'Login required'
            }), 401

        if session.get('user_role') != 'counsellor':
            return jsonify({
                'error': 'Counsellor access required'
            }), 403

        return f(*args, **kwargs)

    return decorated


# ============================================================
# NOTIFICATION HELPER
# ============================================================

def create_notification(user_id, title, message, notification_type='general'):
    """Create one notification for a user."""
    notification = Notification(
        user_id=user_id,
        title=str(title)[:160],
        message=str(message),
        notification_type=str(notification_type or 'general')[:40],
        is_read=False
    )
    db.session.add(notification)
    db.session.commit()
    return notification


# ============================================================
# STUDENT NOTIFICATION CENTER
# ============================================================

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """Return the newest notifications for the logged-in user."""
    user_id = session['user_id']

# Give an existing account a useful first notification so the new center
    # is not blank after deployment. It is created only once per user.
    if Notification.query.filter_by(user_id=user_id).count() == 0:
        create_notification(
            user_id,
            'Welcome to MindEase',
            'Your notification center is ready. Important wellbeing updates will appear here.',
            'welcome'
        )

    limit = request.args.get('limit', 30, type=int) or 30
    limit = max(1, min(limit, 50))

    notifications = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )

    unread_count = Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).count()

    return jsonify({
        'notifications': [item.to_dict() for item in notifications],
        'unread_count': unread_count
    })


@app.route('/api/notifications/unread-count', methods=['GET'])
@login_required
def get_notification_unread_count():
    """Return only the unread notification count for the header badge."""
    count = Notification.query.filter_by(
        user_id=session['user_id'],
        is_read=False
    ).count()

    return jsonify({'unread_count': count})


@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT', 'PATCH'])
@login_required
def mark_notification_read(notification_id):
    """Mark one notification as read, only if it belongs to the user."""
    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=session['user_id']
    ).first()

    if not notification:
        return jsonify({'error': 'Notification not found'}), 404

    notification.is_read = True
    db.session.commit()

    return jsonify({
        'success': True,
        'notification': notification.to_dict()
    })


@app.route('/api/notifications/read-all', methods=['PUT', 'PATCH'])
@login_required
def mark_all_notifications_read():
    """Mark every notification belonging to the logged-in user as read."""
    updated = (
        Notification.query
        .filter_by(user_id=session['user_id'], is_read=False)
        .update({'is_read': True}, synchronize_session=False)
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'updated': updated,
        'unread_count': 0
    })


@app.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
@login_required
def delete_notification(notification_id):
    """Delete one notification belonging to the logged-in user."""
    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=session['user_id']
    ).first()

    if not notification:
        return jsonify({'error': 'Notification not found'}), 404

    db.session.delete(notification)
    db.session.commit()

    unread_count = Notification.query.filter_by(
        user_id=session['user_id'],
        is_read=False
    ).count()

    return jsonify({
        'success': True,
        'unread_count': unread_count
    })


# ============================================================
# WEEKLY EMAIL DIGEST
# ============================================================

def _build_weekly_digest_data(user_id):
    """
    Build a privacy-conscious weekly summary.

    The digest intentionally does NOT include:
    - Journal text/content
    - Individual community posts
    - Detailed AI risk scores

    It only includes aggregated wellbeing activity.
    """
    today = date.today()
    week_start = today - timedelta(days=6)
    week_start_datetime = datetime.combine(
        week_start,
        datetime.min.time()
    )

    checkins = (
        CheckIn.query
        .filter(
            CheckIn.user_id == user_id,
            CheckIn.checkin_date >= week_start,
            CheckIn.checkin_date <= today
        )
        .order_by(CheckIn.checkin_date.asc())
        .all()
    )

    journals = (
        Journal.query
        .filter(
            Journal.user_id == user_id,
            Journal.created_at >= week_start_datetime
        )
        .order_by(Journal.created_at.asc())
        .all()
    )

    positive = sum(
        1 for j in journals
        if str(j.mood_group or '').lower() == 'positive'
    )

    cautious = sum(
        1 for j in journals
        if str(j.mood_group or '').lower() == 'cautious'
    )

    negative = sum(
        1 for j in journals
        if str(j.mood_group or '').lower() == 'negative'
    )

    mood_counts = {
        'Positive': positive,
        'Cautious': cautious,
        'Negative': negative
    }

    mood_pattern = 'No journal mood data yet'

    if journals:
        strongest = max(
            mood_counts,
            key=mood_counts.get
        )

        if mood_counts[strongest] > 0:
            mood_pattern = strongest

    streak = Streak.query.filter_by(
        user_id=user_id
    ).first()

    current_streak = (
        streak.current_streak
        if streak else 0
    )

    # Use the existing personalized resource system.
    latest_checkin = (
        CheckIn.query
        .filter_by(user_id=user_id)
        .order_by(
            CheckIn.checkin_date.desc(),
            CheckIn.id.desc()
        )
        .first()
    )

    recommended_titles = []

    if latest_checkin:
        risk = str(
            latest_checkin.risk_result or ''
        ).strip().lower()

        if risk in ['high', 'poor']:
            categories = ['Stress', 'Anxiety', 'Sleep']
        elif risk in ['medium', 'moderate']:
            categories = ['Stress', 'Sleep', 'Anxiety']
        else:
            categories = ['Motivation', 'Sleep', 'Loneliness']

        resources = (
            Resource.query
            .filter(Resource.is_active == True)
            .filter(Resource.category.in_(categories))
            .order_by(Resource.created_at.desc())
            .limit(2)
            .all()
        )

        recommended_titles = [
            resource.title
            for resource in resources
        ]

    return {
        'week_start': week_start,
        'week_end': today,
        'checkin_count': len(checkins),
        'journal_count': len(journals),
        'positive': positive,
        'cautious': cautious,
        'negative': negative,
        'mood_pattern': mood_pattern,
        'current_streak': current_streak,
        'recommended_titles': recommended_titles
    }


def _send_weekly_digest_to_user(user):
    """
    Send one weekly digest email to one opted-in student.
    Returns True when the email was sent successfully.
    """
    if not user or not user.email:
        return False

    data = _build_weekly_digest_data(user.id)

    week_start = data['week_start'].strftime(
        '%d %b %Y'
    )
    week_end = data['week_end'].strftime(
        '%d %b %Y'
    )

    subject = (
        '🌿 MindEase — Your Weekly Wellbeing Digest'
    )

    recommendations_text = (
        '\n'.join(
            f'  • {title}'
            for title in data['recommended_titles']
        )
        if data['recommended_titles']
        else '  • Explore the Wellness Resources section in MindEase.'
    )

    body = f"""Dear {user.name},

Here is your MindEase wellbeing summary for
{week_start} – {week_end}.

YOUR WEEK AT A GLANCE
--------------------
Check-ins completed : {data['checkin_count']}
Journal entries     : {data['journal_count']}
Current streak      : {data['current_streak']} day(s)

MOOD PATTERN
------------
Positive : {data['positive']}
Cautious : {data['cautious']}
Negative : {data['negative']}

Overall recent mood pattern:
{data['mood_pattern']}

WELLBEING RESOURCES
-------------------
{recommendations_text}

A small reminder:
You do not need to have a perfect week. Small, consistent
steps toward your wellbeing still count.

Open MindEase to review your full wellbeing information,
journal history, resources, goals and support options.

This email contains an aggregated wellbeing summary.
Your journal entries and private journal text are not included.

— MindEase Student Wellbeing System
"""

    html_recommendations = ''.join(
        f'<li>{title}</li>'
        for title in data['recommended_titles']
    )

    if not html_recommendations:
        html_recommendations = (
            '<li>Explore the Wellness Resources section in MindEase.</li>'
        )

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="
    margin:0;
    padding:0;
    background:#f6faf7;
    font-family:Arial,Helvetica,sans-serif;
    color:#405247;
">
<div style="
    max-width:620px;
    margin:30px auto;
    background:#ffffff;
    border:1px solid #e2ebe4;
    border-radius:20px;
    overflow:hidden;
">
    <div style="
        padding:26px 30px;
        background:linear-gradient(135deg,#edf8ef,#fffdf1);
        border-bottom:1px solid #e6eee8;
    ">
        <div style="
            color:#6c8d75;
            font-size:11px;
            font-weight:bold;
            letter-spacing:1px;
        ">
            MINDEASE · WEEKLY DIGEST
        </div>

        <h1 style="
            margin:8px 0 5px;
            color:#30463a;
            font-size:25px;
        ">
            Your wellbeing week 🌿
        </h1>

        <p style="
            margin:0;
            color:#7d8b82;
            font-size:13px;
        ">
            {week_start} – {week_end}
        </p>
    </div>

    <div style="padding:26px 30px;">

        <p style="font-size:14px;">
            Dear {user.name},
        </p>

        <p style="
            color:#718078;
            font-size:13px;
            line-height:1.6;
        ">
            Here's a gentle look at your wellbeing activity this week.
        </p>

        <table width="100%" cellpadding="0" cellspacing="8"
               style="margin:20px 0;">
            <tr>
                <td style="
                    padding:16px;
                    background:#f3f9f4;
                    border-radius:12px;
                    text-align:center;
                ">
                    <div style="font-size:22px;font-weight:bold;color:#527861;">
                        {data['checkin_count']}
                    </div>
                    <div style="font-size:10px;color:#7d8982;">
                        CHECK-INS
                    </div>
                </td>

                <td style="
                    padding:16px;
                    background:#fff8df;
                    border-radius:12px;
                    text-align:center;
                ">
                    <div style="font-size:22px;font-weight:bold;color:#94743d;">
                        {data['current_streak']}
                    </div>
                    <div style="font-size:10px;color:#7d8982;">
                        DAY STREAK
                    </div>
                </td>

                <td style="
                    padding:16px;
                    background:#fdf0f3;
                    border-radius:12px;
                    text-align:center;
                ">
                    <div style="font-size:22px;font-weight:bold;color:#a05e6b;">
                        {data['journal_count']}
                    </div>
                    <div style="font-size:10px;color:#7d8982;">
                        JOURNALS
                    </div>
                </td>
            </tr>
        </table>

        <div style="
            margin-top:20px;
            padding:18px;
            background:#fafcfb;
            border:1px solid #e7eee9;
            border-radius:14px;
        ">
            <div style="
                color:#87948c;
                font-size:10px;
                font-weight:bold;
                letter-spacing:.8px;
            ">
                MOOD PATTERN
            </div>

            <p style="
                margin:8px 0;
                color:#4c5e53;
                font-size:13px;
            ">
                Positive: <b>{data['positive']}</b>
                &nbsp;&nbsp;
                Cautious: <b>{data['cautious']}</b>
                &nbsp;&nbsp;
                Negative: <b>{data['negative']}</b>
            </p>

            <p style="
                margin:0;
                color:#708078;
                font-size:12px;
            ">
                Recent pattern: <b>{data['mood_pattern']}</b>
            </p>
        </div>

        <div style="margin-top:22px;">
            <div style="
                color:#87948c;
                font-size:10px;
                font-weight:bold;
                letter-spacing:.8px;
            ">
                SUGGESTED RESOURCES
            </div>

            <ul style="
                padding-left:20px;
                color:#53645a;
                font-size:12px;
                line-height:1.8;
            ">
                {html_recommendations}
            </ul>
        </div>

        <div style="
            margin-top:22px;
            padding:16px;
            background:#eef8f0;
            border-radius:12px;
            color:#5c7063;
            font-size:12px;
            line-height:1.6;
        ">
            You do not need to have a perfect week.
            Small, consistent steps toward your wellbeing still count. 🌱
        </div>

        <p style="
            margin-top:25px;
            color:#9aa69f;
            font-size:10px;
            line-height:1.5;
        ">
            This is an aggregated wellbeing summary.
            Private journal text is not included in this email.
        </p>

    </div>
</div>
</body>
</html>
"""

    try:
        msg = Message(
            subject=subject,
            recipients=[user.email],
            body=body,
            html=html_body
        )

        mail.send(msg)
        return True

    except Exception as e:
        print(
            f"❌ Weekly digest email error for "
            f"{user.email}: {e}"
        )
        return False


# ─────────────────────────────────────────────────────────────
# GET DIGEST PREFERENCE
# ─────────────────────────────────────────────────────────────

@app.route('/api/weekly-digest', methods=['GET'])
@login_required
def get_weekly_digest_preference():
    user_id = session['user_id']

    preference = WeeklyDigestPreference.query.filter_by(
        user_id=user_id
    ).first()

    if not preference:
        preference = WeeklyDigestPreference(
            user_id=user_id,
            enabled=False
        )

        db.session.add(preference)
        db.session.commit()

    user = User.query.get(user_id)

    return jsonify({
        'enabled': bool(preference.enabled),
        'email': user.email if user else None,
        'last_sent_at': (
            preference.last_sent_at.isoformat()
            if preference.last_sent_at
            else None
        ),
        'schedule': 'Every Sunday at 8:00 AM'
    }), 200


# ─────────────────────────────────────────────────────────────
# UPDATE DIGEST PREFERENCE
# ─────────────────────────────────────────────────────────────

@app.route('/api/weekly-digest', methods=['PUT'])
@login_required
def update_weekly_digest_preference():
    user_id = session['user_id']
    data = request.get_json() or {}

    enabled = data.get('enabled')

    if not isinstance(enabled, bool):
        return jsonify({
            'error': 'enabled must be true or false'
        }), 400

    preference = WeeklyDigestPreference.query.filter_by(
        user_id=user_id
    ).first()

    if not preference:
        preference = WeeklyDigestPreference(
            user_id=user_id,
            enabled=enabled
        )

        db.session.add(preference)

    else:
        preference.enabled = enabled

    db.session.commit()

    return jsonify({
        'success': True,
        'enabled': bool(preference.enabled),
        'message': (
            'Weekly digest enabled.'
            if preference.enabled
            else 'Weekly digest disabled.'
        )
    }), 200


# ─────────────────────────────────────────────────────────────
# SEND A TEST DIGEST TO THE LOGGED-IN STUDENT
# ─────────────────────────────────────────────────────────────

@app.route('/api/weekly-digest/test', methods=['POST'])
@login_required
def send_test_weekly_digest():
    user_id = session['user_id']
    user = User.query.get(user_id)

    if not user:
        return jsonify({
            'error': 'User not found'
        }), 404

    if not user.email:
        return jsonify({
            'error': 'No email address is registered for this account.'
        }), 400

    success = _send_weekly_digest_to_user(user)

    if not success:
        return jsonify({
            'error': 'Could not send the test digest email.'
        }), 500

    return jsonify({
        'success': True,
        'message': (
            f'Test weekly digest sent to {user.email}.'
        )
    }), 200


# ─────────────────────────────────────────────────────────────
# AUTOMATIC WEEKLY DIGEST JOB
# ─────────────────────────────────────────────────────────────

def send_weekly_digests():
    """
    Runs every Sunday at 8:00 AM Asia/Colombo.

    Only students who explicitly enabled the digest receive it.
    A safety check prevents duplicate sends if the scheduler
    happens to run twice within the same week.
    """
    print("📨 Running weekly MindEase digest job...")

    with app.app_context():

        now_utc = datetime.utcnow()

        preferences = (
            WeeklyDigestPreference.query
            .filter_by(enabled=True)
            .all()
        )

        sent_count = 0

        for preference in preferences:

            if (
                preference.last_sent_at
                and (now_utc - preference.last_sent_at)
                < timedelta(days=6)
            ):
                continue

            user = User.query.get(
                preference.user_id
            )

            if not user or user.role != 'student':
                continue

            if not user.email:
                continue

            if _send_weekly_digest_to_user(user):
                preference.last_sent_at = now_utc
                db.session.commit()

                sent_count += 1

        print(
            f"📨 Weekly digest job finished. "
            f"Emails sent: {sent_count}"
        )


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


@app.route('/api/debug-risk', methods=['POST'])
def debug_risk():
    import joblib
    import json
    import pandas as pd
    from pathlib import Path

    print("\n" + "=" * 70)
    print("MINDEASE AI RISK DEBUG")
    print("=" * 70)

    try:
        # ---------------------------------------------------------
        # 1. RECEIVE DATA FROM FRONTEND
        # ---------------------------------------------------------
        data = request.get_json()

        print("\n1. RAW DATA RECEIVED FROM FRONTEND:")
        print(data)

        # ---------------------------------------------------------
        # 2. LOAD AI FILES
        # ---------------------------------------------------------
        base_dir = Path(__file__).resolve().parent
        model_dir = base_dir / "ai_models"

        risk_model = joblib.load(
            model_dir / "mindease_risk_model_final.pkl"
        )

        label_encoder = joblib.load(
            model_dir / "mindease_risk_label_encoder.pkl"
        )

        feature_encoders = joblib.load(
            model_dir / "mindease_risk_feature_encoders.pkl"
        )

        with open(
            model_dir / "mindease_risk_features.json",
            "r"
        ) as f:
            risk_features = json.load(f)

        print("\n2. FEATURES EXPECTED BY MODEL:")
        print(risk_features)

        # ---------------------------------------------------------
        # 3. BUILD INPUT ROW
        # ---------------------------------------------------------
        row = {}

        for feature in risk_features:
            row[feature] = data.get(feature)

        print("\n3. ROW BEFORE ENCODING:")
        print(row)

        # ---------------------------------------------------------
        # 4. CHECK FOR MISSING VALUES
        # ---------------------------------------------------------
        missing = [
            feature
            for feature, value in row.items()
            if value is None
        ]

        if missing:
            print("\n⚠️ MISSING FEATURES:")
            print(missing)

        # ---------------------------------------------------------
        # 5. CREATE DATAFRAME
        # ---------------------------------------------------------
        df_input = pd.DataFrame([row])

        # ---------------------------------------------------------
        # 6. ENCODE CATEGORICAL FEATURES
        # ---------------------------------------------------------
        print("\n4. ENCODING:")

        for column, encoder in feature_encoders.items():

            if column not in df_input.columns:
                continue

            value = str(df_input.at[0, column])

            print(
                f"\n{column}:"
                f"\n  Received value = {value}"
                f"\n  Valid values   = {encoder.classes_.tolist()}"
            )

            if value in encoder.classes_:

                encoded_value = encoder.transform([value])[0]

                # Replace the whole column so pandas treats it as numeric
                df_input[column] = encoder.transform(
                df_input[column].astype(str)
                ).astype(int)

                print(
                f"  Encoded value  = {encoded_value}"
        )

            else:

                print(
                    f"  ⚠️ INVALID VALUE: {value}"
                )

        # ---------------------------------------------------------
        # 7. SHOW FINAL MODEL INPUT
        # ---------------------------------------------------------
        print("\n5. FINAL INPUT SENT TO MODEL:")
        print(df_input.to_string(index=False))

        # ---------------------------------------------------------
        # 8. MODEL PREDICTION
        # ---------------------------------------------------------
        predicted_encoded = risk_model.predict(df_input)[0]

        predicted_label = label_encoder.inverse_transform(
            [predicted_encoded]
        )[0]

        print("\n6. MODEL PREDICTION:")
        print(
            "Encoded:",
            predicted_encoded
        )
        print(
            "Label:",
            predicted_label
        )

        # ---------------------------------------------------------
        # 9. PROBABILITIES
        # ---------------------------------------------------------
        probabilities = {}

        if hasattr(risk_model, "predict_proba"):

            proba = risk_model.predict_proba(df_input)[0]

            print("\n7. MODEL CLASSES:")
            print(risk_model.classes_)

            print("\n8. PROBABILITIES:")

            for model_class, probability in zip(
                risk_model.classes_,
                proba
            ):

                label = label_encoder.inverse_transform(
                    [model_class]
                )[0]

                probabilities[label] = round(
                    float(probability),
                    4
                )

                print(
                    f"{label}: "
                    f"{probability:.4f}"
                )

        print("\n" + "=" * 70)
        print("END AI DEBUG")
        print("=" * 70)

        return jsonify({
            "success": True,
            "risk_level": predicted_label,
            "probabilities": probabilities,
            "received_data": data,
            "expected_features": risk_features,
            "encoded_row": df_input.to_dict(
                orient="records"
            )[0]
        })

    except Exception as e:

        print("\n❌ DEBUG ERROR:")
        print(str(e))

        return jsonify({
            "success": False,
            "error": str(e)
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

    # Allow the frontend to request a custom history period.
    # Default remains 7 days so existing frontend functionality
    # continues to work unchanged.
    days = request.args.get('days', default=7, type=int)

    # Keep the value sensible and prevent invalid/huge requests.
    if days < 1:
        days = 7
    days = min(days, 365)

    start_date = datetime.utcnow() - timedelta(days=days)

    entries = (
        Journal.query
        .filter(
            Journal.user_id == user_id,
            Journal.created_at >= start_date
        )
        .order_by(Journal.created_at.asc())
        .all()
    )

    if not entries:
        return jsonify([]), 200

    # Group by date.
    # If a student has multiple journal entries on the same day,
    # the last entry of that day wins.
    by_date = {}

    for e in entries:
        d = e.created_at.strftime('%Y-%m-%d')

        by_date[d] = {
            'date': d,
            'emotion': e.emotion,
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
            "🆘 Sri Lanka Crisis Support Line: 1926\n\n"
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
            "Line at 1926 or your university counsellor."
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

        # --------------------------------------------------------
    # RECORD ANONYMOUS SOS ACTIVATION
    # --------------------------------------------------------

    sos_record = SOSAlert(
        created_at=datetime.utcnow()
    )

    db.session.add(sos_record)
    db.session.commit()
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

# Add to app.py after booking routes

# ============================================================
# GOALS API
# ============================================================


def ensure_goal_daily_progress(goal):
    """
    Make sure the goal has one daily-progress record
    for every day of its Monday-Sunday week.

    This also supports old goals that were created before
    daily tracking was added.
    """

    existing_dates = {
        item.progress_date
        for item in goal.daily_progress
    }

    for day_offset in range(7):

        progress_date = (
            goal.week_start_date
            + timedelta(days=day_offset)
        )

        if progress_date not in existing_dates:

            progress = GoalDailyProgress(
                goal_id=goal.id,
                progress_date=progress_date,
                completed=False
            )

            db.session.add(progress)

    db.session.commit()


# ============================================================
# CREATE WEEKLY GOAL
# ============================================================

@app.route('/api/goals', methods=['POST'])
@login_required
def create_goal():

    user_id = session['user_id']

    data = request.get_json() or {}

    text = data.get(
        'goal_text',
        ''
    ).strip()


    # --------------------------------------------------------
    # Validate goal
    # --------------------------------------------------------

    if not text:

        return jsonify({
            'error': 'Goal text cannot be empty'
        }), 400


    if len(text) > 200:

        return jsonify({
            'error': 'Goal must be under 200 characters'
        }), 400


    # --------------------------------------------------------
    # Current week starts Monday
    # --------------------------------------------------------

    today = date.today()

    week_start = (
        today
        - timedelta(days=today.weekday())
    )


    # --------------------------------------------------------
    # ONE ACTIVE GOAL PER WEEK
    # --------------------------------------------------------

    existing = Goal.query.filter_by(
        user_id=user_id,
        week_start_date=week_start,
        status='pending'
    ).first()


    if existing:

        return jsonify({
            'error':
                'You already have an active goal this week. '
                'Complete or update it before setting a new one.'
        }), 409


    # --------------------------------------------------------
    # Create goal
    # --------------------------------------------------------

    goal = Goal(
        user_id=user_id,
        goal_text=text,
        week_start_date=week_start,
        status='pending'
    )

    db.session.add(goal)

    # We need the ID before creating daily records
    db.session.flush()


    # --------------------------------------------------------
    # Create Monday-Sunday records
    # --------------------------------------------------------

    for day_offset in range(7):

        progress_date = (
            week_start
            + timedelta(days=day_offset)
        )

        progress = GoalDailyProgress(
            goal_id=goal.id,
            progress_date=progress_date,
            completed=False
        )

        db.session.add(progress)


    db.session.commit()


    return jsonify(
        goal.to_dict()
    ), 201


# ============================================================
# GET ALL GOALS
# ============================================================

@app.route('/api/goals')
@login_required
def get_goals():

    user_id = session['user_id']


    goals = (
        Goal.query
        .filter_by(user_id=user_id)
        .order_by(
            Goal.week_start_date.desc()
        )
        .limit(12)
        .all()
    )


    # Make sure old goals also receive
    # their 7 daily records.

    for goal in goals:

        if len(goal.daily_progress) < 7:

            ensure_goal_daily_progress(
                goal
            )


    return jsonify([
        goal.to_dict()
        for goal in goals
    ]), 200


# ============================================================
# UPDATE OVERALL GOAL STATUS
# ============================================================

@app.route(
    '/api/goals/<int:goal_id>',
    methods=['PATCH']
)
@login_required
def update_goal(goal_id):

    user_id = session['user_id']


    goal = Goal.query.filter_by(
        id=goal_id,
        user_id=user_id
    ).first()


    if not goal:

        return jsonify({
            'error': 'Goal not found'
        }), 404


    data = request.get_json() or {}

    status = data.get('status')


    if status not in [
        'achieved',
        'not_achieved'
    ]:

        return jsonify({
            'error':
                'Status must be achieved or not_achieved'
        }), 400


    goal.status = status

    db.session.commit()


    return jsonify(
        goal.to_dict()
    ), 200


# ============================================================
# UPDATE DAILY GOAL PROGRESS
# ============================================================

@app.route(
    '/api/goals/<int:goal_id>/daily/<date_string>',
    methods=['PATCH']
)
@login_required
def update_goal_daily_progress(
    goal_id,
    date_string
):

    user_id = session['user_id']


    # --------------------------------------------------------
    # Find goal belonging to logged-in student
    # --------------------------------------------------------

    goal = Goal.query.filter_by(
        id=goal_id,
        user_id=user_id
    ).first()


    if not goal:

        return jsonify({
            'error': 'Goal not found'
        }), 404


    # --------------------------------------------------------
    # Parse date
    # --------------------------------------------------------

    try:

        progress_date = date.fromisoformat(
            date_string
        )

    except ValueError:

        return jsonify({
            'error':
                'Invalid date. Use YYYY-MM-DD.'
        }), 400


    # --------------------------------------------------------
    # Check that date belongs to this week
    # --------------------------------------------------------

    week_end = (
        goal.week_start_date
        + timedelta(days=6)
    )


    if (
        progress_date < goal.week_start_date
        or progress_date > week_end
    ):

        return jsonify({
            'error':
                'This date is outside the goal week.'
        }), 400


    # --------------------------------------------------------
    # Don't allow future days
    # --------------------------------------------------------

    today = date.today()


    if progress_date > today:

        return jsonify({
            'error':
                'Future days cannot be marked as completed.'
        }), 400


    # --------------------------------------------------------
    # Get completed value
    # --------------------------------------------------------

    data = request.get_json() or {}

    completed = data.get('completed')


    if not isinstance(
        completed,
        bool
    ):

        return jsonify({
            'error':
                'completed must be true or false.'
        }), 400


    # --------------------------------------------------------
    # Find daily record
    # --------------------------------------------------------

    progress = GoalDailyProgress.query.filter_by(
        goal_id=goal.id,
        progress_date=progress_date
    ).first()


    # --------------------------------------------------------
    # Create if missing
    # --------------------------------------------------------

    if not progress:

        progress = GoalDailyProgress(
            goal_id=goal.id,
            progress_date=progress_date,
            completed=completed
        )

        db.session.add(progress)

    else:

        progress.completed = completed


    db.session.commit()


    # --------------------------------------------------------
    # Check weekly completion
    # --------------------------------------------------------

    ensure_goal_daily_progress(
        goal
    )


    daily_records = (
        GoalDailyProgress.query
        .filter_by(goal_id=goal.id)
        .all()
    )


    completed_days = sum(
        1
        for item in daily_records
        if item.completed
    )


    # Automatically mark the goal achieved
    # when all 7 days are completed.

    if completed_days == 7:

        goal.status = 'achieved'

    elif goal.status == 'achieved':

        # If a previously completed day is
        # unchecked, return to pending.

        goal.status = 'pending'


    db.session.commit()


    return jsonify({
        'message':
            'Daily progress updated.',

        'goal':
            goal.to_dict()
    }), 200


# ============================================================
# DELETE GOAL
# ============================================================

@app.route(
    '/api/goals/<int:goal_id>',
    methods=['DELETE']
)
@login_required
def delete_goal(goal_id):

    user_id = session['user_id']


    goal = Goal.query.filter_by(
        id=goal_id,
        user_id=user_id
    ).first()


    if not goal:

        return jsonify({
            'error': 'Goal not found'
        }), 404


    # Because Goal has:
    #
    # cascade='all, delete-orphan'
    #
    # all daily-progress records belonging
    # to this goal will also be deleted.

    db.session.delete(goal)

    db.session.commit()


    return jsonify({
        'message':
            'Goal and daily progress deleted.'
    }), 200

VALID_EMOJIS = {'heart', 'star', 'hug'}


@app.route('/api/posts')
@login_required
def get_posts():
    """
    Returns all non-flagged posts, newest first.
    Passes current_user_id so to_dict() can mark which reactions
    this user has already made, and whether this is their own post.
    """
    user_id = session['user_id']

    posts = (CommunityPost.query
             .filter_by(is_flagged=False)
             .order_by(CommunityPost.created_at.desc())
             .limit(50)
             .all())

    return jsonify([p.to_dict(current_user_id=user_id) for p in posts]), 200


@app.route('/api/posts', methods=['POST'])
@login_required
def create_post():
    user_id = session['user_id']
    data    = request.get_json()
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': 'Post cannot be empty'}), 400
    if len(content) > 500:
        return jsonify({'error': 'Post must be under 500 characters'}), 400

    # Rate limit: max 3 posts per hour per student
    from datetime import timedelta
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_count = CommunityPost.query.filter(
        CommunityPost.user_id    == user_id,
        CommunityPost.created_at >= one_hour_ago
    ).count()

    if recent_count >= 3:
        return jsonify({
            'error': 'You can post up to 3 times per hour. Please wait a while.'
        }), 429

    post = CommunityPost(user_id=user_id, content=content)
    db.session.add(post)
    db.session.commit()

    return jsonify(post.to_dict(current_user_id=user_id)), 201


@app.route('/api/posts/<int:post_id>/react', methods=['POST'])
@login_required
def react_to_post(post_id):
    """
    Toggle a reaction on a post.
    If user already reacted with this emoji → remove it (toggle off).
    If not → add it.
    """
    user_id = session['user_id']
    data    = request.get_json()
    emoji   = data.get('emoji', '')

    if emoji not in VALID_EMOJIS:
        return jsonify({'error': 'Invalid emoji. Use heart, star, or hug.'}), 400

    post = CommunityPost.query.get(post_id)
    if not post or post.is_flagged:
        return jsonify({'error': 'Post not found'}), 404

    existing = Reaction.query.filter_by(
        post_id=post_id, user_id=user_id, emoji=emoji
    ).first()

    if existing:
        # Toggle off — remove the reaction
        db.session.delete(existing)
    else:
        # Add the reaction
        db.session.add(Reaction(post_id=post_id, user_id=user_id, emoji=emoji))

    db.session.commit()

    # Return updated post data
    db.session.refresh(post)
    return jsonify(post.to_dict(current_user_id=user_id)), 200


@app.route('/api/posts/<int:post_id>/flag', methods=['POST'])
@login_required
def flag_post(post_id):
    """Mark a post as flagged — it disappears from the board."""
    post = CommunityPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    post.is_flagged = True
    db.session.commit()
    return jsonify({'message': 'Post flagged for review'}), 200


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    """Students can only delete their own posts."""
    user_id = session['user_id']
    post    = CommunityPost.query.filter_by(id=post_id, user_id=user_id).first()
    if not post:
        return jsonify({'error': 'Post not found or not yours'}), 404

    db.session.delete(post)
    db.session.commit()
    return jsonify({'message': 'Post deleted'}), 200

# ── GET /api/resources — return all resources ──────────────────
@app.route('/api/resources')
@login_required
def get_resources():
    category = request.args.get('category')   # optional filter
    search   = request.args.get('search', '').strip().lower()

    query = Resource.query.filter_by(is_active=True)
    if category and category != 'All':
        query = query.filter_by(category=category)
    if search:
        query = query.filter(
            Resource.title.ilike(f'%{search}%') |
            Resource.description.ilike(f'%{search}%')
        )

    resources = query.order_by(Resource.category, Resource.title).all()
    return jsonify([r.to_dict() for r in resources]), 200


# ============================================================
# COUNSELLOR — RESOURCE MANAGEMENT
# ============================================================

RESOURCE_CATEGORIES = [
    'Anxiety',
    'Sleep',
    'Stress',
    'Motivation',
    'Loneliness'
]


def _resource_payload(data):
    data = data or {}

    title = str(data.get('title', '')).strip()
    description = str(data.get('description', '')).strip()
    category = str(data.get('category', '')).strip()
    content = str(data.get('content', '') or '').strip()
    url = str(data.get('url', '') or '').strip()
    icon = str(data.get('icon', '') or '📄').strip()[:10]

    if not title:
        return None, 'Resource title is required.'
    if len(title) > 200:
        return None, 'Resource title must be 200 characters or fewer.'
    if not description:
        return None, 'Resource description is required.'
    if not category:
        return None, 'Resource category is required.'
    if category not in RESOURCE_CATEGORIES:
        return None, 'Invalid resource category.'
    if len(url) > 300:
        return None, 'Resource URL must be 300 characters or fewer.'

    if url and not re.match(r'^https?://', url, re.IGNORECASE):
        return None, 'URL must start with http:// or https://.'

    return {
        'title': title,
        'description': description,
        'category': category,
        'content': content or None,
        'url': url or None,
        'icon': icon or '📄'
    }, None


@app.route('/api/counsellor/resources', methods=['GET'])
@counsellor_required
def counsellor_get_resources():
    search = request.args.get('search', '').strip().lower()
    category = request.args.get('category', 'All').strip()
    status = request.args.get('status', 'all').strip().lower()

    query = Resource.query

    if category and category != 'All':
        query = query.filter_by(category=category)

    if status == 'active':
        query = query.filter_by(is_active=True)
    elif status == 'inactive':
        query = query.filter_by(is_active=False)

    if search:
        query = query.filter(
            Resource.title.ilike(f'%{search}%') |
            Resource.description.ilike(f'%{search}%') |
            Resource.content.ilike(f'%{search}%')
        )

    resources = query.order_by(
        Resource.created_at.desc(),
        Resource.title.asc()
    ).all()

    return jsonify({
        'success': True,
        'resources': [resource.to_dict() for resource in resources],
        'categories': RESOURCE_CATEGORIES,
        'total': len(resources)
    }), 200


@app.route('/api/counsellor/resources', methods=['POST'])
@counsellor_required
def counsellor_create_resource():
    data, error = _resource_payload(request.get_json())

    if error:
        return jsonify({'error': error}), 400

    existing = Resource.query.filter(
        db.func.lower(Resource.title) == data['title'].lower()
    ).first()

    if existing:
        return jsonify({'error': 'A resource with this title already exists.'}), 409

    resource = Resource(**data, is_active=True)
    db.session.add(resource)

    db.session.flush()

    create_system_log(
        action='CREATE_RESOURCE',
        description=f'Created resource "{resource.title}".',
        entity_type='Resource',
        entity_id=resource.id
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Resource created successfully.',
        'resource': resource.to_dict()
    }), 201


@app.route('/api/counsellor/resources/<int:resource_id>', methods=['PUT'])
@counsellor_required
def counsellor_update_resource(resource_id):
    resource = Resource.query.get(resource_id)

    if not resource:
        return jsonify({'error': 'Resource not found.'}), 404

    data, error = _resource_payload(request.get_json())

    if error:
        return jsonify({'error': error}), 400

    duplicate = Resource.query.filter(
        Resource.id != resource_id,
        db.func.lower(Resource.title) == data['title'].lower()
    ).first()

    if duplicate:
        return jsonify({'error': 'Another resource already uses this title.'}), 409

    for key, value in data.items():
        setattr(resource, key, value)

    create_system_log(
        action='UPDATE_RESOURCE',
        description=f'Updated resource "{resource.title}".',
        entity_type='Resource',
        entity_id=resource.id
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Resource updated successfully.',
        'resource': resource.to_dict()
    }), 200


@app.route('/api/counsellor/resources/<int:resource_id>/status', methods=['PATCH'])
@counsellor_required
def counsellor_toggle_resource_status(resource_id):
    resource = Resource.query.get(resource_id)

    if not resource:
        return jsonify({'error': 'Resource not found.'}), 404

    data = request.get_json() or {}
    if 'is_active' not in data or not isinstance(data['is_active'], bool):
        return jsonify({'error': 'is_active must be true or false.'}), 400

    resource.is_active = data['is_active']

    create_system_log(
        action='TOGGLE_RESOURCE_STATUS',
        description=(
            f'Changed resource "{resource.title}" '
            f'to {"active" if resource.is_active else "inactive"}.'
        ),
        entity_type='Resource',
        entity_id=resource.id
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': (
            'Resource activated successfully.'
            if resource.is_active
            else 'Resource deactivated successfully.'
        ),
        'resource': resource.to_dict()
    }), 200


@app.route('/api/counsellor/resources/<int:resource_id>', methods=['DELETE'])
@counsellor_required
def counsellor_delete_resource(resource_id):
    resource = Resource.query.get(resource_id)

    if not resource:
        return jsonify({'error': 'Resource not found.'}), 404

    resource_title = resource.title

    db.session.delete(resource)

    create_system_log(
        action='DELETE_RESOURCE',
        description=f'Deleted resource "{resource_title}".',
        entity_type='Resource',
        entity_id=resource_id
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Resource deleted successfully.'
    }), 200


# ── GET /api/resources/recommended — personalize resources from latest check-in ──
@app.route('/api/resources/recommended', methods=['GET'])
@login_required
def get_recommended_resources():
    try:
        user_id = session['user_id']

        latest = (
            CheckIn.query
            .filter_by(user_id=user_id)
            .order_by(CheckIn.checkin_date.desc(), CheckIn.id.desc())
            .first()
        )

        if not latest:
            return jsonify({
                'success': True,
                'has_checkin': False,
                'message': 'Complete a wellbeing check-in to receive personalized resources.',
                'risk_result': None,
                'checkin_date': None,
                'recommendations': []
            }), 200

        risk = str(latest.risk_result or '').strip().lower()

        # Base category priorities come from the student's latest AI risk result.
        # These are wellness-resource recommendations, not a diagnosis.
        if risk in ['high', 'poor']:
            category_priority = {
                'Stress': 5,
                'Anxiety': 5,
                'Sleep': 4,
                'Loneliness': 3,
                'Motivation': 2
            }
            risk_label = 'High'
        elif risk in ['medium', 'moderate']:
            category_priority = {
                'Stress': 5,
                'Sleep': 4,
                'Anxiety': 4,
                'Loneliness': 3,
                'Motivation': 3
            }
            risk_label = 'Medium'
        else:
            category_priority = {
                'Motivation': 5,
                'Sleep': 4,
                'Loneliness': 4,
                'Stress': 2,
                'Anxiety': 2
            }
            risk_label = 'Low'

        # Refine the recommendation using the student's latest check-in indicators.
        # The thresholds are used only to choose educational/wellness resources.
        try:
            if float(latest.stress_level) >= 7:
                category_priority['Stress'] += 4
                category_priority['Anxiety'] += 2
            if float(latest.sleep_hours) < 6:
                category_priority['Sleep'] += 5
            if float(latest.social_support) <= 3:
                category_priority['Loneliness'] += 4
            if float(latest.exam_pressure) >= 7:
                category_priority['Anxiety'] += 3
                category_priority['Stress'] += 2
            if float(latest.academic_performance) <= 3:
                category_priority['Motivation'] += 3
                category_priority['Stress'] += 1
        except (TypeError, ValueError):
            # If an older record contains an unexpected value, keep risk-based ranking.
            pass

        resources = Resource.query.filter_by(is_active=True).all()

        # Score each resource by category relevance, then keep a diverse set.
        scored = []
        for resource in resources:
            score = category_priority.get(resource.category, 0)
            title_text = f"{resource.title} {resource.description}".lower()

            # Small keyword bonuses make recommendations more specific without
            # requiring a database migration or changing the Resource table.
            if latest.sleep_hours is not None and float(latest.sleep_hours) < 6 and any(
                word in title_text for word in ['sleep', 'sleep hygiene', 'rest']
            ):
                score += 2
            if latest.stress_level is not None and float(latest.stress_level) >= 7 and any(
                word in title_text for word in ['stress', 'relax', 'breath', 'ground']
            ):
                score += 2
            if latest.exam_pressure is not None and float(latest.exam_pressure) >= 7 and any(
                word in title_text for word in ['exam', 'anxiety', 'stress']
            ):
                score += 2
            if latest.social_support is not None and float(latest.social_support) <= 3 and any(
                word in title_text for word in ['social', 'connection', 'loneliness', 'university']
            ):
                score += 2

            scored.append((score, resource))

        scored.sort(key=lambda item: (-item[0], item[1].title.lower()))

        # Prefer different categories so the student sees a useful mix.
        selected = []
        used_categories = set()
        for score, resource in scored:
            if score <= 0:
                continue
            if resource.category not in used_categories:
                selected.append(resource)
                used_categories.add(resource.category)
            if len(selected) >= 3:
                break

        # Fill remaining slots from the highest scoring resources.
        if len(selected) < 3:
            selected_ids = {r.id for r in selected}
            for score, resource in scored:
                if score <= 0 or resource.id in selected_ids:
                    continue
                selected.append(resource)
                selected_ids.add(resource.id)
                if len(selected) >= 3:
                    break

        return jsonify({
            'success': True,
            'has_checkin': True,
            'risk_result': risk_label,
            'checkin_date': (
                latest.checkin_date.isoformat()
                if latest.checkin_date else None
            ),
            'recommendations': [r.to_dict() for r in selected]
        }), 200

    except Exception as e:
        print('❌ Recommended resources error:', e)
        return jsonify({
            'success': False,
            'error': 'Failed to load personalized resources',
            'details': str(e)
        }), 500


# ============================================================
# RESOURCE MANAGEMENT — SCHEMA COMPATIBILITY
# ============================================================

def ensure_resource_active_column():
    """Add the is_active column to existing databases if needed."""
    try:
        inspector = inspect(db.engine)
        columns = {column['name'] for column in inspector.get_columns('resources')}

        if 'is_active' not in columns:
            db.session.execute(text(
                'ALTER TABLE resources ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE'
            ))
            db.session.commit()
            print('✅ Added resources.is_active column')
    except Exception as e:
        db.session.rollback()
        print('⚠️ Resource active-column migration skipped:', e)


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


# ── Add verified video resources without changing the existing DB schema ──
def seed_video_resources():
    videos = [
        {
            'title': 'The 5-4-3-2-1 Method: A Grounding Exercise',
            'icon': '🎥',
            'category': 'Anxiety',
            'description': 'A short guided grounding exercise that uses your five senses to bring attention back to the present moment.',
            'content': 'Follow along with the 5-4-3-2-1 grounding method. This educational video is provided as a supportive wellbeing resource.',
            'url': 'https://www.youtube.com/watch?v=30VMIEmA114'
        },
        {
            'title': '12-Minute Guided Meditation to Release Tension',
            'icon': '🎥',
            'category': 'Stress',
            'description': 'A guided meditation and breathing exercise designed to help release built-up tension and encourage a calmer moment.',
            'content': 'Set aside a quiet 12 minutes and follow the guided breathing and meditation practice.',
            'url': 'https://www.youtube.com/watch?v=CFKxKfVOODw'
        },
        {
            'title': 'Relaxing Wind Down Body Scan for Deep Sleep',
            'icon': '🎥',
            'category': 'Sleep',
            'description': 'A gentle body-scan practice from Headspace designed to help you wind down before sleep.',
            'content': 'Use this as a relaxing bedtime practice. It is an educational wellbeing resource, not a medical treatment.',
            'url': 'https://www.youtube.com/watch?v=3o9etQktCpI'
        },
    ]

    added = 0
    for item in videos:
        existing = Resource.query.filter_by(title=item['title']).first()
        if existing:
            continue
        db.session.add(Resource(**item))
        added += 1

    if added:
        db.session.commit()
        print(f"✅ Added {added} video resources")
    else:
        print('ℹ️ Video resources already exist')



# ============================================================
# COUNSELLOR — ANONYMOUS CAMPUS ANALYTICS
# ============================================================

@app.route('/api/counsellor/data', methods=['GET'])
@counsellor_required
def counsellor_dashboard_data():

    try:
        today = date.today()

        # ----------------------------------------------------
        # CURRENT WEEK
        # Monday → today
        # ----------------------------------------------------

        current_week_start = (
            today - timedelta(days=today.weekday())
        )

        current_week_checkins = CheckIn.query.filter(
            CheckIn.checkin_date >= current_week_start,
            CheckIn.checkin_date <= today
        ).all()

        # ----------------------------------------------------
        # RISK DISTRIBUTION
        # ----------------------------------------------------

        risk_counts = {
            'Good': 0,
            'Moderate': 0,
            'Poor': 0
        }

        for checkin in current_week_checkins:

            risk = str(
                checkin.risk_result or ''
            ).strip().lower()

            if risk in ['low', 'good']:
                risk_counts['Good'] += 1

            elif risk in ['medium', 'moderate']:
                risk_counts['Moderate'] += 1

            elif risk in ['high', 'poor']:
                risk_counts['Poor'] += 1

        total_current_week = sum(
            risk_counts.values()
        )

        # ----------------------------------------------------
        # PERCENTAGES
        # ----------------------------------------------------

        if total_current_week > 0:

            risk_percentages = {
                key: round(
                    (value / total_current_week) * 100,
                    1
                )
                for key, value in risk_counts.items()
            }

        else:

            risk_percentages = {
                'Good': 0,
                'Moderate': 0,
                'Poor': 0
            }

        # ----------------------------------------------------
        # LAST 8 WEEKS
        # ----------------------------------------------------

        eight_weeks_ago = (
            current_week_start - timedelta(days=49)
        )

        all_checkins = CheckIn.query.filter(
            CheckIn.checkin_date >= eight_weeks_ago,
            CheckIn.checkin_date <= today
        ).all()

        weekly_trend = []

        for week_index in range(8):

            week_start = (
                current_week_start
                - timedelta(days=(7 - week_index) * 7)
            )

            week_end = (
                week_start + timedelta(days=6)
            )

            week_checkins = [
                c for c in all_checkins
                if week_start <= c.checkin_date <= week_end
            ]

            good = 0
            moderate = 0
            poor = 0

            for checkin in week_checkins:

                risk = str(
                    checkin.risk_result or ''
                ).strip().lower()

                if risk in ['low', 'good']:
                    good += 1

                elif risk in ['medium', 'moderate']:
                    moderate += 1

                elif risk in ['high', 'poor']:
                    poor += 1

            weekly_trend.append({
                'week': f'Week {week_index + 1}',
                'start_date': week_start.isoformat(),
                'end_date': week_end.isoformat(),
                'good': good,
                'moderate': moderate,
                'poor': poor,
                'total': good + moderate + poor
            })

        # ----------------------------------------------------
        # APPOINTMENT ANALYTICS
        # ONLY FOR THE LOGGED-IN COUNSELLOR
        # ----------------------------------------------------

        counsellor_id = session['user_id']

        appointment_counts = {
            'pending': Appointment.query.filter_by(
                counsellor_id=counsellor_id,
                status='pending'
            ).count(),

            'confirmed': Appointment.query.filter_by(
                counsellor_id=counsellor_id,
                status='confirmed'
            ).count(),

            'completed': Appointment.query.filter_by(
                counsellor_id=counsellor_id,
                status='completed'
            ).count(),

            'rejected': Appointment.query.filter_by(
                counsellor_id=counsellor_id,
                status='rejected'
            ).count()
        }

        pending_appointments = appointment_counts['pending']

        # ----------------------------------------------------
        # SOS ALERTS THIS WEEK
        # ----------------------------------------------------

        week_sos_alerts = SOSAlert.query.filter(
            SOSAlert.created_at >= datetime.combine(
                current_week_start,
                datetime.min.time()
            )
        ).order_by(
            SOSAlert.created_at.desc()
        ).all()

        sos_alerts = [
            alert.to_dict()
            for alert in week_sos_alerts
        ]

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({
  
            'success': True,

            'summary': {
                'checkins_this_week':
                    total_current_week,

                'pending_appointments':
                    pending_appointments,

                'good_percentage':
                    risk_percentages['Good'],

                'sos_this_week':
                    len(sos_alerts)
            },

            'risk_distribution': [
                {
                    'name': 'Good',
                    'value': risk_counts['Good'],
                    'percentage':
                        risk_percentages['Good']
                },
                {
                    'name': 'Moderate',
                    'value': risk_counts['Moderate'],
                    'percentage':
                        risk_percentages['Moderate']
                },
                {
                    'name': 'Poor',
                    'value': risk_counts['Poor'],
                    'percentage':
                        risk_percentages['Poor']
                }
            ],

            'weekly_trend': weekly_trend,

            'appointments': appointment_counts,

            'sos_alerts': sos_alerts

        }), 200

    except Exception as e:

        print(
            '❌ Counsellor dashboard error:',
            e
        )

        return jsonify({
            'success': False,
            'error': 'Failed to load counsellor dashboard'
        }), 500


# ============================================================
# COUNSELLOR — APPOINTMENTS
# ============================================================

@app.route('/api/counsellor/appointments', methods=['GET'])
@counsellor_required
def counsellor_appointments():

    counsellor_id = session['user_id']

    appointments = (
        Appointment.query
        .filter_by(counsellor_id=counsellor_id)
        .order_by(
            Appointment.requested_date.asc(),
            Appointment.time_slot.asc()
        )
        .all()
    )

    result = []

    for appointment in appointments:

        student = User.query.get(
            appointment.student_id
        )

        result.append({

            'id':
                appointment.id,

            'student_name':
                student.name
                if student
                else 'Unknown student',

            'date':
                appointment.requested_date.isoformat(),

            'time_slot':
                appointment.time_slot,

            'status':
                appointment.status,

            'notes':
                appointment.notes or '',

            'created_at':
                appointment.created_at.isoformat()
                if appointment.created_at
                else None

        })

    return jsonify(result), 200

@app.route(
    '/api/counsellor/update_appointment',
    methods=['POST']
)
@counsellor_required
def update_counsellor_appointment():

    data = request.get_json() or {}

    appointment_id = data.get(
        'appointment_id'
    )

    new_status = data.get(
        'status'
    )

    if not appointment_id:
        return jsonify({
            'error': 'Appointment ID is required'
        }), 400


    allowed_statuses = [
        'confirmed',
        'rejected',
        'completed'
    ]

    if new_status not in allowed_statuses:

        return jsonify({
            'error':
                'Invalid appointment status'
        }), 400


    # --------------------------------------------------------
    # SECURITY:
    # Only find appointments belonging to
    # the currently logged-in counsellor.
    # --------------------------------------------------------

    counsellor_id = session['user_id']

    appointment = Appointment.query.filter_by(
        id=appointment_id,
        counsellor_id=counsellor_id
    ).first()


    if not appointment:

        return jsonify({
            'error':
                'Appointment not found or access denied'
        }), 404


    # --------------------------------------------------------
    # STATUS TRANSITION VALIDATION
    # --------------------------------------------------------

    if appointment.status == 'rejected':

        return jsonify({
            'error':
                'A rejected appointment cannot be updated.'
        }), 400


    if appointment.status == 'completed':

        return jsonify({
            'error':
                'A completed appointment cannot be updated.'
        }), 400


    if (
        new_status == 'completed'
        and appointment.status != 'confirmed'
    ):

        return jsonify({
            'error':
                'Only confirmed appointments can be completed.'
        }), 400


    if (
        new_status in ['confirmed', 'rejected']
        and appointment.status != 'pending'
    ):

        return jsonify({
            'error':
                'Only pending appointments can be confirmed or rejected.'
        }), 400


    # --------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------

    old_status = appointment.status

    appointment.status = new_status

    db.session.commit()


    # --------------------------------------------------------
    # EMAIL STUDENT
    # --------------------------------------------------------

    student = User.query.get(
        appointment.student_id
    )

    counsellor = User.query.get(
        appointment.counsellor_id
    )


    if student and student.email:

        try:

            if new_status == 'confirmed':

                subject = (
                    'MindEase — Appointment Confirmed'
                )

                body = f"""
Dear {student.name},

Your MindEase counselling appointment has
been confirmed.

Appointment details:

Counsellor : {counsellor.name if counsellor else 'Counsellor'}
Date       : {appointment.requested_date.strftime('%d %B %Y')}
Time       : {appointment.time_slot}
Status     : Confirmed

Please be available at the scheduled time.

— MindEase Student Wellbeing System
"""


            elif new_status == 'rejected':

                subject = (
                    'MindEase — Appointment Request Rejected'
                )

                body = f"""
Dear {student.name},

Your MindEase counselling appointment request
could not be confirmed.

Appointment details:

Counsellor : {counsellor.name if counsellor else 'Counsellor'}
Date       : {appointment.requested_date.strftime('%d %B %Y')}
Time       : {appointment.time_slot}
Status     : Rejected

Please return to MindEase and choose another
available appointment time.

— MindEase Student Wellbeing System
"""


            else:

                subject = (
                    'MindEase — Appointment Completed'
                )

                body = f"""
Dear {student.name},

Your MindEase counselling appointment has been
marked as completed.

Appointment details:

Counsellor : {counsellor.name if counsellor else 'Counsellor'}
Date       : {appointment.requested_date.strftime('%d %B %Y')}
Time       : {appointment.time_slot}
Status     : Completed

Thank you for using MindEase.

— MindEase Student Wellbeing System
"""


            msg = Message(
                subject=subject,
                recipients=[student.email],
                body=body
            )

            mail.send(msg)


        except Exception as e:

            # Email failure should not undo
            # the appointment status update.

            print(
                f'Appointment email error: {e}'
            )


    return jsonify({

        'success': True,

        'message':
            f'Appointment {new_status} successfully.',

        'appointment': {

            'id':
                appointment.id,

            'status':
                appointment.status

        }

    }), 200

# ============================================================
# COUNSELLOR — STUDENTS
# Returns students who have appointments with the
# currently logged-in counsellor.
# ============================================================

@app.route('/api/counsellor/students', methods=['GET'])
@counsellor_required
def counsellor_students():

    try:

        counsellor_id = session['user_id']

        # ----------------------------------------------------
        # Find all students who have appointments
        # with this counsellor.
        # ----------------------------------------------------

        appointments = (
            Appointment.query
            .filter_by(
                counsellor_id=counsellor_id
            )
            .order_by(
                Appointment.requested_date.desc(),
                Appointment.id.desc()
            )
            .all()
        )

        student_ids = []

        for appointment in appointments:

            if appointment.student_id not in student_ids:
                student_ids.append(
                    appointment.student_id
                )


        students = []

        for student_id in student_ids:

            student = User.query.get(student_id)

            if not student:
                continue

            # ------------------------------------------------
            # Latest check-in
            # ------------------------------------------------

            latest_checkin = (
                CheckIn.query
                .filter_by(
                    user_id=student.id
                )
                .order_by(
                    CheckIn.checkin_date.desc(),
                    CheckIn.id.desc()
                )
                .first()
            )


            # ------------------------------------------------
            # All check-ins for this student
            # ------------------------------------------------

            checkins = (
                CheckIn.query
                .filter_by(
                    user_id=student.id
                )
                .order_by(
                    CheckIn.checkin_date.desc(),
                    CheckIn.id.desc()
                )
                .all()
            )


            # ------------------------------------------------
            # Appointment information
            # ------------------------------------------------

            student_appointments = [
                a for a in appointments
                if a.student_id == student.id
            ]


            latest_appointment = (
                student_appointments[0]
                if student_appointments
                else None
            )


            students.append({

                'id':
                    student.id,

                'name':
                    student.name,

                'email':
                    student.email,

                'role':
                    student.role,

                'latest_risk':
                    latest_checkin.risk_result
                    if latest_checkin
                    else None,

                'last_checkin':
                    (
                        latest_checkin.checkin_date.isoformat()
                        if latest_checkin
                        and latest_checkin.checkin_date
                        else None
                    ),

                'checkin_count':
                    len(checkins),

                'appointment_count':
                    len(student_appointments),

                'latest_appointment_status':
                    (
                        latest_appointment.status
                        if latest_appointment
                        else None
                    ),

                'latest_appointment_date':
                    (
                        latest_appointment.requested_date.isoformat()
                        if latest_appointment
                        else None
                    )

            })


        return jsonify({

            'success': True,

            'count':
                len(students),

            'students':
                students

        }), 200


    except Exception as e:

        print(
            '❌ Counsellor students error:',
            e
        )

        return jsonify({

            'success': False,

            'error':
                'Failed to load students',

            'details':
                str(e)

        }), 500

    # ============================================================
# COUNSELLOR — INDIVIDUAL STUDENT PROGRESS
# ============================================================

@app.route(
    '/api/counsellor/students/<int:student_id>/progress',
    methods=['GET']
)
@counsellor_required
def counsellor_student_progress(student_id):

    try:

        counsellor_id = session['user_id']

        # ----------------------------------------------------
        # SECURITY CHECK
        #
        # The counsellor can only see a student if that
        # student has an appointment with this counsellor.
        # ----------------------------------------------------

        appointment_exists = (
            Appointment.query
            .filter_by(
                counsellor_id=counsellor_id,
                student_id=student_id
            )
            .first()
        )


        if not appointment_exists:

            return jsonify({

                'error':
                    'Student not found or access denied'

            }), 403


        # ----------------------------------------------------
        # STUDENT
        # ----------------------------------------------------

        student = User.query.get(student_id)


        if not student:

            return jsonify({

                'error':
                    'Student not found'

            }), 404


        # ----------------------------------------------------
        # CHECK-IN HISTORY
        # ----------------------------------------------------

        checkins = (
            CheckIn.query
            .filter_by(
                user_id=student_id
            )
            .order_by(
                CheckIn.checkin_date.desc(),
                CheckIn.id.desc()
            )
            .all()
        )


        checkin_history = []


        for checkin in checkins:

            checkin_history.append({

                'id':
                    checkin.id,

                'date':
                    (
                        checkin.checkin_date.isoformat()
                        if checkin.checkin_date
                        else None
                    ),

                'risk_result':
                    checkin.risk_result,

                'stress_level':
                    checkin.stress_level,

                'sleep_hours':
                    checkin.sleep_hours,

                'physical_activity':
                    checkin.physical_activity,

                'social_support':
                    checkin.social_support,

                'study_hours_per_day':
                    checkin.study_hours_per_day,

                'exam_pressure':
                    checkin.exam_pressure,

                'academic_performance':
                    checkin.academic_performance

            })


        # ----------------------------------------------------
        # APPOINTMENTS
        # ----------------------------------------------------

        appointments = (
            Appointment.query
            .filter_by(
                counsellor_id=counsellor_id,
                student_id=student_id
            )
            .order_by(
                Appointment.requested_date.desc(),
                Appointment.id.desc()
            )
            .all()
        )


        appointment_history = []


        for appointment in appointments:

            appointment_history.append({

                'id':
                    appointment.id,

                'date':
                    (
                        appointment.requested_date.isoformat()
                        if appointment.requested_date
                        else None
                    ),

                'time':
                    appointment.time_slot,

                'status':
                    appointment.status,

                'notes':
                    appointment.notes or ''

            })


        # ----------------------------------------------------
        # LATEST CHECK-IN
        # ----------------------------------------------------

        latest = (
            checkins[0]
            if checkins
            else None
        )


        return jsonify({

            'success': True,

            'student': {

                'id':
                    student.id,

                'name':
                    student.name,

                'email':
                    student.email

            },

            'latest_checkin': (

                {

                    'date':
                        latest.checkin_date.isoformat()
                        if latest.checkin_date
                        else None,

                    'risk_result':
                        latest.risk_result,

                    'stress_level':
                        latest.stress_level,

                    'sleep_hours':
                        latest.sleep_hours,

                    'physical_activity':
                        latest.physical_activity,

                    'social_support':
                        latest.social_support,

                    'academic_performance':
                        latest.academic_performance

                }

                if latest

                else None

            ),

            'checkins':
                checkin_history,

            'appointments':
                appointment_history

        }), 200


    except Exception as e:

        print(
            '❌ Student progress error:',
            e
        )

        return jsonify({

            'success': False,

            'error':
                'Failed to load student progress',

            'details':
                str(e)

        }), 500

    # ============================================================
# COUNSELLOR — ANONYMOUS PDF REPORT
# ============================================================

@app.route(
    '/api/counsellor/export_report',
    methods=['GET']
)
@counsellor_required
def counsellor_export_report():

    try:

        # ----------------------------------------------------
        # DATE RANGE
        # ----------------------------------------------------

        today = date.today()

        from_date_string = request.args.get(
            'from'
        )

        to_date_string = request.args.get(
            'to'
        )

        try:

            from_date = (
                datetime.strptime(
                    from_date_string,
                    '%Y-%m-%d'
                ).date()
                if from_date_string
                else today - timedelta(days=30)
            )

            to_date = (
                datetime.strptime(
                    to_date_string,
                    '%Y-%m-%d'
                ).date()
                if to_date_string
                else today
            )

        except ValueError:

            return jsonify({

                'error':
                    'Invalid date format. Use YYYY-MM-DD.'

            }), 400


        if from_date > to_date:

            return jsonify({

                'error':
                    'From date cannot be after To date.'

            }), 400


        # ----------------------------------------------------
        # CURRENT COUNSELLOR
        # ----------------------------------------------------

        counsellor_id = session['user_id']


        # ----------------------------------------------------
        # CHECK-INS
        #
        # These are campus-wide anonymous statistics.
        # No student names or IDs are included in the PDF.
        # ----------------------------------------------------

        checkins = (
            CheckIn.query
            .filter(
                CheckIn.checkin_date >= from_date,
                CheckIn.checkin_date <= to_date
            )
            .order_by(
                CheckIn.checkin_date.asc()
            )
            .all()
        )


        total_checkins = len(checkins)


        # ----------------------------------------------------
        # RISK DISTRIBUTION
        # ----------------------------------------------------

        risk_counts = {

            'Good': 0,

            'Moderate': 0,

            'Poor': 0

        }


        for checkin in checkins:

            risk = str(
                checkin.risk_result or ''
            ).strip().lower()


            if risk in [
                'low',
                'good'
            ]:

                risk_counts['Good'] += 1


            elif risk in [
                'medium',
                'moderate'
            ]:

                risk_counts['Moderate'] += 1


            elif risk in [
                'high',
                'poor'
            ]:

                risk_counts['Poor'] += 1


        if total_checkins > 0:

            risk_percentages = {

                key:
                    round(
                        (
                            value /
                            total_checkins
                        ) * 100,
                        1
                    )

                for key, value
                in risk_counts.items()

            }

        else:

            risk_percentages = {

                'Good': 0,

                'Moderate': 0,

                'Poor': 0

            }


        # ----------------------------------------------------
        # WEEKLY TREND
        # ----------------------------------------------------

        weekly_rows = []

        current_week_start = (
            from_date
            - timedelta(
                days=from_date.weekday()
            )
        )


        while current_week_start <= to_date:

            week_end = (
                current_week_start
                + timedelta(days=6)
            )


            week_checkins = [

                checkin

                for checkin in checkins

                if (
                    current_week_start
                    <= checkin.checkin_date
                    <= week_end
                )

            ]


            good = 0

            moderate = 0

            poor = 0


            for checkin in week_checkins:

                risk = str(
                    checkin.risk_result or ''
                ).strip().lower()


                if risk in [
                    'low',
                    'good'
                ]:

                    good += 1


                elif risk in [
                    'medium',
                    'moderate'
                ]:

                    moderate += 1


                elif risk in [
                    'high',
                    'poor'
                ]:

                    poor += 1


            weekly_rows.append({

                'start':
                    current_week_start,

                'end':
                    min(
                        week_end,
                        to_date
                    ),

                'good':
                    good,

                'moderate':
                    moderate,

                'poor':
                    poor,

                'total':
                    good + moderate + poor

            })


            current_week_start += (
                timedelta(days=7)
            )


        # ----------------------------------------------------
        # COUNSELLOR APPOINTMENTS
        #
        # Only appointments belonging to the logged-in
        # counsellor are included.
        # ----------------------------------------------------

        appointments = (
            Appointment.query
            .filter(
                Appointment.counsellor_id
                == counsellor_id,

                Appointment.requested_date
                >= from_date,

                Appointment.requested_date
                <= to_date
            )
            .all()
        )


        appointment_counts = {

            'pending': 0,

            'confirmed': 0,

            'completed': 0,

            'rejected': 0

        }


        for appointment in appointments:

            status = (
                appointment.status
                or 'pending'
            ).lower()


            if status in appointment_counts:

                appointment_counts[
                    status
                ] += 1


        # ----------------------------------------------------
        # ANONYMOUS SOS
        # ----------------------------------------------------

        sos_alerts = (
            SOSAlert.query
            .filter(
                SOSAlert.created_at >= datetime.combine(
                    from_date,
                    datetime.min.time()
                ),

                SOSAlert.created_at <= datetime.combine(
                    to_date,
                    datetime.max.time()
                )
            )
            .order_by(
                SOSAlert.created_at.asc()
            )
            .all()
        )


        total_sos = len(sos_alerts)


        # ----------------------------------------------------
        # PDF SETUP
        # ----------------------------------------------------

        buffer = BytesIO()


        document = SimpleDocTemplate(

            buffer,

            pagesize=A4,

            rightMargin=18 * mm,

            leftMargin=18 * mm,

            topMargin=18 * mm,

            bottomMargin=18 * mm

        )


        styles = getSampleStyleSheet()


        title_style = ParagraphStyle(

            'ReportTitle',

            parent=styles['Title'],

            alignment=TA_CENTER,

            fontSize=20,

            leading=24,

            textColor=colors.HexColor(
                '#34433A'
            ),

            spaceAfter=8

        )


        subtitle_style = ParagraphStyle(

            'ReportSubtitle',

            parent=styles['Normal'],

            alignment=TA_CENTER,

            fontSize=9,

            textColor=colors.HexColor(
                '#777777'
            ),

            spaceAfter=18

        )


        heading_style = ParagraphStyle(

            'ReportHeading',

            parent=styles['Heading2'],

            fontSize=13,

            leading=16,

            textColor=colors.HexColor(
                '#50645A'
            ),

            spaceBefore=14,

            spaceAfter=8

        )


        normal_style = ParagraphStyle(

            'ReportNormal',

            parent=styles['Normal'],

            fontSize=9,

            leading=13,

            textColor=colors.HexColor(
                '#555555'
            )

        )


        story = []


        # ----------------------------------------------------
        # TITLE
        # ----------------------------------------------------

        story.append(
            Paragraph(
                'MindEase Campus Wellbeing Report',
                title_style
            )
        )


        story.append(
            Paragraph(
                f'Anonymous statistical report<br/>'
                f'{from_date.strftime("%d %b %Y")} '
                f'— '
                f'{to_date.strftime("%d %b %Y")}',
                subtitle_style
            )
        )


        # ----------------------------------------------------
        # PRIVACY NOTICE
        # ----------------------------------------------------

        privacy_data = [[

            Paragraph(
                '<b>Privacy notice:</b> '
                'This report contains aggregated campus '
                'statistics only. Individual student names, '
                'emails, IDs and personal check-in records '
                'are not included.',
                normal_style
            )

        ]]


        privacy_table = Table(

            privacy_data,

            colWidths=[
                174 * mm
            ]

        )


        privacy_table.setStyle(
            TableStyle([

                (
                    'BACKGROUND',
                    (0, 0),
                    (-1, -1),
                    colors.HexColor(
                        '#E3F2FD'
                    )
                ),

                (
                    'BOX',
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor(
                        '#C8DCE8'
                    )
                ),

                (
                    'LEFTPADDING',
                    (0, 0),
                    (-1, -1),
                    10
                ),

                (
                    'RIGHTPADDING',
                    (0, 0),
                    (-1, -1),
                    10
                ),

                (
                    'TOPPADDING',
                    (0, 0),
                    (-1, -1),
                    8
                ),

                (
                    'BOTTOMPADDING',
                    (0, 0),
                    (-1, -1),
                    8
                )

            ])
        )


        story.append(
            privacy_table
        )


        # ----------------------------------------------------
        # SUMMARY
        # ----------------------------------------------------

        story.append(
            Paragraph(
                '1. Report Summary',
                heading_style
            )
        )


        summary_data = [

            [
                'Metric',
                'Value'
            ],

            [
                'Total check-ins',
                str(total_checkins)
            ],

            [
                'Good',
                f"{risk_percentages['Good']}%"
            ],

            [
                'Moderate',
                f"{risk_percentages['Moderate']}%"
            ],

            [
                'Poor',
                f"{risk_percentages['Poor']}%"
            ],

            [
                'SOS activations',
                str(total_sos)
            ]

        ]


        summary_table = Table(

            summary_data,

            colWidths=[
                105 * mm,
                69 * mm
            ]

        )


        summary_table.setStyle(
            TableStyle([

                (
                    'BACKGROUND',
                    (0, 0),
                    (-1, 0),
                    colors.HexColor(
                        '#DFF3E4'
                    )
                ),

                (
                    'TEXTCOLOR',
                    (0, 0),
                    (-1, 0),
                    colors.HexColor(
                        '#405746'
                    )
                ),

                (
                    'FONTNAME',
                    (0, 0),
                    (-1, 0),
                    'Helvetica-Bold'
                ),

                (
                    'GRID',
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor(
                        '#DDE3DF'
                    )
                ),

                (
                    'ROWBACKGROUNDS',
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor(
                            '#FAFCFA'
                        )
                    ]
                ),

                (
                    'FONTSIZE',
                    (0, 0),
                    (-1, -1),
                    9
                ),

                (
                    'LEFTPADDING',
                    (0, 0),
                    (-1, -1),
                    8
                ),

                (
                    'TOPPADDING',
                    (0, 0),
                    (-1, -1),
                    7
                ),

                (
                    'BOTTOMPADDING',
                    (0, 0),
                    (-1, -1),
                    7
                )

            ])
        )


        story.append(
            summary_table
        )


        # ----------------------------------------------------
        # RISK DISTRIBUTION
        # ----------------------------------------------------

        story.append(
            Paragraph(
                '2. Risk Distribution',
                heading_style
            )
        )


        risk_data = [

            [
                'Risk Level',
                'Number',
                'Percentage'
            ],

            [
                'Good',
                str(risk_counts['Good']),
                f"{risk_percentages['Good']}%"
            ],

            [
                'Moderate',
                str(risk_counts['Moderate']),
                f"{risk_percentages['Moderate']}%"
            ],

            [
                'Poor',
                str(risk_counts['Poor']),
                f"{risk_percentages['Poor']}%"
            ]

        ]


        risk_table = Table(

            risk_data,

            colWidths=[
                75 * mm,
                45 * mm,
                54 * mm
            ]

        )


        risk_table.setStyle(
            TableStyle([

                (
                    'BACKGROUND',
                    (0, 0),
                    (-1, 0),
                    colors.HexColor(
                        '#EEE8FF'
                    )
                ),

                (
                    'FONTNAME',
                    (0, 0),
                    (-1, 0),
                    'Helvetica-Bold'
                ),

                (
                    'GRID',
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor(
                        '#DDD8E6'
                    )
                ),

                (
                    'FONTSIZE',
                    (0, 0),
                    (-1, -1),
                    9
                ),

                (
                    'ALIGN',
                    (1, 1),
                    (-1, -1),
                    'CENTER'
                ),

                (
                    'LEFTPADDING',
                    (0, 0),
                    (-1, -1),
                    8
                ),

                (
                    'TOPPADDING',
                    (0, 0),
                    (-1, -1),
                    7
                ),

                (
                    'BOTTOMPADDING',
                    (0, 0),
                    (-1, -1),
                    7
                )

            ])
        )


        story.append(
            risk_table
        )


        # ----------------------------------------------------
        # WEEKLY TREND
        # ----------------------------------------------------

        story.append(
            Paragraph(
                '3. Weekly Wellbeing Trend',
                heading_style
            )
        )


        weekly_data = [

            [
                'Week',
                'Good',
                'Moderate',
                'Poor',
                'Total'
            ]

        ]


        for index, row in enumerate(
            weekly_rows,
            start=1
        ):

            weekly_data.append([

                (
                    f"{row['start'].strftime('%d %b')} "
                    f"– "
                    f"{row['end'].strftime('%d %b %Y')}"
                ),

                str(row['good']),

                str(row['moderate']),

                str(row['poor']),

                str(row['total'])

            ])


        weekly_table = Table(

            weekly_data,

            colWidths=[
                78 * mm,
                24 * mm,
                28 * mm,
                24 * mm,
                20 * mm
            ],

            repeatRows=1

        )


        weekly_table.setStyle(
            TableStyle([

                (
                    'BACKGROUND',
                    (0, 0),
                    (-1, 0),
                    colors.HexColor(
                        '#DFF3E4'
                    )
                ),

                (
                    'FONTNAME',
                    (0, 0),
                    (-1, 0),
                    'Helvetica-Bold'
                ),

                (
                    'GRID',
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor(
                        '#DDE3DF'
                    )
                ),

                (
                    'ALIGN',
                    (1, 1),
                    (-1, -1),
                    'CENTER'
                ),

                (
                    'FONTSIZE',
                    (0, 0),
                    (-1, -1),
                    8
                ),

                (
                    'TOPPADDING',
                    (0, 0),
                    (-1, -1),
                    6
                ),

                (
                    'BOTTOMPADDING',
                    (0, 0),
                    (-1, -1),
                    6
                )

            ])
        )


        story.append(
            weekly_table
        )


        # ----------------------------------------------------
        # APPOINTMENTS
        # ----------------------------------------------------

        story.append(
            Paragraph(
                '4. Counselling Appointment Statistics',
                heading_style
            )
        )


        appointment_data = [

            [
                'Status',
                'Number'
            ],

            [
                'Pending',
                str(
                    appointment_counts[
                        'pending'
                    ]
                )
            ],

            [
                'Confirmed',
                str(
                    appointment_counts[
                        'confirmed'
                    ]
                )
            ],

            [
                'Completed',
                str(
                    appointment_counts[
                        'completed'
                    ]
                )
            ],

            [
                'Rejected',
                str(
                    appointment_counts[
                        'rejected'
                    ]
                )
            ]

        ]


        appointment_table = Table(

            appointment_data,

            colWidths=[
                110 * mm,
                64 * mm
            ]

        )


        appointment_table.setStyle(
            TableStyle([

                (
                    'BACKGROUND',
                    (0, 0),
                    (-1, 0),
                    colors.HexColor(
                        '#EEE8FF'
                    )
                ),

                (
                    'FONTNAME',
                    (0, 0),
                    (-1, 0),
                    'Helvetica-Bold'
                ),

                (
                    'GRID',
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor(
                        '#DDD8E6'
                    )
                ),

                (
                    'ALIGN',
                    (1, 1),
                    (-1, -1),
                    'CENTER'
                ),

                (
                    'FONTSIZE',
                    (0, 0),
                    (-1, -1),
                    9
                ),

                (
                    'TOPPADDING',
                    (0, 0),
                    (-1, -1),
                    7
                ),

                (
                    'BOTTOMPADDING',
                    (0, 0),
                    (-1, -1),
                    7
                )

            ])
        )


        story.append(
            appointment_table
        )


        # ----------------------------------------------------
        # SOS
        # ----------------------------------------------------

        story.append(
            Paragraph(
                '5. SOS Activity',
                heading_style
            )
        )


        story.append(
            Paragraph(
                f'Total anonymous SOS activations '
                f'during the selected period: '
                f'<b>{total_sos}</b>',
                normal_style
            )
        )


        if sos_alerts:

            sos_rows = [

                [
                    'Date',
                    'Time'
                ]

            ]


            for alert in sos_alerts:

                alert_time = (
                    alert.created_at
                )

                sos_rows.append([

                    alert_time.strftime(
                        '%d %b %Y'
                    ),

                    alert_time.strftime(
                        '%H:%M'
                    )

                ])


            sos_table = Table(

                sos_rows,

                colWidths=[
                    90 * mm,
                    84 * mm
                ],

                repeatRows=1

            )


            sos_table.setStyle(
                TableStyle([

                    (
                        'BACKGROUND',
                        (0, 0),
                        (-1, 0),
                        colors.HexColor(
                            '#FFF4C2'
                        )
                    ),

                    (
                        'FONTNAME',
                        (0, 0),
                        (-1, 0),
                        'Helvetica-Bold'
                    ),

                    (
                        'GRID',
                        (0, 0),
                        (-1, -1),
                        0.4,
                        colors.HexColor(
                            '#E4D9A7'
                        )
                    ),

                    (
                        'FONTSIZE',
                        (0, 0),
                        (-1, -1),
                        8
                    ),

                    (
                        'TOPPADDING',
                        (0, 0),
                        (-1, -1),
                        6
                    ),

                    (
                        'BOTTOMPADDING',
                        (0, 0),
                        (-1, -1),
                        6
                    )

                ])
            )


            story.append(
                Spacer(
                    1,
                    8
                )
            )


            story.append(
                sos_table
            )


        else:

            story.append(
                Paragraph(
                    'No SOS activations were recorded '
                    'during the selected period.',
                    normal_style
                )
            )


        # ----------------------------------------------------
        # FOOTER NOTE
        # ----------------------------------------------------

        story.append(
            Spacer(
                1,
                18
            )
        )


        story.append(
            Paragraph(
                'Generated by MindEase — '
                'University Student Wellbeing System',
                subtitle_style
            )
        )


        document.build(
            story
        )


        buffer.seek(0)


        filename = (
            f'MindEase_Wellbeing_Report_'
            f'{from_date.isoformat()}_'
            f'{to_date.isoformat()}.pdf'
        )


        return send_file(

            buffer,

            mimetype='application/pdf',

            as_attachment=True,

            download_name=filename

        )


    except Exception as e:

        print(
            '❌ Counsellor PDF report error:',
            e
        )

        return jsonify({

            'success': False,

            'error':
                'Failed to generate PDF report',

            'details':
                str(e)

        }), 500

# ============================================================
# COUNSELLOR — COMMUNITY BOARD MODERATION
# ============================================================

@app.route('/api/counsellor/community/moderation', methods=['GET'])
@counsellor_required
def counsellor_get_flagged_posts():
    """
    Return all posts that have been flagged by students.

    Important privacy rule:
    - Counsellors can review the content.
    - Student identity is NOT exposed to the frontend.
    - The internal user_id is only used when sending
      a moderation notification.
    """

    try:
        flagged_posts = (
            CommunityPost.query
            .filter_by(is_flagged=True)
            .order_by(CommunityPost.created_at.desc())
            .all()
        )

        result = []

        for post in flagged_posts:
            result.append({
                'id': post.id,

                # Keep the student anonymous in the UI
                'author': 'Anonymous Student',

                'content': post.content,

                'created_at': (
                    post.created_at.isoformat()
                    if post.created_at
                    else None
                ),

                'status': 'pending'
            })

        return jsonify({
            'success': True,
            'count': len(result),
            'posts': result
        }), 200

    except Exception as e:

        print(
            '❌ Community moderation load error:',
            e
        )

        return jsonify({
            'success': False,
            'error': 'Failed to load flagged community posts'
        }), 500


# ============================================================
# COUNSELLOR — RESTORE FLAGGED POST
# ============================================================

@app.route(
    '/api/counsellor/community/<int:post_id>/restore',
    methods=['PATCH']
)
@counsellor_required
def counsellor_restore_post(post_id):

    try:

        post = CommunityPost.query.filter_by(
            id=post_id,
            is_flagged=True
        ).first()

        if not post:
            return jsonify({
                'error': 'Flagged post not found'
            }), 404

        # Make the post visible on the community board again
        post.is_flagged = False

        create_system_log(
            action='RESTORE_COMMUNITY_POST',
            description='Restored a flagged anonymous community post.',
            entity_type='CommunityPost',
            entity_id=post.id
        )

        # Save notification before committing
        notification = Notification(
            user_id=post.user_id,
            title='Community post reviewed',
            message=(
                'Your community post has been reviewed '
                'by a counsellor and restored to the '
                'community board.'
            ),
            notification_type='community_moderation',
            is_read=False
        )

        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Post restored successfully'
        }), 200

    except Exception as e:

        db.session.rollback()

        print(
            '❌ Community post restore error:',
            e
        )

        return jsonify({
            'success': False,
            'error': 'Failed to restore post'
        }), 500


# ============================================================
# COUNSELLOR — REMOVE COMMUNITY POST
# ============================================================

@app.route(
    '/api/counsellor/community/<int:post_id>/remove',
    methods=['DELETE']
)
@counsellor_required
def counsellor_remove_post(post_id):

    try:

        post = CommunityPost.query.filter_by(
            id=post_id,
            is_flagged=True
        ).first()

        if not post:
            return jsonify({
                'error': 'Flagged post not found'
            }), 404

        # Save the student ID before deleting the post
        student_id = post.user_id

        # Notify the student before deleting the post
        notification = Notification(
            user_id=student_id,
            title='Community post reviewed',
            message=(
                'Your community post has been reviewed '
                'by a counsellor and removed because it '
                'did not meet the community guidelines.'
            ),
            notification_type='community_moderation',
            is_read=False
        )

        db.session.add(notification)

        # Record moderation metadata before deleting the post.
        create_system_log(
            action='REMOVE_COMMUNITY_POST',
            description='Removed a flagged anonymous community post.',
            entity_type='CommunityPost',
            entity_id=post.id
        )

        # Delete the inappropriate post
        db.session.delete(post)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Post removed successfully'
        }), 200

    except Exception as e:

        db.session.rollback()

        print(
            '❌ Community post removal error:',
            e
        )

        return jsonify({
            'success': False,
            'error': 'Failed to remove post'
        }), 500            


    

@app.route('/api/register', methods=['POST'])
def register():
    data  = request.get_json()          # React sends JSON body
    name  = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'student')

# Public registration can only create
# student or counsellor accounts.
    if role not in ['student', 'counsellor']:
        return jsonify({
        'error': 'Invalid registration role'
    }), 400

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

    create_system_log(
        action='LOGIN',
        description='User logged into MindEase.',
        entity_type='User',
        entity_id=user.id,
        user_id=user.id,
        user_role=user.role
    )
    db.session.commit()

    # ── Send user info back to React ──────────────────────────────
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id':   user.id,
            'name': user.name,
            'role': user.role,
        }
    }), 200

# ============================================================
# FORGOT PASSWORD
# ============================================================

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():

    try:

        data = request.get_json() or {}

        email = (
            data.get('email', '')
            .strip()
            .lower()
        )

        if not email:

            return jsonify({
                'error': 'Email address is required'
            }), 400

        user = User.query.filter_by(
            email=email
        ).first()

        # Security-friendly response:
        # do not reveal whether the email exists.
        if not user:

            return jsonify({
                'message':
                    'If an account exists for this email, '
                    'a password reset link has been sent.'
            }), 200

        serializer = get_password_reset_serializer()

        token = serializer.dumps(
            {
                'user_id': user.id,
                'email': user.email
            },
            salt='mindease-password-reset'
        )

        reset_link = (
            'http://localhost:3000/reset-password'
            '?token='
            + token
        )

        email_body = f"""
Hello {user.name},

We received a request to reset your MindEase password.

Open the following link to create a new password:

{reset_link}

This reset link expires after 30 minutes.

If you did not request a password reset, you can safely ignore this email.

Regards,
MindEase Student Wellbeing System
"""

        msg = Message(
            subject='MindEase — Password Reset',
            recipients=[user.email],
            body=email_body
        )

        mail.send(msg)

        return jsonify({
            'message':
                'If an account exists for this email, '
                'a password reset link has been sent.'
        }), 200

    except Exception as e:

        print('❌ Forgot password error:', e)

        return jsonify({
            'error':
                'Unable to process the password reset request'
        }), 500

    # ============================================================
# RESET PASSWORD
# ============================================================

@app.route('/api/reset-password', methods=['POST'])
def reset_password():

    try:

        data = request.get_json() or {}

        token = data.get('token', '')
        new_password = data.get('password', '')

        if not token:

            return jsonify({
                'error': 'Reset token is required'
            }), 400

        if len(new_password) < 6:

            return jsonify({
                'error':
                    'Password must be at least 6 characters'
            }), 400

        serializer = get_password_reset_serializer()

        try:

            payload = serializer.loads(
                token,
                salt='mindease-password-reset',
                max_age=1800
            )

        except SignatureExpired:

            return jsonify({
                'error':
                    'This password reset link has expired'
            }), 400

        except BadSignature:

            return jsonify({
                'error':
                    'Invalid password reset link'
            }), 400

        user_id = payload.get('user_id')
        email = payload.get('email')

        user = User.query.filter_by(
            id=user_id,
            email=email
        ).first()

        if not user:

            return jsonify({
                'error':
                    'Unable to reset password'
            }), 400

        hashed_password = bcrypt.hashpw(
            new_password.encode('utf-8'),
            bcrypt.gensalt()
        )

        user.password = hashed_password.decode('utf-8')

        db.session.commit()

        return jsonify({
            'message':
                'Password reset successfully. '
                'You can now sign in with your new password.'
        }), 200

    except Exception as e:

        db.session.rollback()

        print('❌ Reset password error:', e)

        return jsonify({
            'error':
                'Unable to reset password'
        }), 500

    
@app.route('/api/logout', methods=['POST'])
def logout():
    user_id = session.get('user_id')
    user_role = session.get('user_role')

    if user_id:
        create_system_log(
            action='LOGOUT',
            description='User logged out of MindEase.',
            entity_type='User',
            entity_id=user_id,
            user_id=user_id,
            user_role=user_role
        )
        db.session.commit()

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

 # ════════════════════════════════════════════════════════════

# ============================================================
# STUDENT PROFILE
# ============================================================

@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():

    user_id = session.get('user_id')

    user = User.query.get(user_id)

    if not user:
        return jsonify({
            'success': False,
            'error': 'User not found'
        }), 404

    return jsonify({
        'success': True,

        'profile': {
            'id': user.id,

            'name': user.name,

            'email': user.email,

            'role': user.role,

            'is_approved': user.is_approved,

            'created_at': (
                user.created_at.isoformat()
                if user.created_at
                else None
            )
        }

    }), 200


# ============================================================
# UPDATE STUDENT PROFILE
# ============================================================

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():

    try:

        # ------------------------------------------------------
        # GET LOGGED-IN USER
        # ------------------------------------------------------

        user_id = session.get('user_id')

        user = User.query.get(user_id)


        if not user:

            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404


        # ------------------------------------------------------
        # GET REQUEST DATA
        # ------------------------------------------------------

        data = request.get_json() or {}


        name = str(
            data.get('name', '')
        ).strip()


        email = str(
            data.get('email', '')
        ).strip().lower()


        # ------------------------------------------------------
        # VALIDATION
        # ------------------------------------------------------

        if not name:

            return jsonify({
                'success': False,
                'error': 'Name is required'
            }), 400


        if not email:

            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400


        if len(name) > 100:

            return jsonify({
                'success': False,
                'error': (
                    'Name must be 100 characters or less'
                )
            }), 400


        if len(email) > 150:

            return jsonify({
                'success': False,
                'error': (
                    'Email must be 150 characters or less'
                )
            }), 400


        # ------------------------------------------------------
        # BASIC EMAIL VALIDATION
        # ------------------------------------------------------

        email_pattern = (
            r'^[A-Za-z0-9._%+-]+'
            r'@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        )


        if not re.match(email_pattern, email):

            return jsonify({
                'success': False,
                'error': 'Please enter a valid email address'
            }), 400


        # ------------------------------------------------------
        # CHECK EMAIL ALREADY EXISTS
        # ------------------------------------------------------

        existing_user = User.query.filter(
            User.email == email,
            User.id != user.id
        ).first()


        if existing_user:

            return jsonify({
                'success': False,
                'error': (
                    'This email is already being used'
                )
            }), 409


        # ------------------------------------------------------
        # UPDATE USER
        # ------------------------------------------------------

        user.name = name

        user.email = email


        db.session.commit()


        # ------------------------------------------------------
        # UPDATE FLASK SESSION
        # ------------------------------------------------------

        session['user_name'] = user.name


        # ------------------------------------------------------
        # RESPONSE
        # ------------------------------------------------------

        return jsonify({

            'success': True,

            'message': (
                'Profile updated successfully'
            ),

            'profile': {

                'id': user.id,

                'name': user.name,

                'email': user.email,

                'role': user.role,

                'is_approved': user.is_approved,

                'created_at': (
                    user.created_at.isoformat()
                    if user.created_at
                    else None
                )

            }

        }), 200


    except Exception as e:

        # ------------------------------------------------------
        # DATABASE ROLLBACK
        # ------------------------------------------------------

        db.session.rollback()


        print(
            '❌ Profile update error:',
            e
        )


        return jsonify({

            'success': False,

            'error': (
                'Failed to update profile'
            ),

            'details': str(e)

        }), 500

# ════════════════════════════════════════════════════════════
# ADMIN — EXERCISE CONTENT MANAGEMENT
# ════════════════════════════════════════════════════════════

@app.route('/api/admin/exercises', methods=['GET'])
@admin_required
def admin_get_exercises():
    query = Exercise.query

    search = (request.args.get('search') or '').strip()
    category = (request.args.get('category') or '').strip()
    status = (request.args.get('status') or '').strip().lower()

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                Exercise.title.ilike(like),
                Exercise.description.ilike(like),
                Exercise.instructions.ilike(like)
            )
        )

    if category and category != 'all':
        query = query.filter_by(category=category)

    if status == 'active':
        query = query.filter_by(is_active=True)
    elif status == 'inactive':
        query = query.filter_by(is_active=False)

    exercises = query.order_by(Exercise.created_at.desc()).all()

    return jsonify([exercise.to_dict() for exercise in exercises]), 200


@app.route('/api/admin/exercises', methods=['POST'])
@admin_required
def admin_create_exercise():
    data = request.get_json() or {}

    title = str(data.get('title', '')).strip()
    description = str(data.get('description', '')).strip()
    category = str(data.get('category', '')).strip()
    instructions = str(data.get('instructions', '')).strip()

    if not title or not description or not category or not instructions:
        return jsonify({
            'error': 'Title, description, category and instructions are required'
        }), 400

    exercise = Exercise(
        title=title[:200],
        description=description,
        category=category[:60],
        duration=str(data.get('duration', '')).strip()[:50] or None,
        instructions=instructions,
        icon=str(data.get('icon', '🧘')).strip()[:10] or '🧘',
        media_url=str(data.get('media_url', '')).strip()[:500] or None,
        is_active=bool(data.get('is_active', True))
    )

    db.session.add(exercise)

    create_system_log(
        action='CREATE_EXERCISE',
        description=f'Created exercise "{exercise.title}".',
        entity_type='Exercise',
        entity_id=exercise.id
    )

    db.session.commit()

    return jsonify({
        'message': 'Exercise created successfully',
        'exercise': exercise.to_dict()
    }), 201


@app.route('/api/admin/exercises/<int:exercise_id>', methods=['PUT'])
@admin_required
def admin_update_exercise(exercise_id):
    exercise = Exercise.query.get(exercise_id)

    if not exercise:
        return jsonify({'error': 'Exercise not found'}), 404

    data = request.get_json() or {}

    title = str(data.get('title', exercise.title)).strip()
    description = str(data.get('description', exercise.description)).strip()
    category = str(data.get('category', exercise.category)).strip()
    instructions = str(data.get('instructions', exercise.instructions)).strip()

    if not title or not description or not category or not instructions:
        return jsonify({
            'error': 'Title, description, category and instructions are required'
        }), 400

    exercise.title = title[:200]
    exercise.description = description
    exercise.category = category[:60]
    exercise.duration = str(data.get('duration', exercise.duration or '')).strip()[:50] or None
    exercise.instructions = instructions
    exercise.icon = str(data.get('icon', exercise.icon or '🧘')).strip()[:10] or '🧘'
    exercise.media_url = str(data.get('media_url', exercise.media_url or '')).strip()[:500] or None

    if 'is_active' in data:
        exercise.is_active = bool(data['is_active'])

    create_system_log(
        action='UPDATE_EXERCISE',
        description=f'Updated exercise "{exercise.title}".',
        entity_type='Exercise',
        entity_id=exercise.id
    )

    db.session.commit()

    return jsonify({
        'message': 'Exercise updated successfully',
        'exercise': exercise.to_dict()
    }), 200


@app.route('/api/admin/exercises/<int:exercise_id>/status', methods=['PATCH'])
@admin_required
def admin_toggle_exercise(exercise_id):
    exercise = Exercise.query.get(exercise_id)

    if not exercise:
        return jsonify({'error': 'Exercise not found'}), 404

    data = request.get_json() or {}
    if 'is_active' in data:
        exercise.is_active = bool(data['is_active'])
    else:
        exercise.is_active = not exercise.is_active

    create_system_log(
        action='TOGGLE_EXERCISE_STATUS',
        description=(
            f'Changed exercise "{exercise.title}" '
            f'to {"active" if exercise.is_active else "inactive"}.'
        ),
        entity_type='Exercise',
        entity_id=exercise.id
    )

    db.session.commit()

    return jsonify({
        'message': 'Exercise status updated successfully',
        'exercise': exercise.to_dict()
    }), 200


@app.route('/api/admin/exercises/<int:exercise_id>', methods=['DELETE'])
@admin_required
def admin_delete_exercise(exercise_id):
    exercise = Exercise.query.get(exercise_id)

    if not exercise:
        return jsonify({'error': 'Exercise not found'}), 404

    exercise_title = exercise.title

    db.session.delete(exercise)

    create_system_log(
        action='DELETE_EXERCISE',
        description=f'Deleted exercise "{exercise_title}".',
        entity_type='Exercise',
        entity_id=exercise_id
    )

    db.session.commit()

    return jsonify({
        'message': 'Exercise deleted successfully'
    }), 200


@app.route('/api/exercises', methods=['GET'])
@login_required
def get_active_exercises():
    exercises = (
        Exercise.query
        .filter_by(is_active=True)
        .order_by(Exercise.created_at.desc())
        .all()
    )

    return jsonify([exercise.to_dict() for exercise in exercises]), 200



# ════════════════════════════════════════════════════════════
# ADMIN — CREATE NEW ADMINISTRATOR
# ════════════════════════════════════════════════════════════

@app.route('/api/admin/admins', methods=['POST'])
@admin_required
def admin_create_admin():
    """
    Create a new administrator account.

    This endpoint is intentionally separate from public registration.
    Only an already authenticated administrator can create another admin.
    """
    try:
        data = request.get_json() or {}

        name = str(data.get('name', '')).strip()
        email = str(data.get('email', '')).strip().lower()
        password = str(data.get('password', ''))

        # --------------------------------------------------------
        # Validation
        # --------------------------------------------------------
        if not name or not email or not password:
            return jsonify({
                'error': 'Name, email and password are required'
            }), 400

        if len(name) > 100:
            return jsonify({
                'error': 'Name must be 100 characters or less'
            }), 400

        if len(email) > 150:
            return jsonify({
                'error': 'Email must be 150 characters or less'
            }), 400

        if len(password) < 6:
            return jsonify({
                'error': 'Password must be at least 6 characters'
            }), 400

        # Basic email validation
        email_pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'

        if not re.match(email_pattern, email):
            return jsonify({
                'error': 'Please enter a valid email address'
            }), 400

        # --------------------------------------------------------
        # Prevent duplicate accounts
        # --------------------------------------------------------
        existing = User.query.filter_by(email=email).first()

        if existing:
            return jsonify({
                'error': 'An account with this email already exists'
            }), 409

        # --------------------------------------------------------
        # Use the SAME bcrypt approach as public registration.
        # --------------------------------------------------------
        hashed = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        )

        # --------------------------------------------------------
        # Create administrator account
        # --------------------------------------------------------
        new_admin = User(
            name=name,
            email=email,
            password=hashed.decode('utf-8'),
            role='admin',
            is_approved=True
        )

        db.session.add(new_admin)
        db.session.commit()

        # --------------------------------------------------------
        # Add an audit entry after the user has an ID.
        # Do not store the password in the log.
        # --------------------------------------------------------
        try:
            create_system_log(
                action='CREATE_ADMIN',
                description=f'Created administrator account for "{new_admin.email}".',
                entity_type='User',
                entity_id=new_admin.id
            )
            db.session.commit()
        except Exception as log_error:
            # The admin was already created successfully.
            # Do not undo account creation just because logging failed.
            db.session.rollback()
            print('⚠️ Create-admin audit log error:', log_error)

        return jsonify({
            'success': True,
            'message': 'New administrator created successfully',
            'admin': {
                'id': new_admin.id,
                'name': new_admin.name,
                'email': new_admin.email,
                'role': new_admin.role,
                'is_approved': bool(new_admin.is_approved),
                'created_at': (
                    new_admin.created_at.isoformat()
                    if new_admin.created_at else None
                )
            }
        }), 201

    except Exception as e:
        db.session.rollback()

        print('❌ Create admin error:', e)

        return jsonify({
            'success': False,
            'error': 'Failed to create administrator',
            'details': str(e)
        }), 500


# ════════════════════════════════════════════════════════════
# ADMIN — SYSTEM LOGS
# ════════════════════════════════════════════════════════════

@app.route('/api/admin/system-logs', methods=['GET'])
@admin_required
def admin_get_system_logs():
    """
    Return non-sensitive audit metadata for administrators.

    Supports:
      ?search=
      ?action=
      ?role=
      ?limit=50
    """

    try:
        search = (request.args.get('search') or '').strip()
        action = (request.args.get('action') or '').strip()
        role = (request.args.get('role') or '').strip()
        limit = request.args.get('limit', '100')

        try:
            limit = max(1, min(int(limit), 250))
        except ValueError:
            limit = 100

        query = SystemLog.query

        if action and action != 'all':
            query = query.filter_by(action=action)

        if role and role != 'all':
            query = query.filter_by(user_role=role)

        if search:
            like = f'%{search}%'
            query = query.filter(
                db.or_(
                    SystemLog.action.ilike(like),
                    SystemLog.description.ilike(like),
                    SystemLog.entity_type.ilike(like),
                    SystemLog.ip_address.ilike(like)
                )
            )

        logs = (
            query
            .order_by(SystemLog.created_at.desc())
            .limit(limit)
            .all()
        )

        actions = [
            row[0]
            for row in (
                db.session.query(SystemLog.action)
                .filter(SystemLog.action.isnot(None))
                .distinct()
                .order_by(SystemLog.action.asc())
                .all()
            )
        ]

        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs],
            'actions': actions,
            'count': len(logs)
        }), 200

    except Exception as e:
        print('❌ Admin system logs error:', e)

        return jsonify({
            'success': False,
            'error': 'Failed to load system logs'
        }), 500


@app.route('/api/admin/system-logs/summary', methods=['GET'])
@admin_required
def admin_system_logs_summary():
    try:
        total = SystemLog.query.count()

        today_start = datetime.combine(
            date.today(),
            datetime.min.time()
        )

        today_count = (
            SystemLog.query
            .filter(SystemLog.created_at >= today_start)
            .count()
        )

        admin_count = (
            SystemLog.query
            .filter_by(user_role='admin')
            .count()
        )

        counsellor_count = (
            SystemLog.query
            .filter_by(user_role='counsellor')
            .count()
        )

        student_count = (
            SystemLog.query
            .filter_by(user_role='student')
            .count()
        )

        return jsonify({
            'success': True,
            'total': total,
            'today': today_count,
            'admin': admin_count,
            'counsellor': counsellor_count,
            'student': student_count
        }), 200

    except Exception as e:
        print('❌ Admin system log summary error:', e)

        return jsonify({
            'success': False,
            'error': 'Failed to load log summary'
        }), 500


# ADMIN — USER MANAGEMENT
# ════════════════════════════════════════════════════════════

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users():

    users = (
        User.query
        .order_by(User.created_at.desc())
        .all()
    )

    return jsonify([
        {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'status': (
                'pending'
                if user.role == 'counsellor' and not user.is_approved
                else 'active'
            ),
            'is_approved': user.is_approved,
            'created_at': (
                user.created_at.isoformat()
                if user.created_at else None
            )
        }
        for user in users
    ]), 200

@app.route('/api/admin/approve-counsellor/<int:user_id>', methods=['PATCH'])
@admin_required
def approve_counsellor(user_id):

    counsellor = User.query.filter_by(
        id=user_id,
        role='counsellor'
    ).first()

    if not counsellor:
        return jsonify({
            'error': 'Counsellor not found'
        }), 404

    if counsellor.is_approved:
        return jsonify({
            'error': 'Counsellor is already approved'
        }), 400

    counsellor.is_approved = True

    create_system_log(
        action='APPROVE_COUNSELLOR',
        description=f'Approved counsellor account "{counsellor.name}".',
        entity_type='User',
        entity_id=counsellor.id
    )

    db.session.commit()

    return jsonify({
        'message': 'Counsellor approved successfully',
        'user': counsellor.to_dict()
    }), 200

@app.route('/api/admin/delete-user/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):

    current_admin_id = session.get('user_id')

    # Never allow an admin to delete their own account
    if user_id == current_admin_id:
        return jsonify({
            'error': 'You cannot delete your own admin account'
        }), 400

    user = User.query.get(user_id)

    if not user:
        return jsonify({
            'error': 'User not found'
        }), 404

    deleted_user_name = user.name
    deleted_user_role = user.role

    db.session.delete(user)

    create_system_log(
        action='DELETE_USER',
        description=(
            f'Deleted user "{deleted_user_name}" '
            f'with role "{deleted_user_role}".'
        ),
        entity_type='User',
        entity_id=user_id
    )

    db.session.commit()

    return jsonify({
        'message': 'User deleted successfully'
    }), 200

@app.route('/api/admin/change-role/<int:user_id>', methods=['PATCH'])
@admin_required
def admin_change_role(user_id):

    current_admin_id = session.get('user_id')

    if user_id == current_admin_id:
        return jsonify({
            'error': 'You cannot change your own admin role'
        }), 400

    user = User.query.get(user_id)

    if not user:
        return jsonify({
            'error': 'User not found'
        }), 404

    data = request.get_json() or {}
    new_role = data.get('role')

    if new_role not in ['student', 'counsellor', 'admin']:
        return jsonify({
            'error': 'Invalid role'
        }), 400

    user.role = new_role

    # Counsellors must be approved before login
    if new_role == 'counsellor':
        user.is_approved = False
    else:
        user.is_approved = True

    db.session.commit()

    return jsonify({
        'message': 'User role updated successfully',
        'user': user.to_dict()
    }), 200

# ════════════════════════════════════════════════════════════
# ADMIN — SYSTEM ANALYTICS
# ════════════════════════════════════════════════════════════


# ── Helper: protect any route that needs login ────────────────
# Use @login_required above any route that only logged-in users can access


# ============================================================
# ADMIN — SYSTEM ANALYTICS
# ============================================================

@app.route('/api/admin/analytics', methods=['GET'])
@admin_required
def admin_analytics():

    # --------------------------------------------------------
    # USERS
    # --------------------------------------------------------

    total_students = User.query.filter_by(
        role='student'
    ).count()

    total_counsellors = User.query.filter_by(
        role='counsellor'
    ).count()

    pending_counsellors = User.query.filter_by(
        role='counsellor',
        is_approved=False
    ).count()


    # --------------------------------------------------------
    # CHECK-INS THIS WEEK
    # --------------------------------------------------------

    today = date.today()

    # Monday of the current week
    week_start = today - timedelta(
        days=today.weekday()
    )

    checkins_this_week = CheckIn.query.filter(
        CheckIn.checkin_date >= week_start,
        CheckIn.checkin_date <= today
    ).count()


    # --------------------------------------------------------
    # APPOINTMENTS
    # --------------------------------------------------------

    total_appointments = Appointment.query.count()

    pending_appointments = Appointment.query.filter_by(
        status='pending'
    ).count()

    confirmed_appointments = Appointment.query.filter_by(
        status='confirmed'
    ).count()

    completed_appointments = Appointment.query.filter_by(
        status='completed'
    ).count()


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        'total_students':
            total_students,

        'total_counsellors':
            total_counsellors,

        'pending_counsellors':
            pending_counsellors,

        'checkins_this_week':
            checkins_this_week,

        'total_appointments':
            total_appointments,

        'pending_appointments':
            pending_appointments,

        'confirmed_appointments':
            confirmed_appointments,

        'completed_appointments':
            completed_appointments

    }), 200

    

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
        ensure_resource_active_column()
        seed_resources()
        seed_video_resources()
        print("✅ All database tables created in mindease_db")

    scheduler = BackgroundScheduler(
        timezone='Asia/Colombo'
    )

    scheduler.add_job(
        func=send_weekly_digests,
        trigger=CronTrigger(
            day_of_week='sun',
            hour=8,
            minute=0,
            timezone='Asia/Colombo'
        ),
        id='weekly_mindease_digest',
        replace_existing=True,
        misfire_grace_time=3600
    )

    scheduler.start()

    print(
        "📨 Weekly email digest scheduler started"
        "(Sunday 08:00 Asia/Colombo)"
    )

    try:
        app.run(debug=False, port=5000)
    finally:
        scheduler.shutdown(wait=False)
