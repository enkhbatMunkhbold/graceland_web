import html
import os
import re
import uuid

import bleach
import mammoth
from pypdf import PdfReader

from ministry_upload import optimize_ministry_image


DOCUMENT_EXTENSIONS = {'docx', 'pdf'}
MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
ALLOWED_TAGS = {
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 's', 'blockquote',
    'section', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
}
ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    'ol': ['start'],
}
IMAGE_EXTENSIONS = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
}


class MinistryDocumentError(ValueError):
    pass


def ministry_document_allowed(filename):
    return bool(
        filename
        and '.' in filename
        and filename.rsplit('.', 1)[1].lower() in DOCUMENT_EXTENSIONS
    )


def _document_directory(app, slug):
    directory = os.path.join(app.config['UPLOAD_FOLDER'], 'ministry', slug)
    os.makedirs(directory, exist_ok=True)
    return directory


def _public_url(slug, stored_name):
    return '/uploads/ministry/{}/{}'.format(slug, stored_name)


def _save_bytes(app, slug, data, extension):
    extension = re.sub(r'[^a-z0-9]', '', extension.lower()) or 'bin'
    stored_name = '{}.{}'.format(uuid.uuid4().hex, extension)
    path = os.path.join(_document_directory(app, slug), stored_name)
    with open(path, 'wb') as output:
        output.write(data)
    optimize_ministry_image(path)
    return _public_url(slug, stored_name)


def _sanitize_imported_html(value):
    cleaned = bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols={'http', 'https', 'mailto', 'tel'},
        strip=True,
        strip_comments=True,
    )
    cleaned = re.sub(
        r'<img(?![^>]*\bloading=)',
        '<img loading="lazy" decoding="async"',
        cleaned,
    )
    return bleach.linkifier.Linker(
        callbacks=[bleach.callbacks.nofollow, bleach.callbacks.target_blank]
    ).linkify(cleaned)


def _convert_docx(app, slug, path):
    def convert_image(image):
        content_type = (image.content_type or '').lower()
        extension = IMAGE_EXTENSIONS.get(content_type)
        if not extension:
            return {'src': ''}
        with image.open() as image_file:
            return {'src': _save_bytes(app, slug, image_file.read(), extension)}

    with open(path, 'rb') as source:
        result = mammoth.convert_to_html(
            source,
            convert_image=mammoth.images.img_element(convert_image),
        )
    warnings = [message.message for message in result.messages]
    return _sanitize_imported_html(result.value), warnings


def _pdf_text_html(text):
    paragraphs = re.split(r'\n\s*\n', (text or '').strip())
    output = []
    for paragraph in paragraphs:
        lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
        if lines:
            output.append('<p>{}</p>'.format('<br>'.join(html.escape(line) for line in lines)))
    return ''.join(output)


def _convert_pdf(app, slug, path):
    try:
        reader = PdfReader(path)
        if reader.is_encrypted and not reader.decrypt(''):
            raise MinistryDocumentError('Password-protected PDF files are not supported')
    except MinistryDocumentError:
        raise
    except Exception as error:
        raise MinistryDocumentError('The PDF could not be read') from error

    sections = []
    warnings = []
    extracted_image_count = 0
    has_text = False
    for page_number, page in enumerate(reader.pages, start=1):
        try:
            text_content = page.extract_text() or ''
            has_text = has_text or bool(text_content.strip())
        except Exception:
            text_content = ''
            warnings.append('Text could not be extracted from page {}'.format(page_number))
        page_html = _pdf_text_html(text_content)

        image_html = []
        try:
            for image in page.images:
                extension = os.path.splitext(image.name or '')[1].lower().lstrip('.')
                if extension == 'jpeg':
                    extension = 'jpg'
                if extension not in {'png', 'jpg', 'gif', 'webp'}:
                    continue
                url = _save_bytes(app, slug, image.data, extension)
                image_html.append(
                    '<img src="{}" alt="Image from page {}" loading="lazy">'.format(
                        html.escape(url, quote=True), page_number
                    )
                )
                extracted_image_count += 1
        except Exception:
            warnings.append('Some images could not be extracted from page {}'.format(page_number))

        if page_html or image_html:
            sections.append('<section>{}{}</section>'.format(page_html, ''.join(image_html)))

    if not sections:
        raise MinistryDocumentError(
            'No text or images could be extracted. Scanned PDFs require OCR before upload.'
        )
    if not has_text:
        warnings.append('This PDF contains little or no searchable text; OCR may be required')
    if extracted_image_count == 0:
        warnings.append('No standalone images were found in the PDF')
    return _sanitize_imported_html(''.join(sections)), warnings


def import_ministry_document(app, slug, file_storage):
    if not ministry_document_allowed(file_storage.filename):
        raise MinistryDocumentError('Choose a .docx or .pdf file')

    original_name = os.path.basename(file_storage.filename).strip()[:255]
    extension = original_name.rsplit('.', 1)[1].lower()
    data = file_storage.read(MAX_DOCUMENT_BYTES + 1)
    if not data:
        raise MinistryDocumentError('The uploaded document is empty')
    if len(data) > MAX_DOCUMENT_BYTES:
        raise MinistryDocumentError('Documents must be 20 MB or smaller')

    stored_name = '{}.{}'.format(uuid.uuid4().hex, extension)
    stored_path = os.path.join(_document_directory(app, slug), stored_name)
    with open(stored_path, 'wb') as output:
        output.write(data)

    try:
        if extension == 'docx':
            content_html, warnings = _convert_docx(app, slug, stored_path)
        else:
            content_html, warnings = _convert_pdf(app, slug, stored_path)
    except Exception:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise

    if not content_html.strip():
        os.remove(stored_path)
        raise MinistryDocumentError('No displayable content was found in this document')

    return {
        'type': 'imported-document',
        'html': content_html,
        'originalName': original_name,
        'originalUrl': _public_url(slug, stored_name),
        'sourceType': extension,
        'warnings': warnings[:20],
    }
