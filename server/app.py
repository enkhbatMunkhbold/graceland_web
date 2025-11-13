from config import app, db, api
from flask import session, request
from flask_restful import Resource
from flask_migrate import Migrate
from marshmallow.exceptions import ValidationError
import models  # Import models to register them with SQLAlchemy
import schemas

# Initialize Flask-Migrate
migrate = Migrate(app, db)

@app.route('/')
def index():
    return '<h1>Project Server</h1>'



if __name__ == '__main__':
    app.run(port=5555, debug=True)


