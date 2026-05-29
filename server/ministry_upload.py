import os
import uuid

ALLOWED_MINISTRY_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp',
    'mp4', 'webm', 'ogg', 'mov',
    'pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx',
    'txt', 'zip', 'csv',
}


def ministry_upload_allowed(filename):
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_MINISTRY_EXTENSIONS


def save_ministry_upload(app, slug, file_storage):
    ext = file_storage.filename.rsplit('.', 1)[1].lower()
    stored_name = f'{uuid.uuid4().hex}.{ext}'
    upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'ministry', slug)
    os.makedirs(upload_dir, exist_ok=True)
    file_storage.save(os.path.join(upload_dir, stored_name))
    return stored_name
