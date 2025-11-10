from marshmallow import validates, post_load, fields, ValidationError
from marshmallow_sqlalchemy import auto_field
from config import db, ma, bcrypt
from datetime import datetime, timezone

class User(db.Model):
  __tablename__ = 'users'

  id = db.Column(db.Integer, primary_key=True)
  username = db.Column(db.String(120), unique=True, nullable=False)
  email = db.Column(db.String(255), unique=True, nullable=False)
  _password_hash = db.Column(db.String(255), nullable=False)
  created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

  member = db.relationship('Member', backref='user', useList=False, cascade='all, delete')

  def set_password(self, password):
    if len(password) < 8:
      raise ValidationError('Password must be at least 8 characters long')
    
    password_hash = bcrypt.generate_password_hash(password)
    self._password_hash = password_hash.decode('utf-8')

  def authenticate(self, password):
    return bcrypt.check_password_hash(self._password_hash, password)
  
  def __repr__(self):
    return f'<User {self.username} >'
  
class Member(db.Model):
  __tablename__ = 'members'

  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
  first_name = db.Column(db.String(100), nullable=False)
  last_name = db.Column(db.String(100), nullable=False)
  phone = db.Column(db.String(20), unique=True, nullable=False)
  address = db.Column(db.Text)
  join_date = db.Column(db.Date)  

  def __repr__(self):
    return f'<Member {self.first_name} {self.last_name}>'

class GroupMember(db.Model):
  __tablename__ = 'group_members'

  id = db.Column(db.Integer, primary_key=True) 
  user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
  group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), unique=True, nullable=False)
  role = db.Column(db.String(60), nullable=False)
  join_date = db.Column(db.Date, default=lambda: datetime.now(timezone.utc))
