import sys
from pathlib import Path
from io import StringIO
import json

import numpy as np


# ============================================================
# PROJECT PATH
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ============================================================
# FAKE AI OBJECTS FOR UNIT TESTING
# ============================================================

class FakeRiskModel:
    """
    Fake risk model used to isolate predict_risk().
    """

    def predict(self, df):
        return np.array([0])


class FakeRiskEncoder:
    """
    Fake encoder used to convert the numeric prediction
    into a readable risk label.
    """

    def inverse_transform(self, values):
        return np.array(["Low"])


class FakeFeatureEncoder:
    """
    Fake categorical encoder used by predict_risk().
    """

    classes_ = np.array([
        "Male",
        "Female",
        "1",
        "2",
        "3",
        "4",
        "5"
    ])

    def transform(self, values):
        return np.array([1])


class FakeSentimentModel:
    """
    Fake sentiment model used to isolate predict_sentiment().
    """

    def predict(self, vectors):
        return np.array(["joy"])


class FakeTfidf:
    """
    Fake TF-IDF transformer used by predict_sentiment().
    """

    def transform(self, texts):
        return np.array([[1.0, 0.0, 0.0]])


class DummyModel:
    """
    Fallback object for unused model loads.
    """

    pass


# ============================================================
# FAKE MODEL LOADING
# ============================================================

import joblib
import builtins


# Save the original functions.
original_joblib_load = joblib.load
original_open = builtins.open

# Track the order in which app.py loads the models.
load_count = 0


def fake_joblib_load(path):
    """
    app.py loads the following objects during startup:

    1. Risk model
    2. Risk encoder
    3. Risk feature encoders
    4. Sentiment model
    5. TF-IDF transformer
    """

    global load_count

    load_count += 1

    # --------------------------------------------------------
    # 1. Risk model
    # --------------------------------------------------------
    if load_count == 1:
        return FakeRiskModel()

    # --------------------------------------------------------
    # 2. Risk encoder
    # --------------------------------------------------------
    if load_count == 2:
        return FakeRiskEncoder()

    # --------------------------------------------------------
    # 3. Risk feature encoders
    # --------------------------------------------------------
    if load_count == 3:
        return {
            "gender": FakeFeatureEncoder()
        }

    # --------------------------------------------------------
    # 4. Sentiment model
    # --------------------------------------------------------
    if load_count == 4:
        return FakeSentimentModel()

    # --------------------------------------------------------
    # 5. TF-IDF transformer
    # --------------------------------------------------------
    if load_count == 5:
        return FakeTfidf()

    # --------------------------------------------------------
    # Fallback
    # --------------------------------------------------------
    return DummyModel()


def fake_open(file, mode="r", *args, **kwargs):
    """
    Replace only the risk_features JSON file with controlled
    test data. Other files use the original open() function.
    """

    file_str = str(file).lower()

    if "risk_features" in file_str:

        fake_features = [
            "age",
            "gender",
            "academic_year",
            "study_hours_per_day",
            "exam_pressure",
            "academic_performance",
            "stress_level",
            "sleep_hours",
            "physical_activity",
            "social_support",
            "screen_time",
            "internet_usage",
            "financial_stress",
            "family_expectation"
        ]

        return StringIO(json.dumps(fake_features))

    return original_open(file, mode, *args, **kwargs)


# ============================================================
# APPLY PATCHES BEFORE IMPORTING app.py
# ============================================================

joblib.load = fake_joblib_load
builtins.open = fake_open


try:
    from app import (
        predict_risk,
        predict_sentiment,
        create_notification
    )

finally:
    # Restore original functions after app.py has been imported.
    joblib.load = original_joblib_load
    builtins.open = original_open


# ============================================================
# UT-01
# ============================================================

def test_predict_risk_with_valid_data():
    """
    UT-01:
    Verify that predict_risk() accepts a complete valid dataset
    and returns a valid risk label.
    """

    form_data = {
        "age": 22,
        "gender": "Male",
        "academic_year": 3,
        "study_hours_per_day": 5.0,
        "exam_pressure": 3.0,
        "academic_performance": 3.0,
        "stress_level": 2.0,
        "sleep_hours": 7.0,
        "physical_activity": 3.0,
        "social_support": 4.0,
        "screen_time": 4.0,
        "internet_usage": 5.0,
        "financial_stress": 2.0,
        "family_expectation": 3.0,
    }

    result = predict_risk(form_data)

    assert isinstance(result, str)
    assert result == "Low"


# ============================================================
# UT-02
# ============================================================

