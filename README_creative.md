# 🌿 MindEase
### *A calmer mind. A better you.*

<p align="center">
  <img src="https://img.shields.io/badge/MindEase-Student%20Wellbeing-2A8968?style=for-the-badge" alt="MindEase"/>
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL"/>
</p>

<p align="center">
  <strong>A web-based Student Wellbeing Management System for checking in, reflecting, building healthy habits, and connecting with support.</strong>
</p>

---

## 🌱 Why MindEase?

University life can be exciting, demanding, overwhelming, and everything in between.

**MindEase** brings everyday wellbeing support into one calm digital space.

```text
                     ┌──────────────────────┐
                     │       MindEase       │
                     │  Student Wellbeing   │
                     └──────────┬───────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   🧠 Understand           🌿 Build Habits       🤝 Find Support
      Yourself               & Progress             When Needed
          │                     │                     │
          └───────────────┬─────┴─────────────┬───────┘
                          ▼                   ▼
                    AI-Assisted          Human Support
                     Insights             & Counselling
```

---

# ✨ Core Features

### 🧑‍🎓 Student Experience

| Feature | Purpose |
|---|---|
| 🌿 Daily Check-in | Record daily wellbeing information |
| 🧠 AI Risk Prediction | Generate an AI-assisted wellbeing risk category |
| 📔 Smart Journal | Write reflections and receive emotion/mood analysis |
| 📈 Wellbeing Trends | View recent wellbeing and stress patterns |
| 🎯 Weekly Goals | Set goals and track daily progress |
| 🧘 Exercises | Access guided wellbeing exercises |
| 📚 Resources | Explore wellness resources and guides |
| 💬 MindBot | Interact with an AI wellbeing assistant |
| 🤝 Community | Share and react to supportive posts |
| 📅 Counselling | Book counselling appointments |
| 🔔 Notifications | View and manage notifications |
| 🆘 SOS Support | Access emergency/support pathways |
| ✉️ Weekly Digest | Receive an aggregated wellbeing summary |

### 🧑‍⚕️ Counsellor Experience

- Counsellor dashboard
- Appointment management
- Student wellbeing information relevant to counselling
- Reports
- Resource management

### 🛡️ Administrator Experience

- User management
- Counsellor approval
- Analytics
- Resource and exercise management
- System / audit logs
- Administrator settings

---

# 🤖 AI at the Heart of MindEase

MindEase combines **machine learning, AI assistance, and wellbeing workflows**.

### 01 — Wellbeing Risk Classifier

```text
Student Check-in
       ↓
14 wellbeing features
       ↓
Feature Encoding
       ↓
ML Risk Model
       ↓
Low / Medium / High
```

### 02 — Journal Emotion Analysis

```text
Journal Entry
      ↓
Text Cleaning
      ↓
TF-IDF
      ↓
Emotion Model
      ↓
Emotion
      ↓
Mood Group
```

Mood groups include:

`Positive` · `Cautious` · `Negative`

### 03 — MindBot

MindBot provides supportive wellbeing conversations for university students and encourages professional support when appropriate.

> **Important:** MindEase AI features are intended for wellbeing support and are not a replacement for professional medical, psychological, or counselling services.

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────────┐
                         │      React Frontend     │
                         │                         │
                         │  Student                │
                         │  Counsellor             │
                         │  Administrator          │
                         └────────────┬────────────┘
                                      │
                                 REST / HTTP
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      Flask Backend      │
                         │                         │
                         │ Authentication          │
                         │ Role-Based Access       │
                         │ Business Logic          │
                         │ AI Processing           │
                         │ REST APIs               │
                         └───────────┬─────────────┘
                                     │
                       ┌─────────────┴─────────────┐
                       ▼                           ▼
              ┌────────────────┐         ┌────────────────────┐
              │     MySQL      │         │    AI Components   │
              │    Database    │         │                    │
              │                │         │ Risk Classifier    │
              │ Users          │         │ Emotion Analyzer   │
              │ Check-ins      │         │ MindBot            │
              │ Journals       │         │                    │
              │ Goals          │         └────────────────────┘
              │ Appointments   │
              │ Notifications │
              └────────────────┘
```

---

# 🛠️ Technology Stack

### Frontend

```text
⚛️ React
🧭 React Router
📡 Axios
🎨 CSS
```

### Backend

```text
🐍 Python
🍶 Flask
🗃️ Flask-SQLAlchemy
🌐 Flask-CORS
✉️ Flask-Mail
🔐 bcrypt
⏰ APScheduler
```

### Database

```text
🐬 MySQL
🧱 SQLAlchemy ORM
```

### AI / Machine Learning

```text
🤖 Scikit-learn
📊 TF-IDF
📦 Joblib
✨ Google Gemini API
```

### Testing

```text
🧪 Pytest
📮 Postman
🔒 Manual Security Testing
⚡ Manual Performance Testing
👥 User Acceptance Testing
```

---

# 🔐 Security by Design

MindEase includes:

- 🔑 bcrypt password hashing
- 🧾 Session-based authentication
- 🛡️ Role-based access control
- 🚫 Protected backend endpoints
- ✅ Input validation
- 🔒 Session/logout protection
- 📝 Privacy-conscious audit logging
- 🔐 Environment-based secret management

### Role model

```text
Student
   │
   └── Student Dashboard

Counsellor
   │
   └── Counsellor Dashboard

Administrator
   │
   └── Admin Dashboard
