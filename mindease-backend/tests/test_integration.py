import sys
from pathlib import Path

import pytest


# ============================================================
# PROJECT PATH
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ============================================================
# TEST DATABASE FIXTURE
# ============================================================

@pytest.fixture()
def client():
    """
    Create a Flask test client using an in-memory SQLite database.

    The real MindEase MySQL database is NOT used.
    """

    import app

    # --------------------------------------------------------
    # Configure a temporary SQLite database.
    # --------------------------------------------------------

    app.app.config["TESTING"] = True
    app.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    # --------------------------------------------------------
    # Create test database tables.
    # --------------------------------------------------------

    with app.app.app_context():
        app.db.drop_all()
        app.db.create_all()

    test_client = app.app.test_client()

    yield test_client

    # --------------------------------------------------------
    # Clean up.
    # --------------------------------------------------------

    with app.app.app_context():
        app.db.session.remove()
        app.db.drop_all()


# ============================================================
# IT-01
# ============================================================

def test_checkin_integration(client, monkeypatch):
    """
    IT-01:

    Verify integration between:
        Flask API
        Risk prediction
        Database
        API response
    """

    import app

    # --------------------------------------------------------
    # Mock the risk model.
    # AI model accuracy is tested separately.
    # --------------------------------------------------------

    monkeypatch.setattr(
        app,
        "predict_risk",
        lambda data: "Low"
    )

    # --------------------------------------------------------
    # Simulate logged-in student.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:
        flask_session["user_id"] = 1
        flask_session["user_role"] = "student"

    # --------------------------------------------------------
    # Complete valid check-in data.
    # --------------------------------------------------------

    checkin_data = {
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
    # Call the real API endpoint.
    # --------------------------------------------------------

    response = client.post(
        "/api/checkin",
        json=checkin_data
    )

    # --------------------------------------------------------
    # Verify API response.
    # --------------------------------------------------------

    assert response.status_code == 201

    response_data = response.get_json()

    assert response_data is not None

    assert response_data["message"] == (
        "Check-in submitted successfully"
    )

    assert response_data["risk_result"] == "Low"

    assert "checkin" in response_data

    # --------------------------------------------------------
    # Verify database record.
    # --------------------------------------------------------

    with app.app.app_context():

        saved_checkin = (
            app.CheckIn.query
            .filter_by(user_id=1)
            .first()
        )

        assert saved_checkin is not None

        assert saved_checkin.age == 22
        assert saved_checkin.gender == "Male"
        assert saved_checkin.academic_year == 3

        assert saved_checkin.risk_result == "Low"

        assert saved_checkin.study_hours_per_day == 5.0
        assert saved_checkin.stress_level == 2.0
        assert saved_checkin.sleep_hours == 7.0


# ============================================================
# IT-02
# ============================================================

def test_journal_emotion_analysis_integration(client, monkeypatch):
    """
    IT-02:

    Verify integration between:
        Journal API
        Emotion analysis
        Database
        API response
    """

    import app

    # --------------------------------------------------------
    # Mock the sentiment model function.
    #
    # This prevents this integration test from testing model
    # accuracy. The AI model itself will be evaluated separately.
    # --------------------------------------------------------

    monkeypatch.setattr(
        app,
        "predict_sentiment",
        lambda text: ("joy", "Positive")
    )

    # --------------------------------------------------------
    # Simulate logged-in student.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:
        flask_session["user_id"] = 1
        flask_session["user_role"] = "student"

    # --------------------------------------------------------
    # Valid journal entry.
    #
    # The actual API requires at least 10 characters.
    # --------------------------------------------------------

    journal_data = {
        "content": (
            "Today was a wonderful day and "
            "I feel very happy and relaxed."
        )
    }

    # --------------------------------------------------------
    # Call the real journal API endpoint.
    # --------------------------------------------------------

    response = client.post(
        "/api/journal",
        json=journal_data
    )

    # --------------------------------------------------------
    # Verify API response.
    # --------------------------------------------------------

    assert response.status_code == 201

    response_data = response.get_json()

    assert response_data is not None

    assert response_data["emotion"] == "joy"
    assert response_data["mood_group"] == "Positive"

    assert "id" in response_data
    assert "message" in response_data

    # --------------------------------------------------------
    # Verify database record.
    # --------------------------------------------------------

    with app.app.app_context():

        saved_journal = (
            app.Journal.query
            .filter_by(user_id=1)
            .first()
        )

        assert saved_journal is not None

        assert (
            saved_journal.content
            == journal_data["content"]
        )

        assert saved_journal.emotion == "joy"
        assert saved_journal.mood_group == "Positive"


        # ============================================================
# IT-03
# ============================================================

def test_goal_creation_and_daily_progress_integration(client):
    """
    IT-03:

    Verify integration between:
        Goal API
        Goal model
        GoalDailyProgress model
        Database
        JSON response
    """

    import app

    # --------------------------------------------------------
    # Simulate a logged-in student.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:
        flask_session["user_id"] = 1
        flask_session["user_role"] = "student"

    # --------------------------------------------------------
    # Create a new weekly goal.
    # --------------------------------------------------------

    goal_data = {
        "goal_text": "Exercise for 20 minutes every day"
    }

    response = client.post(
        "/api/goals",
        json=goal_data
    )

    # --------------------------------------------------------
    # Verify successful API response.
    # --------------------------------------------------------

    assert response.status_code == 201

    response_data = response.get_json()

    assert response_data is not None

    # --------------------------------------------------------
    # Verify returned goal information.
    # --------------------------------------------------------

    assert "id" in response_data
    assert response_data["goal_text"] == (
        "Exercise for 20 minutes every day"
    )

    assert response_data["status"] == "pending"

    assert response_data["total_days"] == 7
    assert response_data["completed_days"] == 0
    assert response_data["progress_percentage"] == 0

    # --------------------------------------------------------
    # Verify seven daily progress records were returned.
    # --------------------------------------------------------

    assert "daily_progress" in response_data

    assert len(response_data["daily_progress"]) == 7

    # --------------------------------------------------------
    # Verify every day is initially incomplete.
    # --------------------------------------------------------

    for daily_record in response_data["daily_progress"]:
        assert daily_record["completed"] is False

    # --------------------------------------------------------
    # Verify database integration.
    # --------------------------------------------------------

    with app.app.app_context():

        saved_goal = (
            app.Goal.query
            .filter_by(user_id=1)
            .first()
        )

        assert saved_goal is not None

        assert saved_goal.goal_text == (
            "Exercise for 20 minutes every day"
        )

        assert saved_goal.status == "pending"

        # ----------------------------------------------------
        # Verify daily progress records in database.
        # ----------------------------------------------------

        progress_records = (
            app.GoalDailyProgress.query
            .filter_by(goal_id=saved_goal.id)
            .order_by(
                app.GoalDailyProgress.progress_date.asc()
            )
            .all()
        )

        assert len(progress_records) == 7

        # Every newly created day should be incomplete.
        assert all(
            record.completed is False
            for record in progress_records
        )

        # Verify that all records belong to the created goal.
        assert all(
            record.goal_id == saved_goal.id
            for record in progress_records
        )


        # ============================================================
# IT-04
# ============================================================

def test_counselling_appointment_booking_and_confirmation(
    client,
    monkeypatch
):
    """
    IT-04:

    Verify integration between:
        Student booking API
        Appointment database
        Counsellor update API
        Appointment status transition
    """

    import app

    # --------------------------------------------------------
    # Create the required test users.
    # --------------------------------------------------------

    with app.app.app_context():

        student = app.User(
            name="Test Student",
            email="student_test@example.com",
            password="test-password",
            role="student",
            is_approved=True
        )

        counsellor = app.User(
            name="Test Counsellor",
            email="counsellor_test@example.com",
            password="test-password",
            role="counsellor",
            is_approved=True
        )

        app.db.session.add(student)
        app.db.session.add(counsellor)
        app.db.session.commit()

        student_id = student.id
        counsellor_id = counsellor.id

    # --------------------------------------------------------
    # Prevent actual emails from being sent.
    # --------------------------------------------------------

    monkeypatch.setattr(
        app.mail,
        "send",
        lambda message: None
    )

    # --------------------------------------------------------
    # Step 1:
    # Student logs in.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:

        flask_session["user_id"] = student_id
        flask_session["user_role"] = "student"

    # --------------------------------------------------------
    # Use tomorrow as the appointment date so that the
    # production "past date" validation cannot reject it.
    # --------------------------------------------------------

    appointment_date = (
        app.date.today() + app.timedelta(days=1)
    ).isoformat()

    # --------------------------------------------------------
    # Step 2:
    # Student books an appointment.
    # --------------------------------------------------------

    booking_data = {
        "counsellor_id": counsellor_id,
        "date": appointment_date,
        "time_slot": "10:00",
        "notes": "Test counselling appointment"
    }

    booking_response = client.post(
        "/api/book",
        json=booking_data
    )

    # --------------------------------------------------------
    # Verify booking response.
    # --------------------------------------------------------

    assert booking_response.status_code == 201

    booking_result = booking_response.get_json()

    assert booking_result is not None

    assert booking_result["message"] == (
        "Appointment booked successfully!"
    )

    assert booking_result["status"] == "pending"

    assert booking_result["counsellor"] == (
        "Test Counsellor"
    )

    assert booking_result["time_slot"] == "10:00"

    assert "appointment_id" in booking_result

    appointment_id = booking_result["appointment_id"]

    # --------------------------------------------------------
    # Verify appointment was stored in the database.
    # --------------------------------------------------------

    with app.app.app_context():

        saved_appointment = (
            app.Appointment.query
            .filter_by(id=appointment_id)
            .first()
        )

        assert saved_appointment is not None

        assert saved_appointment.student_id == student_id
        assert saved_appointment.counsellor_id == counsellor_id

        assert (
            saved_appointment.requested_date
            == app.date.fromisoformat(appointment_date)
        )

        assert saved_appointment.time_slot == "10:00"
        assert saved_appointment.status == "pending"

        assert saved_appointment.notes == (
            "Test counselling appointment"
        )

    # --------------------------------------------------------
    # Step 3:
    # Switch session to the counsellor.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:

        flask_session["user_id"] = counsellor_id
        flask_session["user_role"] = "counsellor"

    # --------------------------------------------------------
    # Step 4:
    # Counsellor confirms the appointment.
    # --------------------------------------------------------

    confirmation_data = {
        "appointment_id": appointment_id,
        "status": "confirmed"
    }

    confirmation_response = client.post(
        "/api/counsellor/update_appointment",
        json=confirmation_data
    )

    # --------------------------------------------------------
    # Verify confirmation response.
    # --------------------------------------------------------

    assert confirmation_response.status_code == 200

    confirmation_result = (
        confirmation_response.get_json()
    )

    assert confirmation_result is not None

    assert confirmation_result["success"] is True

    assert confirmation_result["appointment"]["id"] == (
        appointment_id
    )

    assert confirmation_result["appointment"]["status"] == (
        "confirmed"
    )

    # --------------------------------------------------------
    # Verify the updated appointment in the database.
    # --------------------------------------------------------

    with app.app.app_context():

        updated_appointment = (
            app.Appointment.query
            .filter_by(id=appointment_id)
            .first()
        )

        assert updated_appointment is not None

        assert updated_appointment.student_id == student_id
        assert updated_appointment.counsellor_id == counsellor_id

        assert updated_appointment.status == "confirmed"


        # ============================================================
# IT-05
# ============================================================

def test_notification_read_status_integration(client):
    """
    IT-05:

    Verify integration between:
        Notification API
        Notification model
        Database
        Unread count
        Read-status update
    """

    import app

    # --------------------------------------------------------
    # Create a test student.
    # --------------------------------------------------------

    with app.app.app_context():

        student = app.User(
            name="Notification Test Student",
            email="notification_test@example.com",
            password="test-password",
            role="student",
            is_approved=True
        )

        app.db.session.add(student)
        app.db.session.commit()

        student_id = student.id

        # ----------------------------------------------------
        # Create an unread notification.
        # ----------------------------------------------------

        notification = app.Notification(
            user_id=student_id,
            title="Test Notification",
            message="This is an integration test notification.",
            notification_type="test",
            is_read=False
        )

        app.db.session.add(notification)
        app.db.session.commit()

        notification_id = notification.id

    # --------------------------------------------------------
    # Simulate logged-in student.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:
        flask_session["user_id"] = student_id
        flask_session["user_role"] = "student"

    # --------------------------------------------------------
    # Step 1:
    # Get notifications.
    # --------------------------------------------------------

    response = client.get(
        "/api/notifications"
    )

    assert response.status_code == 200

    response_data = response.get_json()

    assert response_data is not None

    assert "notifications" in response_data
    assert "unread_count" in response_data

    assert response_data["unread_count"] == 1

    # --------------------------------------------------------
    # Verify notification appears in response.
    # --------------------------------------------------------

    matching_notifications = [
        item
        for item in response_data["notifications"]
        if item["id"] == notification_id
    ]

    assert len(matching_notifications) == 1

    returned_notification = matching_notifications[0]

    assert returned_notification["title"] == (
        "Test Notification"
    )

    assert returned_notification["message"] == (
        "This is an integration test notification."
    )

    assert returned_notification["is_read"] is False

    # --------------------------------------------------------
    # Step 2:
    # Check unread-count endpoint.
    # --------------------------------------------------------

    unread_response = client.get(
        "/api/notifications/unread-count"
    )

    assert unread_response.status_code == 200

    unread_data = unread_response.get_json()

    assert unread_data["unread_count"] == 1

    # --------------------------------------------------------
    # Step 3:
    # Mark notification as read.
    # --------------------------------------------------------

    read_response = client.put(
        f"/api/notifications/{notification_id}/read"
    )

    assert read_response.status_code == 200

    read_data = read_response.get_json()

    assert read_data["success"] is True

    assert read_data["notification"]["id"] == (
        notification_id
    )

    assert read_data["notification"]["is_read"] is True

    # --------------------------------------------------------
    # Step 4:
    # Verify unread count becomes zero.
    # --------------------------------------------------------

    unread_response_after = client.get(
        "/api/notifications/unread-count"
    )

    assert unread_response_after.status_code == 200

    unread_data_after = (
        unread_response_after.get_json()
    )

    assert unread_data_after["unread_count"] == 0

    # --------------------------------------------------------
    # Step 5:
    # Verify database value was updated.
    # --------------------------------------------------------

    with app.app.app_context():

        saved_notification = (
            app.Notification.query
            .filter_by(id=notification_id)
            .first()
        )

        assert saved_notification is not None

        assert saved_notification.is_read is True


        # ============================================================
# IT-06
# ============================================================

def test_community_post_and_reaction_integration(client):
    """
    IT-06:

    Verify integration between:
        Community post API
        CommunityPost model
        Reaction model
        Database
        Updated reaction information
    """

    import app

    # --------------------------------------------------------
    # Create a test student.
    # --------------------------------------------------------

    with app.app.app_context():

        student = app.User(
            name="Community Test Student",
            email="community_test@example.com",
            password="test-password",
            role="student",
            is_approved=True
        )

        app.db.session.add(student)
        app.db.session.commit()

        student_id = student.id

    # --------------------------------------------------------
    # Simulate logged-in student.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:
        flask_session["user_id"] = student_id
        flask_session["user_role"] = "student"

    # --------------------------------------------------------
    # IT-06 Step 1:
    # Create a community post.
    #
    # Keep the post shorter than the application's
    # maximum allowed length.
    # --------------------------------------------------------

    post_data = {
        "content": "This is a positive community support message."
    }

    post_response = client.post(
        "/api/posts",
        json=post_data
    )

    # --------------------------------------------------------
    # Verify post creation.
    # --------------------------------------------------------

    assert post_response.status_code == 201

    post_result = post_response.get_json()

    assert post_result is not None

    assert "id" in post_result

    assert post_result["content"] == (
        "This is a positive community support message."
    )

    assert post_result["is_flagged"] is False

    assert "reactions" in post_result

    post_id = post_result["id"]

    # --------------------------------------------------------
    # Verify post was stored in the database.
    # --------------------------------------------------------

    with app.app.app_context():

        saved_post = (
            app.CommunityPost.query
            .filter_by(id=post_id)
            .first()
        )

        assert saved_post is not None

        assert saved_post.user_id == student_id

        assert saved_post.content == (
            "This is a positive community support message."
        )

        assert saved_post.is_flagged is False

    # --------------------------------------------------------
    # IT-06 Step 2:
    # Add a heart reaction to the post.
    # --------------------------------------------------------

    reaction_data = {
        "emoji": "heart"
    }

    reaction_response = client.post(
        f"/api/posts/{post_id}/react",
        json=reaction_data
    )

    # --------------------------------------------------------
    # Verify reaction API response.
    # --------------------------------------------------------

    assert reaction_response.status_code == 200

    reaction_result = reaction_response.get_json()

    assert reaction_result is not None

    assert reaction_result["id"] == post_id

    assert reaction_result["reactions"]["heart"] == 1

    assert "heart" in reaction_result["user_reactions"]

    # --------------------------------------------------------
    # Verify reaction was stored in the database.
    # --------------------------------------------------------

    with app.app.app_context():

        saved_reaction = (
            app.Reaction.query
            .filter_by(
                post_id=post_id,
                user_id=student_id,
                emoji="heart"
            )
            .first()
        )

        assert saved_reaction is not None

        assert saved_reaction.post_id == post_id

        assert saved_reaction.user_id == student_id

        assert saved_reaction.emoji == "heart"

    # --------------------------------------------------------
    # IT-06 Step 3:
    # Toggle the heart reaction off.
    # --------------------------------------------------------

    second_reaction_response = client.post(
        f"/api/posts/{post_id}/react",
        json=reaction_data
    )

    assert second_reaction_response.status_code == 200

    second_reaction_result = (
        second_reaction_response.get_json()
    )

    assert second_reaction_result is not None

    assert second_reaction_result["id"] == post_id

    assert second_reaction_result["reactions"]["heart"] == 0

    assert "heart" not in (
        second_reaction_result["user_reactions"]
    )

    # --------------------------------------------------------
    # Verify reaction was removed from database.
    # --------------------------------------------------------

    with app.app.app_context():

        removed_reaction = (
            app.Reaction.query
            .filter_by(
                post_id=post_id,
                user_id=student_id,
                emoji="heart"
            )
            .first()
        )

        assert removed_reaction is None


        # ============================================================
# IT-07
# ============================================================

def test_resources_and_exercises_integration(client):
    """
    IT-07:

    Verify integration between:
        Student authentication
        Resource API
        Resource database
        Exercise API
        Exercise database

    Also verify that inactive resources/exercises are not
    returned to students.
    """

    import app

    # --------------------------------------------------------
    # Create a test student.
    # --------------------------------------------------------

    with app.app.app_context():

        student = app.User(
            name="Resource Test Student",
            email="resource_test@example.com",
            password="test-password",
            role="student",
            is_approved=True
        )

        app.db.session.add(student)
        app.db.session.commit()

        student_id = student.id

        # ----------------------------------------------------
        # Create active and inactive resources.
        # ----------------------------------------------------

        active_resource = app.Resource(
            title="Test Stress Management Resource",
            description="Helpful stress management information.",
            category="Stress",
            content="Test resource content.",
            url="",
            icon="📄",
            is_active=True
        )

        inactive_resource = app.Resource(
            title="Inactive Test Resource",
            description="This resource should not be displayed.",
            category="Stress",
            content="Inactive resource content.",
            url="",
            icon="📄",
            is_active=False
        )

        app.db.session.add(active_resource)
        app.db.session.add(inactive_resource)

        # ----------------------------------------------------
        # Create active and inactive exercises.
        # ----------------------------------------------------

        active_exercise = app.Exercise(
            title="Test Breathing Exercise",
            description="A simple breathing exercise.",
            category="Stress",
            duration="5 minutes",
            instructions="Breathe slowly and deeply.",
            icon="🧘",
            media_url=None,
            is_active=True
        )

        inactive_exercise = app.Exercise(
            title="Inactive Test Exercise",
            description="This exercise should not be displayed.",
            category="Stress",
            duration="5 minutes",
            instructions="Inactive exercise instructions.",
            icon="🧘",
            media_url=None,
            is_active=False
        )

        app.db.session.add(active_exercise)
        app.db.session.add(inactive_exercise)

        app.db.session.commit()

    # --------------------------------------------------------
    # Simulate logged-in student.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:
        flask_session["user_id"] = student_id
        flask_session["user_role"] = "student"

    # ========================================================
    # STEP 1 — GET RESOURCES
    # ========================================================

    resource_response = client.get(
        "/api/resources"
    )

    # --------------------------------------------------------
    # Verify response.
    # --------------------------------------------------------

    assert resource_response.status_code == 200

    resources = resource_response.get_json()

    assert isinstance(resources, list)

    # --------------------------------------------------------
    # Verify active resource is returned.
    # --------------------------------------------------------

    active_resource_results = [
        resource
        for resource in resources
        if resource["title"]
        == "Test Stress Management Resource"
    ]

    assert len(active_resource_results) == 1

    returned_resource = active_resource_results[0]

    assert returned_resource["category"] == "Stress"

    assert returned_resource["description"] == (
        "Helpful stress management information."
    )

    assert returned_resource["is_active"] is True

    # --------------------------------------------------------
    # Verify inactive resource is NOT returned.
    # --------------------------------------------------------

    inactive_resource_results = [
        resource
        for resource in resources
        if resource["title"]
        == "Inactive Test Resource"
    ]

    assert len(inactive_resource_results) == 0

    # ========================================================
    # STEP 2 — RESOURCE CATEGORY FILTER
    # ========================================================

    filtered_resource_response = client.get(
        "/api/resources?category=Stress"
    )

    assert filtered_resource_response.status_code == 200

    filtered_resources = (
        filtered_resource_response.get_json()
    )

    assert isinstance(filtered_resources, list)

    # Every returned resource should belong to Stress.
    for resource in filtered_resources:
        assert resource["category"] == "Stress"

    # ========================================================
    # STEP 3 — GET EXERCISES
    # ========================================================

    exercise_response = client.get(
        "/api/exercises"
    )

    # --------------------------------------------------------
    # Verify response.
    # --------------------------------------------------------

    assert exercise_response.status_code == 200

    exercises = exercise_response.get_json()

    assert isinstance(exercises, list)

    # --------------------------------------------------------
    # Verify active exercise is returned.
    # --------------------------------------------------------

    active_exercise_results = [
        exercise
        for exercise in exercises
        if exercise["title"]
        == "Test Breathing Exercise"
    ]

    assert len(active_exercise_results) == 1

    returned_exercise = active_exercise_results[0]

    assert returned_exercise["category"] == "Stress"

    assert returned_exercise["duration"] == "5 minutes"

    assert returned_exercise["instructions"] == (
        "Breathe slowly and deeply."
    )

    assert returned_exercise["is_active"] is True

    # --------------------------------------------------------
    # Verify inactive exercise is NOT returned.
    # --------------------------------------------------------

    inactive_exercise_results = [
        exercise
        for exercise in exercises
        if exercise["title"]
        == "Inactive Test Exercise"
    ]

    assert len(inactive_exercise_results) == 0

    # ========================================================
    # STEP 4 — VERIFY DATABASE RECORDS
    # ========================================================

    with app.app.app_context():

        saved_resource = (
            app.Resource.query
            .filter_by(
                title="Test Stress Management Resource"
            )
            .first()
        )

        assert saved_resource is not None
        assert saved_resource.is_active is True

        saved_exercise = (
            app.Exercise.query
            .filter_by(
                title="Test Breathing Exercise"
            )
            .first()
        )

        assert saved_exercise is not None
        assert saved_exercise.is_active is True

        inactive_saved_resource = (
            app.Resource.query
            .filter_by(
                title="Inactive Test Resource"
            )
            .first()
        )

        assert inactive_saved_resource is not None
        assert inactive_saved_resource.is_active is False

        inactive_saved_exercise = (
            app.Exercise.query
            .filter_by(
                title="Inactive Test Exercise"
            )
            .first()
        )

        assert inactive_saved_exercise is not None
        assert inactive_saved_exercise.is_active is False



        # ============================================================
# IT-08
# ============================================================

def test_counsellor_dashboard_data_integration(client, monkeypatch):
    """
    IT-08:

    Verify integration between:
        CheckIn data
        Appointment data
        SOS alert data
        Counsellor dashboard API
    """

    import app

    # --------------------------------------------------------
    # Create a test counsellor.
    # --------------------------------------------------------

    with app.app.app_context():

        counsellor = app.User(
            name="Dashboard Test Counsellor",
            email="dashboard_counsellor@example.com",
            password="test-password",
            role="counsellor",
            is_approved=True
        )

        student = app.User(
            name="Dashboard Test Student",
            email="dashboard_student@example.com",
            password="test-password",
            role="student",
            is_approved=True
        )

        app.db.session.add(counsellor)
        app.db.session.add(student)
        app.db.session.commit()

        counsellor_id = counsellor.id
        student_id = student.id

        # ----------------------------------------------------
        # Create a current-week check-in.
        # ----------------------------------------------------

        checkin = app.CheckIn(
            user_id=student_id,
            age=22,
            gender="Male",
            academic_year=3,
            study_hours_per_day=5.0,
            exam_pressure=3.0,
            academic_performance=3.0,
            stress_level=2.0,
            sleep_hours=7.0,
            physical_activity=3.0,
            social_support=4.0,
            screen_time=4.0,
            internet_usage=5.0,
            financial_stress=2.0,
            family_expectation=3.0,
            risk_result="Low"
        )

        app.db.session.add(checkin)

        # ----------------------------------------------------
        # Create a pending appointment for the counsellor.
        # ----------------------------------------------------

        appointment = app.Appointment(
            student_id=student_id,
            counsellor_id=counsellor_id,
            requested_date=app.date.today(),
            time_slot="10:00",
            status="pending",
            notes="Dashboard integration test"
        )

        app.db.session.add(appointment)

        # ----------------------------------------------------
        # Create an SOS alert.
        #
        # SOSAlert intentionally does not store user identity.
        # ----------------------------------------------------

        sos_alert = app.SOSAlert()

        app.db.session.add(sos_alert)

        app.db.session.commit()

    # --------------------------------------------------------
    # Simulate logged-in counsellor.
    # --------------------------------------------------------

    with client.session_transaction() as flask_session:
        flask_session["user_id"] = counsellor_id
        flask_session["user_role"] = "counsellor"

    # --------------------------------------------------------
    # Call the actual counsellor dashboard API.
    # --------------------------------------------------------

    response = client.get(
        "/api/counsellor/data"
    )

    # --------------------------------------------------------
    # Verify HTTP response.
    # --------------------------------------------------------

    assert response.status_code == 200

    data = response.get_json()

    assert data is not None

    # --------------------------------------------------------
    # Verify summary section.
    # --------------------------------------------------------

    assert "summary" in data

    summary = data["summary"]

    assert "checkins_this_week" in summary
    assert "pending_appointments" in summary
    assert "good_percentage" in summary
    assert "sos_this_week" in summary

    # At least our newly created test records should be included.
    assert summary["checkins_this_week"] >= 1
    assert summary["pending_appointments"] >= 1
    assert summary["sos_this_week"] >= 1

    # --------------------------------------------------------
    # Verify risk distribution.
    # --------------------------------------------------------

    assert "risk_distribution" in data

    risk_distribution = data["risk_distribution"]

    assert isinstance(risk_distribution, list)

    assert len(risk_distribution) == 3

    risk_names = {
        item["name"]
        for item in risk_distribution
    }

    assert risk_names == {
        "Good",
        "Moderate",
        "Poor"
    }

    # Our "Low" result should be counted as "Good".
    good_entry = next(
        item
        for item in risk_distribution
        if item["name"] == "Good"
    )

    assert good_entry["value"] >= 1

    # --------------------------------------------------------
    # Verify appointment information.
    # --------------------------------------------------------

    assert "appointments" in data

    assert isinstance(data["appointments"], dict)

    # The pending appointment should contribute to the
    # pending appointment statistics.
    assert (
        data["summary"]["pending_appointments"] >= 1
    )

    # --------------------------------------------------------
    # Verify weekly trend is present.
    # --------------------------------------------------------

    assert "weekly_trend" in data

    assert isinstance(data["weekly_trend"], list)

    # --------------------------------------------------------
    # Verify SOS alerts are returned.
    # --------------------------------------------------------

    assert "sos_alerts" in data

    assert isinstance(data["sos_alerts"], list)

    assert len(data["sos_alerts"]) >= 1

    # --------------------------------------------------------
    # Verify the SOS record contains the expected fields.
    # --------------------------------------------------------

    first_sos = data["sos_alerts"][0]

    assert "id" in first_sos
    assert "created_at" in first_sos


    # ============================================================
# IT-09
# ============================================================

def test_weekly_wellbeing_digest_integration(client):
    """
    IT-09:

    Verify integration between:
        CheckIn data
        Journal data
        Streak data
        Resource data
        Weekly digest builder
    """

    import app
    from datetime import datetime, timedelta

    # --------------------------------------------------------
    # Create test student and supporting wellbeing data.
    # --------------------------------------------------------

    with app.app.app_context():

        student = app.User(
            name="Digest Test Student",
            email="digest_test@example.com",
            password="test-password",
            role="student",
            is_approved=True
        )

        app.db.session.add(student)
        app.db.session.commit()

        student_id = student.id

        # ----------------------------------------------------
        # Create a recent check-in with a high/poor-style
        # risk result so the digest recommends Stress/Anxiety/
        # Sleep resources.
        # ----------------------------------------------------

        checkin = app.CheckIn(
            user_id=student_id,
            age=22,
            gender="Male",
            academic_year=3,
            study_hours_per_day=5.0,
            exam_pressure=4.0,
            academic_performance=3.0,
            stress_level=4.0,
            sleep_hours=5.5,
            physical_activity=2.0,
            social_support=2.0,
            screen_time=6.0,
            internet_usage=6.0,
            financial_stress=3.0,
            family_expectation=4.0,
            risk_result="Poor",
            checkin_date=app.date.today()
        )

        app.db.session.add(checkin)

        # ----------------------------------------------------
        # Create recent journal entries with different moods.
        # ----------------------------------------------------

        journal_positive = app.Journal(
            user_id=student_id,
            content="I had a good and productive day.",
            emotion="joy",
            mood_group="Positive",
            created_at=datetime.utcnow() - timedelta(days=1)
        )

        journal_cautious = app.Journal(
            user_id=student_id,
            content="I feel a little worried about my exams.",
            emotion="fear",
            mood_group="Cautious",
            created_at=datetime.utcnow() - timedelta(days=2)
        )

        journal_negative = app.Journal(
            user_id=student_id,
            content="Today was difficult and exhausting.",
            emotion="sadness",
            mood_group="Negative",
            created_at=datetime.utcnow() - timedelta(days=3)
        )

        app.db.session.add(journal_positive)
        app.db.session.add(journal_cautious)
        app.db.session.add(journal_negative)

        # ----------------------------------------------------
        # Create current streak.
        # ----------------------------------------------------

        streak = app.Streak(
            user_id=student_id,
            current_streak=4,
            longest_streak=6,
            last_checkin_date=app.date.today(),
            badges="[]"
        )

        app.db.session.add(streak)

        # ----------------------------------------------------
        # Create resources matching the "Poor" risk result.
        # ----------------------------------------------------

        stress_resource = app.Resource(
            title="Managing Academic Stress",
            description="Helpful strategies for managing stress.",
            category="Stress",
            content="Stress management guidance.",
            url="",
            icon="📘",
            is_active=True
        )

        anxiety_resource = app.Resource(
            title="Managing Anxiety",
            description="Practical anxiety management guidance.",
            category="Anxiety",
            content="Anxiety management guidance.",
            url="",
            icon="🧘",
            is_active=True
        )

        inactive_resource = app.Resource(
            title="Inactive Stress Resource",
            description="This should not be recommended.",
            category="Stress",
            content="Inactive content.",
            url="",
            icon="📘",
            is_active=False
        )

        app.db.session.add(stress_resource)
        app.db.session.add(anxiety_resource)
        app.db.session.add(inactive_resource)

        app.db.session.commit()

    # --------------------------------------------------------
    # Execute the actual weekly digest builder.
    # --------------------------------------------------------

    with app.app.app_context():

        digest = app._build_weekly_digest_data(
            student_id
        )

    # --------------------------------------------------------
    # Verify weekly date range.
    # --------------------------------------------------------

    assert "week_start" in digest
    assert "week_end" in digest

    assert digest["week_end"] == app.date.today()

    # --------------------------------------------------------
    # Verify check-in and journal counts.
    # --------------------------------------------------------

    assert digest["checkin_count"] == 1
    assert digest["journal_count"] == 3

    # --------------------------------------------------------
    # Verify mood aggregation.
    # --------------------------------------------------------

    assert digest["positive"] == 1
    assert digest["cautious"] == 1
    assert digest["negative"] == 1

    # --------------------------------------------------------
    # When all mood counts are equal, Python's max() returns
    # the first matching key in insertion order.
    #
    # The application's dictionary order is:
    # Positive, Cautious, Negative
    # --------------------------------------------------------

    assert digest["mood_pattern"] == "Positive"

    # --------------------------------------------------------
    # Verify streak information.
    # --------------------------------------------------------

    assert digest["current_streak"] == 4

    # --------------------------------------------------------
    # Verify resource recommendations.
    # --------------------------------------------------------

    assert isinstance(
        digest["recommended_titles"],
        list
    )

    assert len(digest["recommended_titles"]) >= 1

    assert (
        "Managing Academic Stress"
        in digest["recommended_titles"]
    )

    # --------------------------------------------------------
    # Inactive resources must never be recommended.
    # --------------------------------------------------------

    assert (
        "Inactive Stress Resource"
        not in digest["recommended_titles"]
    )