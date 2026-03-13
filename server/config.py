import os
from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_restful import Api
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from sqlalchemy import MetaData

app = Flask(__name__)

# Facebook Page integration (optional): set in env for sermon sync
FACEBOOK_PAGE_ID = os.environ.get('AzFmAomvrf9Pj1QbBf2CDIg', '').strip()
FACEBOOK_PAGE_ACCESS_TOKEN = os.environ.get('FACEBOOK_PAGE_ACCESS_TOKEN', '').strip()
app.secret_key = b'Y\xf1Xz\x00\xad|eQ\x80t \xca\x1a\x10K'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATION'] = False
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