```

---

# 🧪 Testing

MindEase was evaluated through multiple levels of testing.

### ✅ Unit Testing

Automated tests cover:

- Risk prediction
- Unknown categorical values
- Positive and negative journal analysis
- Empty journal handling
- Notifications
- Authentication
- Authorization
- Goal progress
- Wellbeing streaks

### ✅ Integration Testing

Integration tests cover interactions between:

- Check-ins + AI prediction + database
- Journals + emotion analysis + database
- Goals + daily progress
- Counselling + appointments
- Notifications
- Community posts + reactions
- Resources + exercises
- Counsellor dashboard data
- Weekly wellbeing digest

### ✅ Security Testing

Manual testing covered:

- Unauthenticated access
- Student → Admin access attempts
- Student → Counsellor access attempts
- Invalid input
- Script-like input handling
- Access after logout

### ✅ Performance Testing

Manual checks covered:

- Dashboard loading
- Check-in response time
- AI prediction response
- Journal analysis response
- Resources and exercises loading
- Repeated navigation and responsiveness

### ✅ API Testing with Postman

| ID | API | Method |
|---|---|---|
| API-01 | Health Check | GET |
| API-02 | Login | POST |
| API-03 | Wellbeing Check-in | POST |
| API-04 | Check-in Validation | POST |
| API-05 | Journal & Emotion Analysis | POST |
| API-06 | Goal Creation | POST |
| API-07 | Notifications | GET |
| API-08 | Unauthorized Access | GET |

---

# 🚀 Quick Start

## 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd mindease
```

## 2. Start the backend

```bash
cd mindease-backend

python -m venv .venv
```

### Windows

```powershell
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run Flask:

```bash
python app.py
```

Backend:

```text
http://localhost:5000
```

---

## 3. Start the frontend

Open a second terminal:

```bash
cd mindease-frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

# 🗄️ Environment Configuration

Create the required environment configuration for the backend.

Example:

```env
SECRET_KEY=your_secret_key
DATABASE_URL=your_database_connection_string

GEMINI_API_KEY=your_gemini_api_key

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your_email@example.com
MAIL_PASSWORD=your_email_app_password
```

> ⚠️ **Never commit `.env`, passwords, API keys, database credentials, or email credentials to GitHub.**

Add `.env` to `.gitignore`.

---

# 🔑 Authentication Flow

```text
                   🌿 Welcome
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
         🔑 Sign In          📝 Register
             │                   │
             └─────────┬─────────┘
                       ▼
                    Login
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Student     Counsellor     Admin
          │            │            │
          ▼            ▼            ▼
      Dashboard    Dashboard     Dashboard
```

Password recovery:

```text
Login
  ↓
Forgot Password
  ↓
Enter Email
  ↓
Reset Link
  ↓
New Password
  ↓
Login
```

---

# 🔗 Main API Endpoints

```text
POST   /api/register
POST   /api/login
POST   /api/logout

GET    /api/health

POST   /api/checkin

POST   /api/journal

GET    /api/notifications
PUT    /api/notifications/<id>/read

GET    /api/goals
POST   /api/goals

GET    /api/resources
GET    /api/exercises

POST   /api/forgot-password
POST   /api/reset-password
```

Additional endpoints support counselling, community, dashboards, SOS, administration, and weekly digest functionality.

---

# 📁 Project Structure

```text
mindease/
│
├── mindease-backend/
│   ├── app.py
│   ├── config.py
│   ├── tests/
│   │   ├── test_risk_prediction.py
│   │   └── test_integration.py
│   ├── ai_models/
│   └── ...
│
├── mindease-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── api/
│   │   └── App.jsx
│   ├── package.json
│   └── ...
│
├── database/
│   └── ...
│
└── README.md
```

---

# 🌐 Application Journey

```text
      🌿 Welcome
           │
     ┌─────┴─────┐
     ▼           ▼
  Sign In     Register
     │
     ▼
🧑‍🎓 Student Dashboard
     │
     ├── 🧠 Check-in ─────→ AI Risk
     │
     ├── 📔 Journal ──────→ AI Emotion
     │
     ├── 🎯 Goals ────────→ Progress
     │
     ├── 📚 Resources
     │
     ├── 🧘 Exercises
     │
     ├── 💬 MindBot
     │
     ├── 🤝 Community
     │
     ├── 📅 Counselling
     │
     ├── 🔔 Notifications
     │
     └── 🆘 SOS
```

---

# 💚 Design Philosophy

MindEase is built around five ideas:

```text
🌿 Calm
🤍 Simple
🧠 Supportive
🔒 Private
🤝 Human-centred
```

The goal is to make wellbeing-related actions easy to understand without overwhelming the student.

---

# 📬 Email Features

Flask-Mail supports features such as:

- Password reset emails
- SOS/support notifications
- Weekly wellbeing digest emails
- Other system notifications

The weekly digest uses aggregated wellbeing activity and is designed not to include private journal text.

---

# ⚠️ Disclaimer

MindEase is an academic/software project created to support student wellbeing.

AI-generated wellbeing results and chatbot responses **must not be treated as medical or psychological diagnoses**.

Students experiencing serious or urgent concerns should contact a qualified professional, university counsellor, trusted person, or appropriate emergency support service.

---

# 🌱 Project Vision

> **MindEase is more than a dashboard.**
>
> It is a digital space where students can **pause, reflect, understand, and reach out.**

### Check in. Reflect. Grow. Connect.

---

## 🎓 Academic Project

**Project:** MindEase – Student Wellbeing Management System

**Type:** Web-Based Student Wellbeing Management Platform

**Core Technologies:** React · Flask · MySQL · Python · AI/ML

**Purpose:** Student wellbeing support, self-monitoring, AI-assisted insights, healthy habit development, and access to support.

<p align="center">
  <strong>🌿 MindEase — Your wellbeing matters.</strong>
</p>
