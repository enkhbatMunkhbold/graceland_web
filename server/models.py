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

  member = db.relationship('Member', backref='user', uselist=False, cascade='all, delete')

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

  def __repr__(self):
    return f'<GroupMember {self.id}: {self.role}>'

class Group(db.Model):
  __tablename__ = 'groups'

  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(255), nullable=True)
  description = db.Column(db.Text)
  group_type = db.Column(db.String(50), default='other')
  parent_group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
  leader_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
  meeting_day = db.Column(db.String(30))
  meeting_time = db.Column(db.Time)
  location = db.Column(db.String(255))

  def __repr__(self):
    return f'<Group {self.name}>'
  
class Event(db.Model):
  __tablename__ = 'events'

  id = db.Column(db.Integer, primary_key=True)
  title = db.Column(db.String(255), nullable=False)
  description = db.Column(db.Text)
  start_datetime = db.Column(db.DateTime, nullable=False)
  end_datetime = db.Column(db.DateTime)
  location = db.Column(db.Text)
  max_attendees = db.Column(db.Integer)

  registrations = db.relationship('EventRegistration', backref='event', cascade='all, delete-orphan')

  def __repr__(self):
    return f'<Event {self.title}>'

class EventRegistration(db.Model):
  __tablename__ = 'event_registrations'

  id = db.Column(db.Integer, primary_key=True)
  event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False)
  user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
  registration_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
  guests_count = db.Column(db.Integer, default=0)
  status = db.Column(db.String(20), default='confirmed')

  def __repr__(self):
    return f'<EventRegistration {self.id} - {self.registration_date}>'

class Sermon(db.Model):
  __tablename__ = 'sermons'
  
  id = db.Column(db.Integer, primary_key=True)
  title = db.Column(db.String(255), nullable=False)
  speaker_name = db.Column(db.String(100))
  date = db.Column(db.Date, nullable=False)
  scripture_reference = db.Column(db.String(255))
  notes = db.Column(db.Text)
  audio_url = db.Column(db.String(500))
  video_url = db.Column(db.String(500))

  def __repr__(self):
    return f'<Sermon {self.title}>'
    
class Donation(db.Model):
  __tablename__ = 'donations'
  
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
  amount = db.Column(db.Numeric(10, 2), nullable=False)
  date = db.Column(db.DateTime, default=datetime.utcnow)
  payment_method = db.Column(db.String(50))
  designation = db.Column(db.String(100))

  def __repr__(self):
    return f'<Donation {self.id}: {self.amount}>'

class PrayerRequest(db.Model):
  __tablename__ = 'prayer_requests'
  
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
  request_text = db.Column(db.Text, nullable=False)
  is_public = db.Column(db.Boolean, default=False)
  status = db.Column(db.String(20), default='pending')
  date_submitted = db.Column(db.DateTime, default=datetime.utcnow)

  def __repr__(self):
    return f'<PrayerRequest {self.request_text}>'
  
class Page(db.Model):
  __tablename__ = 'pages'
  
  id = db.Column(db.Integer, primary_key=True)
  title = db.Column(db.String(255), nullable=False)
  slug = db.Column(db.String(255), unique=True, nullable=False)
  content = db.Column(db.Text)
  status = db.Column(db.String(20), default='draft')

  def __repr__(self):
    return f'<Page {self.title}>'

class Announcement(db.Model):
  __tablename__ = 'announcements'
  
  id = db.Column(db.Integer, primary_key=True)
  title = db.Column(db.String(255), nullable=False)
  content = db.Column(db.Text)
  author_id = db.Column(db.Integer, db.ForeignKey('users.id'))
  publish_date = db.Column(db.DateTime, default=datetime.utcnow)
  expire_date = db.Column(db.DateTime)
  
  author = db.relationship('User')

  def __repr__(self):
    return f'<Announcement {self.title}>'
  
class Media(db.Model):
  __tablename__ = 'media'
  
  id = db.Column(db.Integer, primary_key=True)
  filename = db.Column(db.String(255), nullable=False)
  file_path = db.Column(db.String(500), nullable=False)
  file_type = db.Column(db.String(50))
  uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
  upload_date = db.Column(db.DateTime, default=datetime.utcnow)
  
  uploader = db.relationship('User')

  def __repr__(self):
    return f'<Media {self.filename}>'


class ContactMessage(db.Model):
  __tablename__ = 'contact_messages'
  
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
  name = db.Column(db.String(100))
  email = db.Column(db.String(255), nullable=False)
  subject = db.Column(db.String(255))
  message = db.Column(db.Text, nullable=False)
  date = db.Column(db.DateTime, default=datetime.utcnow)
  status = db.Column(db.String(20), default='new')

  def __repr__(self):
    return f'<ContactMessage {self.name}>'
  
class SiteSetting(db.Model):
  __tablename__ = 'site_settings'
  
  id = db.Column(db.Integer, primary_key=True)
  key = db.Column(db.String(100), unique=True, nullable=False)
  value = db.Column(db.Text)
  description = db.Column(db.String(255))

  def __repr__(self):
    return f'<SiteSetting {self.value}>'


class NavigationMenu(db.Model):
  __tablename__ = 'navigation_menus'
  
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(100), nullable=False)
  location = db.Column(db.String(50))
  
  items = db.relationship('NavigationItem', backref='menu', cascade='all, delete-orphan')

  def __repr__(self):
    return f'<NavigationMenu {self.name}>'

class NavigationItem(db.Model):
  __tablename__ = 'navigation_items'
  
  id = db.Column(db.Integer, primary_key=True)
  menu_id = db.Column(db.Integer, db.ForeignKey('navigation_menus.id'), nullable=False)
  parent_id = db.Column(db.Integer, db.ForeignKey('navigation_items.id'), nullable=True)
  label = db.Column(db.String(100), nullable=False)
  url = db.Column(db.String(255))
  order = db.Column(db.Integer, default=0)
  
  children = db.relationship('NavigationItem', backref=db.backref('parent', remote_side=[id]))

  def __repr__(self):
    return f'<NavigationItem {self.label}>'