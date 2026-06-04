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