def test_predict_risk_with_unknown_categorical_value():
    """
    UT-02:
    Verify that predict_risk() safely handles an unknown
    categorical value without raising an exception.
    """

    form_data = {
        "age": 22,
        "gender": "UnknownGender",
        "academic_year": 3,
        "study_hours_per_day": 5.0,
        "exam_pressure": 3.0,
        "academic_performance": 3.0,
        "stress_level": 2.0,
        "sleep_hours": 7.0,
        "physical_activity": 3.0,
        "social_support": 4.0,
        "screen_time": 4.0,
        "internet_usage": 5.0,
        "financial_stress": 2.0,
        "family_expectation": 3.0,
    }

    result = predict_risk(form_data)

    assert isinstance(result, str)
    assert result == "Low"


# ============================================================
# UT-03
# ============================================================

def test_predict_sentiment_with_positive_text():
    """
    UT-03:
    Verify that predict_sentiment() processes positive journal
    text and returns an emotion and mood category.
    """

    text = (
        "I had a wonderful day today. "
        "I feel happy, relaxed and proud of myself."
    )

    emotion, mood = predict_sentiment(text)

    assert isinstance(emotion, str)
    assert isinstance(mood, str)

    assert emotion != ""
    assert mood != ""

    assert emotion == "joy"


# ============================================================
# UT-04
# ============================================================

def test_predict_sentiment_with_negative_text():
    """
    UT-04:
    Verify that predict_sentiment() processes negative journal
    text and returns an emotion and mood category.
    """

    text = (
        "I feel very stressed and unhappy today. "
        "Everything feels difficult and exhausting."
    )

    emotion, mood = predict_sentiment(text)

    assert isinstance(emotion, str)
    assert isinstance(mood, str)

    assert emotion != ""
    assert mood != ""

    # The mocked sentiment model returns "joy".
    # This unit test checks the processing pipeline,
    # not the real model's classification accuracy.
    assert emotion == "joy"


# ============================================================
# UT-05
# ============================================================

def test_predict_sentiment_with_empty_text():
    """
    UT-05:
    Verify that predict_sentiment() handles empty journal
    input without raising an unexpected exception.
    """

    text = ""

    emotion, mood = predict_sentiment(text)

    assert isinstance(emotion, str)
    assert isinstance(mood, str)

    assert emotion != ""
    assert mood != ""


# ============================================================
# UT-06
# ============================================================

def test_create_notification(monkeypatch):
    """
    UT-06:
    Verify that create_notification() creates a notification
    with the correct values, adds it to the database session,
    commits the session, and returns the notification object.
    """

    # --------------------------------------------------------
    # Fake Notification object
    # --------------------------------------------------------

    class FakeNotification:

        def __init__(
            self,
            user_id,
            title,
            message,
            notification_type,
            is_read
        ):
            self.user_id = user_id
            self.title = title
            self.message = message
            self.notification_type = notification_type
            self.is_read = is_read

    # --------------------------------------------------------
    # Fake database session
    # --------------------------------------------------------

    class FakeSession:

        def __init__(self):
            self.added_object = None
            self.commit_called = False

        def add(self, obj):
            self.added_object = obj

        def commit(self):
            self.commit_called = True

        def rollback(self):
            pass

        def remove(self):
            pass

    fake_session = FakeSession()

    # Import the app module.
    import app

    # Replace the real Notification class.
    monkeypatch.setattr(
        app,
        "Notification",
        FakeNotification
    )

    # Replace the database session.
    monkeypatch.setattr(
        app.db,
        "session",
        fake_session
    )

    # --------------------------------------------------------
    # Execute function under test.
    # --------------------------------------------------------

    result = create_notification(
        user_id=101,
        title="Test Notification",
        message="This is a unit test notification.",
        notification_type="test"
    )

    # --------------------------------------------------------
    # Verify returned object.
    # --------------------------------------------------------

    assert isinstance(result, FakeNotification)

    assert result.user_id == 101
    assert result.title == "Test Notification"
    assert result.message == "This is a unit test notification."
    assert result.notification_type == "test"

    # New notifications must be unread.
    assert result.is_read is False

    # --------------------------------------------------------
    # Verify database operations.
    # --------------------------------------------------------

    assert fake_session.added_object is result
    assert fake_session.commit_called is True


# ============================================================
# UT-07
# ============================================================

def test_login_required_without_authentication():
    """
    UT-07:
    Verify that login_required rejects a request when the
    user is not authenticated.
    """

    import app

    @app.login_required
    def protected_function():
        return {"success": True}, 200

    with app.app.test_request_context("/test"):

        # No user_id is placed in the session.
        response = protected_function()

    response_body, status_code = response

    assert status_code == 401

    json_data = response_body.get_json()

    assert json_data["error"] == "Login required"


# ============================================================
# UT-08
# ============================================================

