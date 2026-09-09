from io import BytesIO

from docx import Document
from pypdf import PdfReader


PDF_CONTENT_TYPE = "application/pdf"
DOCX_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


def extract_text_from_pdf(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages).strip()


def extract_text_from_docx(content: bytes) -> str:
    document = Document(BytesIO(content))
    return "\n".join(
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ).strip()


def extract_text_from_document(
    filename: str,
    content_type: str | None,
    content: bytes,
) -> str:
    lowered_name = filename.casefold()

    if content_type == PDF_CONTENT_TYPE or lowered_name.endswith(".pdf"):
        return extract_text_from_pdf(content)

    if content_type == DOCX_CONTENT_TYPE or lowered_name.endswith(".docx"):
        return extract_text_from_docx(content)

    raise ValueError("Only PDF and DOCX files are supported.")
