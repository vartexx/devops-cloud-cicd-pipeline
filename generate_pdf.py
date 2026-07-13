import os
import re
from fpdf import FPDF

class PDFReport(FPDF):
    def header(self):
        # Draw top banner line
        self.set_fill_color(99, 102, 241) # Indigo
        self.rect(0, 0, 210, 4, 'F')
        
        # Header text
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, 'Internship Project Report | Cloud & Infrastructure Automation Division', 0, 1, 'R')
        self.ln(2)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        # Explicit cell widths (90mm + 90mm = 180mm printable width)
        self.cell(90, 10, f'Page {self.page_no()}/{{nb}}', 0, 0, 'L')
        self.cell(90, 10, 'Submitted by: Harsh Kumar', 0, 1, 'R')

def build_pdf():
    pdf = PDFReport()
    pdf.alias_nb_pages()
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    md_path = 'DevOps_Pipeline_Report.md'
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found.")
        return

    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_code_block = False
    code_text = ""

    for line in lines:
        line_strip = line.strip()
        pdf.set_x(15.00) # Reset cursor to left margin
        
        # Handle Code Block fences
        if line_strip.startswith('```'):
            if in_code_block:
                # Write the collected code block to PDF
                pdf.set_font('Courier', '', 8.5)
                pdf.set_text_color(50, 50, 50)
                pdf.set_fill_color(245, 247, 250)
                
                # Draw light background box for code blocks
                pdf.multi_cell(0, 4.5, code_text, border=1, fill=True)
                pdf.ln(4)
                code_text = ""
                in_code_block = False
            else:
                in_code_block = True
            continue

        # If we are inside a code block, collect the text
        if in_code_block:
            # Replace box-drawing unicode characters with ASCII equivalents for clean PDF rendering
            ascii_line = line.replace('├──', '|--').replace('└──', '|--').replace('│', '|').replace('─', '-')
            code_text += ascii_line
            continue

        # Parse Markdown syntax
        # Image link: ![alt](filename)
        img_match = re.search(r'!\[.*?\]\((.*?)\)', line)
        if img_match:
            img_filename = img_match.group(1)
            if os.path.exists(img_filename):
                pdf.ln(5)
                # Render centered image keeping aspect ratio
                # Width is set to 160mm to fit printable margins (A4 is 210mm wide, margins 15mm left/right)
                pdf.image(img_filename, x=25, w=160)
                pdf.ln(5)
            else:
                pdf.set_font('Helvetica', 'I', 10)
                pdf.set_text_color(239, 68, 68)
                pdf.cell(0, 8, f"[Image Placeholder: {img_filename} not found in directory]", 0, 1)
            continue

        # Title / Main Header: # Header
        if line.startswith('# '):
            title_text = line[2:].strip()
            pdf.ln(8)
            pdf.set_font('Helvetica', 'B', 18)
            pdf.set_text_color(99, 102, 241) # Indigo primary
            pdf.multi_cell(0, 10, title_text)
            pdf.ln(2)
            continue

        # Section Header: ## Header
        if line.startswith('## '):
            h2_text = line[3:].strip()
            pdf.ln(6)
            pdf.set_font('Helvetica', 'B', 13)
            pdf.set_text_color(6, 182, 212) # Cyan secondary
            pdf.multi_cell(0, 8, h2_text)
            pdf.ln(2)
            continue

        # Subsection Header: ### Header
        if line.startswith('### '):
            h3_text = line[4:].strip()
            pdf.ln(4)
            pdf.set_font('Helvetica', 'B', 11)
            pdf.set_text_color(31, 41, 55) # Dark gray
            pdf.multi_cell(0, 6, h3_text)
            pdf.ln(2)
            continue

        # Bullet List Item: * Item or - Item
        list_match = re.match(r'^\s*[\*\-]\s+(.*)', line)
        if list_match:
            bullet_text = list_match.group(1).strip()
            # Clean bold markers: **text** -> text
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'\1', bullet_text)
            
            pdf.set_font('Helvetica', '', 10.5)
            pdf.set_text_color(55, 65, 81)
            pdf.multi_cell(0, 6, f"  * {bullet_text}")
            continue

        # Skip empty lines
        if not line_strip:
            # Only add small spacing if we aren't in a block
            pdf.ln(2)
            continue

        # Regular Paragraph
        paragraph_text = line_strip
        # Clean bold markers: **text** -> text
        paragraph_text = re.sub(r'\*\*(.*?)\*\*', r'\1', paragraph_text)
        
        pdf.set_font('Helvetica', '', 10.5)
        pdf.set_text_color(55, 65, 81)
        pdf.multi_cell(0, 5.5, paragraph_text)
        pdf.ln(2)

    output_pdf_path = 'DevOps_Pipeline_Report.pdf'
    pdf.output(output_pdf_path)
    print(f"Success: PDF generated successfully at '{output_pdf_path}'")

if __name__ == '__main__':
    build_pdf()