def test_admin_required_with_non_admin_user():
    """
    UT-08:
    Verify that admin_required rejects a user who is logged in
    but does not have the admin role.
    """

    import app
    from flask import session

    @app.admin_required
    def admin_only_function():
        return {"success": True}, 200

    with app.app.test_request_context("/admin-test"):

        # Simulate a logged-in student.
        session["user_id"] = 101
        session["user_role"] = "student"

        response = admin_only_function()

    response_body, status_code = response

    assert status_code == 403

    json_data = response_body.get_json()

    assert json_data["error"] == "Admin access required"


# ============================================================
# UT-09
# ============================================================

def test_counsellor_required_with_non_counsellor_user():
    """
    UT-09:
    Verify that counsellor_required rejects a logged-in user
    who does not have the counsellor role.
    """

    import app
    from flask import session

    @app.counsellor_required
    def counsellor_only_function():
        return {"success": True}, 200

    with app.app.test_request_context("/counsellor-test"):

        # Simulate a logged-in student.
        session["user_id"] = 101
        session["user_role"] = "student"

        response = counsellor_only_function()

    response_body, status_code = response

    assert status_code == 403

    json_data = response_body.get_json()

    assert json_data["error"] == "Counsellor access required"


# ============================================================
# UT-10
# ============================================================

def test_goal_progress_calculation():
    """
    UT-10:
    Verify that Goal.to_dict() correctly calculates the number
    of completed days and the progress percentage.
    """

    import app

    # --------------------------------------------------------
    # Create a real SQLAlchemy Goal object.
    # This object is not committed to the database.
    # --------------------------------------------------------

    goal = app.Goal(
        user_id=101,
        goal_text="Exercise for 20 minutes",
        week_start_date=app.date.today(),
        status="pending"
    )

    # --------------------------------------------------------
    # Create real SQLAlchemy GoalDailyProgress objects.
    # --------------------------------------------------------

    start_date = app.date.today()

    daily_records = [
        app.GoalDailyProgress(
            goal_id=1,
            progress_date=start_date,
            completed=True
        ),
        app.GoalDailyProgress(
            goal_id=1,
            progress_date=start_date + app.timedelta(days=1),
            completed=True
        ),
        app.GoalDailyProgress(
            goal_id=1,
            progress_date=start_date + app.timedelta(days=2),
            completed=True
        ),
        app.GoalDailyProgress(
            goal_id=1,
            progress_date=start_date + app.timedelta(days=3),
            completed=True
        ),
        app.GoalDailyProgress(
            goal_id=1,
            progress_date=start_date + app.timedelta(days=4),
            completed=False
        ),
        app.GoalDailyProgress(
            goal_id=1,
            progress_date=start_date + app.timedelta(days=5),
            completed=False
        ),
        app.GoalDailyProgress(
            goal_id=1,
            progress_date=start_date + app.timedelta(days=6),
            completed=False
        ),
    ]

    # Attach the real SQLAlchemy child objects.
    goal.daily_progress = daily_records

    # --------------------------------------------------------
    # Execute the actual Goal.to_dict() method.
    # --------------------------------------------------------

    result = goal.to_dict()

    # --------------------------------------------------------
    # Verify the calculation.
    #
    # 4 completed days out of 7:
    #
    # (4 / 7) * 100 = 57.14...
    # rounded to 57
    # --------------------------------------------------------

    assert result["completed_days"] == 4
    assert result["total_days"] == 7
    assert result["progress_percentage"] == 57


# ============================================================
# UT-11
# ============================================================

