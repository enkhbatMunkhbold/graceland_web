import io
import tempfile
import unittest
import zipfile

from flask import Flask
from pypdf import PdfWriter
from werkzeug.datastructures import FileStorage

from ministry_document_import import (
    MinistryDocumentError,
    _sanitize_imported_html,
    import_ministry_document,
    ministry_document_allowed,
)


def simple_docx(text):
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>'''
    relationships = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>'''
    document = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:p><w:r><w:t>{}</w:t></w:r></w:p></w:body>
    </w:document>'''.format(text)
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as package:
        package.writestr('[Content_Types].xml', content_types)
        package.writestr('_rels/.rels', relationships)
        package.writestr('word/document.xml', document)
    output.seek(0)
    return output


class MinistryDocumentImportTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.app = Flask(__name__)
        self.app.config['UPLOAD_FOLDER'] = self.directory.name

    def test_only_word_and_pdf_documents_are_accepted(self):
        self.assertTrue(ministry_document_allowed('ministry.docx'))
        self.assertTrue(ministry_document_allowed('ministry.PDF'))
        self.assertFalse(ministry_document_allowed('ministry.doc'))
        self.assertFalse(ministry_document_allowed('photo.jpg'))

    def test_docx_is_converted_once_to_safe_native_html(self):
        file_storage = FileStorage(
            stream=simple_docx('Welcome to the ministry'),
            filename='Ministry update.docx',
        )

        result = import_ministry_document(self.app, 'children', file_storage)

        self.assertEqual(result['type'], 'imported-document')
        self.assertIn('<p>Welcome to the ministry</p>', result['html'])
        self.assertEqual(result['originalName'], 'Ministry update.docx')
        self.assertTrue(result['originalUrl'].startswith('/uploads/ministry/children/'))

    def test_database_asset_callback_receives_original_document(self):
        stored = []

        def save_asset(data, content_type, filename):
            stored.append((data, content_type, filename))
            return '/ministry-assets/{}'.format(len(stored))

        file_storage = FileStorage(
            stream=simple_docx('Persistent content'),
            filename='Persistent update.docx',
        )
        result = import_ministry_document(
            self.app,
            'men',
            file_storage,
            save_asset=save_asset,
        )

        self.assertEqual(result['originalUrl'], '/ministry-assets/1')
        self.assertEqual(stored[0][1], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        self.assertEqual(stored[0][2], 'Persistent update.docx')

    def test_imported_html_strips_scripts_and_event_handlers(self):
        cleaned = _sanitize_imported_html(
            '<p onclick="bad()">Safe</p><script>alert(1)</script>'
        )
        self.assertIn('<p>Safe</p>', cleaned)
        self.assertNotIn('onclick', cleaned)
        self.assertNotIn('<script', cleaned)

    def test_image_only_pdf_explains_that_ocr_is_required(self):
        pdf = io.BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        writer.write(pdf)
        pdf.seek(0)
        file_storage = FileStorage(stream=pdf, filename='scan.pdf')

        with self.assertRaisesRegex(MinistryDocumentError, 'OCR'):
            import_ministry_document(self.app, 'women', file_storage)


if __name__ == '__main__':
    unittest.main()
