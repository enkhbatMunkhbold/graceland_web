import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_restful import Api
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from sqlalchemy import MetaData

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)

is_production = os.environ.get('FLASK_ENV', '').lower() == 'production'

# Facebook Page integration (optional): set in env for sermon sync
FACEBOOK_PAGE_ID = os.environ.get('FACEBOOK_PAGE_ID', 'AzFmAomvrf9Pj1QbBf2CDIg').strip()
FACEBOOK_PAGE_ACCESS_TOKEN = os.environ.get('FACEBOOK_PAGE_ACCESS_TOKEN', '').strip()
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '').strip()
YOUTUBE_CHANNEL_ID = os.environ.get('YOUTUBE_CHANNEL_ID', 'UCXU8MsZmF7S2H-jfEecfs9w').strip()
GOOGLE_CALENDAR_API_KEY = os.environ.get('GOOGLE_CALENDAR_API_KEY', '').strip()
GOOGLE_CALENDAR_ID = os.environ.get('GOOGLE_CALENDAR_ID', 'info@gracelandbible.church').strip()
GOOGLE_CALENDAR_TIMEZONE = os.environ.get('GOOGLE_CALENDAR_TIMEZONE', 'America/Los_Angeles').strip()
GOOGLE_CALENDAR_SYNC_INTERVAL_SECONDS = int(os.environ.get('GOOGLE_CALENDAR_SYNC_INTERVAL_SECONDS', '3600'))
GOOGLE_CALENDAR_HISTORY_DAYS = int(os.environ.get('GOOGLE_CALENDAR_HISTORY_DAYS', '3650'))
GOOGLE_CALENDAR_FUTURE_DAYS = int(os.environ.get('GOOGLE_CALENDAR_FUTURE_DAYS', '730'))
# Comma-separated usernames treated as admins (in addition to users.is_admin)
ADMIN_USERNAMES = os.environ.get('ADMIN_USERNAMES', '').strip()
app.secret_key = os.environ.get('SECRET_KEY', 'local-development-only-change-me')

database_url = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
# SQLAlchemy no longer accepts the legacy postgres:// scheme used by some hosts.
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['SESSION_COOKIE_SECURE'] = is_production
app.config['SESSION_COOKIE_SAMESITE'] = 'None' if is_production else 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.json.compact = False

metadata = MetaData(naming_convention={
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
})

db = SQLAlchemy(metadata=metadata)
db.init_app(app)

api = Api(app)
cors_origins = [
    origin.strip()
    for origin in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    if origin.strip()
]
CORS(app, supports_credentials=True, origins=cors_origins)
bcrypt = Bcrypt(app)

ma = Marshmallow(app)
ma.init_app(app)
