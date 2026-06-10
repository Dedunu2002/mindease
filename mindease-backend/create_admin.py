# create_admin.py — run ONCE to create your admin account
# Run: python create_admin.py

from app import app, db, User
import bcrypt

with app.app_context():
    email    = 'admin@mindease.lk'
    password = 'admin123'         # change this to something strong
    hashed   = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    existing = User.query.filter_by(email=email).first()
    if existing:
        print('Admin already exists')
    else:
        admin = User(name='Admin', email=email,
                     password=hashed, role='admin', is_approved=True)
        db.session.add(admin)
        db.session.commit()
        print(f'✅ Admin created: {email} / {password}')