def test_streak_increases_for_consecutive_checkin(monkeypatch):
    """
    UT-11:
    Verify that the wellness streak increases when a student
    submits a check-in on the day immediately after the
    previous check-in.
    """

    import app

    # --------------------------------------------------------
    # Fake date class.
    # --------------------------------------------------------

    class FakeDate:
        current_date = app.date(2026, 8, 28)

        @classmethod
        def today(cls):
            return cls.current_date

        @classmethod
        def fromisoformat(cls, value):
            return app.date.fromisoformat(value)

    # Save original date.
    original_date = app.date

    # Replace app.date temporarily.
    monkeypatch.setattr(app, "date", FakeDate)

    # --------------------------------------------------------
    # Fake CheckIn object.
    # --------------------------------------------------------

    class FakeCheckIn:

        def __init__(self, **kwargs):

            self.id = 1

            self.user_id = kwargs["user_id"]

            self.age = kwargs["age"]
            self.gender = kwargs["gender"]
            self.academic_year = kwargs["academic_year"]

            self.study_hours_per_day = kwargs[
                "study_hours_per_day"
            ]

            self.exam_pressure = kwargs[
                "exam_pressure"
            ]

            self.academic_performance = kwargs[
                "academic_performance"
            ]

            self.stress_level = kwargs[
                "stress_level"
            ]

            self.sleep_hours = kwargs[
                "sleep_hours"
            ]

            self.physical_activity = kwargs[
                "physical_activity"
            ]

            self.social_support = kwargs[
                "social_support"
            ]

            self.screen_time = kwargs[
                "screen_time"
            ]

            self.internet_usage = kwargs[
                "internet_usage"
            ]

            self.financial_stress = kwargs[
                "financial_stress"
            ]

            self.family_expectation = kwargs[
                "family_expectation"
            ]

            self.risk_result = kwargs["risk_result"]

            self.checkin_date = FakeDate.today()

        def to_dict(self):

            return {
                "id": self.id,
                "user_id": self.user_id,
                "risk_result": self.risk_result,
                "checkin_date": self.checkin_date.isoformat()
            }

    # --------------------------------------------------------
    # Fake Streak object.
    # --------------------------------------------------------

    class FakeStreak:

        def __init__(
            self,
            user_id,
            current_streak=0,
            longest_streak=0,
            last_checkin_date=None,
            badges="[]"
        ):
            self.user_id = user_id
            self.current_streak = current_streak
            self.longest_streak = longest_streak
            self.last_checkin_date = last_checkin_date
            self.badges = badges

    # --------------------------------------------------------
    # Simulate an existing streak from yesterday.
    # --------------------------------------------------------

    yesterday = (
        FakeDate.current_date
        - app.timedelta(days=1)
    )

    existing_streak = FakeStreak(
        user_id=101,
        current_streak=3,
        longest_streak=3,
        last_checkin_date=yesterday,
        badges="[]"
    )

    # --------------------------------------------------------
    # Fake Streak query.
    # --------------------------------------------------------

    class FakeQuery:

        def filter_by(self, **kwargs):
            return self

        def first(self):
            return existing_streak

    # --------------------------------------------------------
    # Fake database session.
    # --------------------------------------------------------

    class FakeSession:

        def __init__(self):
            self.added_objects = []
            self.commit_count = 0

        def add(self, obj):
            self.added_objects.append(obj)

        def commit(self):
            self.commit_count += 1

        def rollback(self):
            pass

        def remove(self):
            pass

    fake_session = FakeSession()

    # --------------------------------------------------------
    # Patch components used by the check-in route.
    # --------------------------------------------------------

    monkeypatch.setattr(
        app,
        "CheckIn",
        FakeCheckIn
    )

    monkeypatch.setattr(
        app,
        "Streak",
        type(
            "FakeStreakModel",
            (),
            {
                "query": FakeQuery()
            }
        )
    )

    monkeypatch.setattr(
        app.db,
        "session",
        fake_session
    )

    # --------------------------------------------------------
    # Mock risk prediction.
    # Streak testing does not need to test the AI model again.
    # --------------------------------------------------------

    monkeypatch.setattr(
        app,
        "predict_risk",
        lambda data: "Low"
    )

    # --------------------------------------------------------
    # Flask test client.
    # --------------------------------------------------------

    client = app.app.test_client()

    # --------------------------------------------------------
    # Valid check-in data.
    # --------------------------------------------------------

    valid_checkin_data = {
        "age": 22,
        "gender": "Male",
        "academic_year": 3,
        "study_hours_per_day": 5.0,
        "exam_pressure": 3.0,
        "academic_performance": 3.0,
        "stress_level": 2.0,
        "sleep_hours": 7.0,
        "physical_activity": 3.0,
        "social_support": 4.0,
        "screen_time": 4.0,
        "internet_usage": 5.0,
        "financial_stress": 2.0,
        "family_expectation": 3.0
    }

    # --------------------------------------------------------
    # Simulate logged-in student.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:

        flask_session["user_id"] = 101
        flask_session["user_role"] = "student"

    # --------------------------------------------------------
    # Execute the actual check-in API.
    # --------------------------------------------------------

    response = client.post(
        "/api/checkin",
        json=valid_checkin_data
    )

    # --------------------------------------------------------
    # Verify successful response.
    # --------------------------------------------------------

    assert response.status_code == 201

    response_data = response.get_json()

    assert response_data["risk_result"] == "Low"

    # --------------------------------------------------------
    # Verify streak update.
    #
    # Previous:
    # current = 3
    # longest = 3
    # last check-in = yesterday
    #
    # After today's check-in:
    # current = 4
    # longest = 4
    # --------------------------------------------------------

    assert existing_streak.current_streak == 4
    assert existing_streak.longest_streak == 4

    assert (
        existing_streak.last_checkin_date
        == FakeDate.current_date
    )

    # Verify that database commits occurred.
    assert fake_session.commit_count >= 1