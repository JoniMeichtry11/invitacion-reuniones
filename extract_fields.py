import PyPDF2

pdf_path = r"c:\Users\Joni - personal\work\Developer\2025\asistencia-reuniones\public\S-3_S.pdf"

with open(pdf_path, 'rb') as file:
    reader = PyPDF2.PdfReader(file)
    for i, page in enumerate(reader.pages):
        print(f"Page {i+1}:")
        text = page.extract_text()
        print(text)
        print("===")
