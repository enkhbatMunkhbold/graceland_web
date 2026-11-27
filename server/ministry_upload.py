import os
import uuid
from io import BytesIO

from PIL import Image, ImageOps


MAX_MINISTRY_IMAGE_DIMENSION = 320
MINISTRY_IMAGE_QUALITY = 72
MINISTRY_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

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
    stored_path = os.path.join(upload_dir, stored_name)
    file_storage.save(stored_path)
    optimize_ministry_image(stored_path)
    return stored_name


def optimize_ministry_image(path):
    """Resize a ministry image in place; non-images and animated GIFs are untouched."""
    extension = os.path.splitext(path)[1].lower().lstrip('.')
    if extension not in MINISTRY_IMAGE_EXTENSIONS or not os.path.isfile(path):
        return False

    temporary_path = f'{path}.optimizing'
    try:
        with Image.open(path) as source:
            if max(source.size) <= MAX_MINISTRY_IMAGE_DIMENSION and os.path.getsize(path) <= 250 * 1024:
                return False
            image = ImageOps.exif_transpose(source)
            image.thumbnail(
                (MAX_MINISTRY_IMAGE_DIMENSION, MAX_MINISTRY_IMAGE_DIMENSION),
                Image.Resampling.LANCZOS,
            )

            save_options = {'optimize': True}
            if extension in {'jpg', 'jpeg'}:
                if image.mode not in {'RGB', 'L'}:
                    image = image.convert('RGB')
                save_options.update(format='JPEG', quality=MINISTRY_IMAGE_QUALITY, progressive=True)
            elif extension == 'webp':
                save_options.update(format='WEBP', quality=MINISTRY_IMAGE_QUALITY, method=6)
            else:
                save_options.update(format='PNG', compress_level=9)

            image.save(temporary_path, **save_options)

        if os.path.getsize(temporary_path) < os.path.getsize(path):
            os.replace(temporary_path, path)
            return True
        os.remove(temporary_path)
    except (OSError, ValueError):
        if os.path.exists(temporary_path):
            os.remove(temporary_path)
    return False


def optimize_ministry_image_bytes(data, filename):
    """Return a smaller, resized image payload when safe; otherwise return the original."""
    extension = os.path.splitext(filename or '')[1].lower().lstrip('.')
    if extension not in MINISTRY_IMAGE_EXTENSIONS:
        return data
    try:
        with Image.open(BytesIO(data)) as source:
            if max(source.size) <= MAX_MINISTRY_IMAGE_DIMENSION and len(data) <= 250 * 1024:
                return data
            image = ImageOps.exif_transpose(source)
            image.thumbnail(
                (MAX_MINISTRY_IMAGE_DIMENSION, MAX_MINISTRY_IMAGE_DIMENSION),
                Image.Resampling.LANCZOS,
            )
            output = BytesIO()
            save_options = {'optimize': True}
            if extension in {'jpg', 'jpeg'}:
                if image.mode not in {'RGB', 'L'}:
                    image = image.convert('RGB')
                save_options.update(format='JPEG', quality=MINISTRY_IMAGE_QUALITY, progressive=True)
            elif extension == 'webp':
                save_options.update(format='WEBP', quality=MINISTRY_IMAGE_QUALITY, method=6)
            else:
                save_options.update(format='PNG', compress_level=9)
            image.save(output, **save_options)
            optimized = output.getvalue()
            return optimized if len(optimized) < len(data) else data
    except (OSError, ValueError):
        return data
