from config import app, db
from flask_migrate import Migrate
import models  # Import models to register them with SQLAlchemy

# Initialize Flask-Migrate
migrate = Migrate(app, db)

if __name__ == '__main__':
    app.run(port=5555, debug=True)


