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

# Facebook Page integration (optional): set in env for sermon sync
FACEBOOK_PAGE_ID = os.environ.get('FACEBOOK_PAGE_ID', 'AzFmAomvrf9Pj1QbBf2CDIg').strip()
FACEBOOK_PAGE_ACCESS_TOKEN = os.environ.get('FACEBOOK_PAGE_ACCESS_TOKEN', '').strip()
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '').strip()
YOUTUBE_CHANNEL_ID = os.environ.get('YOUTUBE_CHANNEL_ID', 'UCXU8MsZmF7S2H-jfEecfs9w').strip()
GOOGLE_CALENDAR_API_KEY = os.environ.get('GOOGLE_CALENDAR_API_KEY', '').strip()
GOOGLE_CALENDAR_ID = os.environ.get('GOOGLE_CALENDAR_ID', 'info@gracelandbible.church').strip()
# Comma-separated usernames treated as admins (in addition to users.is_admin)
ADMIN_USERNAMES = os.environ.get('ADMIN_USERNAMES', '').strip()
app.secret_key = b'Y\xf1Xz\x00\xad|eQ\x80t \xca\x1a\x10K'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATION'] = False
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.json.compact = False

metadata = MetaData(naming_convention={
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
})

db = SQLAlchemy(metadata=metadata)
db.init_app(app)

api = Api(app)
CORS(app, supports_credentials=True, origins=['http://localhost:3000'])
bcrypt = Bcrypt(app)

ma = Marshmallow(app)
ma.init_app(app)
