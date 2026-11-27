import html
import os
import re
import uuid
import zipfile

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
    'img': ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'class'],
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


def _docx_image_layouts(path):
    """Return Word drawing layouts in document order for Mammoth's image callbacks."""
    try:
        with zipfile.ZipFile(path) as package:
            document_xml = package.read('word/document.xml').decode('utf-8')
    except (KeyError, OSError, UnicodeDecodeError, zipfile.BadZipFile):
        return []

    layouts = []
    drawings = re.finditer(
        r'<wp:(anchor|inline)\b[\s\S]*?</wp:\1>',
        document_xml,
    )
    for drawing in drawings:
        if drawing.group(1) != 'anchor':
            layouts.append('inline')
            continue
        alignment = re.search(
            r'<wp:positionH\b[^>]*>[\s\S]*?<wp:align>(left|right|center|inside|outside)</wp:align>',
            drawing.group(0),
        )
        side = alignment.group(1) if alignment else 'left'
        if side in {'right', 'outside'}:
            layouts.append('wrap-right')
        elif side in {'left', 'inside'}:
            layouts.append('wrap-left')
        else:
            layouts.append('inline')
    return layouts


def _convert_docx(app, slug, path, save_asset=None):
    image_layouts = _docx_image_layouts(path)
    image_index = 0

    def convert_image(image):
        nonlocal image_index
        content_type = (image.content_type or '').lower()
        extension = IMAGE_EXTENSIONS.get(content_type)
        if not extension:
            return {'src': ''}
        layout = image_layouts[image_index] if image_index < len(image_layouts) else 'inline'
        image_index += 1
        attributes = {}
        if layout in {'wrap-left', 'wrap-right'}:
            attributes['class'] = 'ministry-image-{}'.format(layout)
        with image.open() as image_file:
            data = image_file.read()
            if save_asset:
                attributes['src'] = save_asset(data, content_type, 'image.{}'.format(extension))
            else:
                attributes['src'] = _save_bytes(app, slug, data, extension)
            return attributes

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


def _convert_pdf(app, slug, path, save_asset=None):
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
                if save_asset:
                    url = save_asset(
                        image.data,
                        'image/{}'.format('jpeg' if extension == 'jpg' else extension),
                        image.name or 'image.{}'.format(extension),
                    )
                else:
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


def import_ministry_document(app, slug, file_storage, save_asset=None):
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
            content_html, warnings = _convert_docx(app, slug, stored_path, save_asset)
        else:
            content_html, warnings = _convert_pdf(app, slug, stored_path, save_asset)
    except Exception:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise

    if not content_html.strip():
        os.remove(stored_path)
        raise MinistryDocumentError('No displayable content was found in this document')

    if save_asset:
        original_url = save_asset(
            data,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            if extension == 'docx' else 'application/pdf',
            original_name,
        )
        os.remove(stored_path)
    else:
        original_url = _public_url(slug, stored_name)

    return {
        'type': 'imported-document',
        'html': content_html,
        'originalName': original_name,
        'originalUrl': original_url,
        'sourceType': extension,
        'warnings': warnings[:20],
    }
