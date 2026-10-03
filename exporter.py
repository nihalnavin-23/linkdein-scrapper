"""
LinkedIn Lead & Talent Scraper Pro - Exporter Module
Exports scraped candidates to CSV, Excel (.xlsx), and JSON formats with styled formatting.
"""

import os
import csv
import json
from datetime import datetime
from typing import List, Dict, Any

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORTS_DIR = os.path.join(BASE_DIR, 'exports')
os.makedirs(EXPORTS_DIR, exist_ok=True)


def export_to_csv(leads: List[Dict[str, Any]], filename: str = "") -> str:
    """Exports leads to a UTF-8-BOM CSV file (opens cleanly in Excel without encoding artifacts)."""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"linkedin_leads_{timestamp}.csv"
        
    filepath = os.path.join(EXPORTS_DIR, filename)
    
    headers = [
        "Full Name", "Headline", "Current Role", "Company", "Location", 
        "Phone Number", "Email Address", "LinkedIn Profile URL", 
        "Skills", "Experience (Years)", "Status", "Scraped At"
    ]
    
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for lead in leads:
            skills_str = ", ".join(lead.get("skills", [])) if isinstance(lead.get("skills"), list) else str(lead.get("skills", ""))
            writer.writerow([
                lead.get("name", ""),
                lead.get("headline", ""),
                lead.get("role", ""),
                lead.get("company", ""),
                lead.get("location", ""),
                lead.get("phone", ""),
                lead.get("email", ""),
                lead.get("profile_url", ""),
                skills_str,
                lead.get("experience_years", ""),
                lead.get("status_badge", ""),
                lead.get("scraped_at", "")
            ])
            
    return filepath


def export_to_excel(leads: List[Dict[str, Any]], filename: str = "") -> str:
    """
    Exports leads to a styled Excel workbook (.xlsx) with custom theme headers,
    borders, auto-fitted columns, and active hyperlink formulas.
    """
    if not OPENPYXL_AVAILABLE:
        # Fallback to CSV if openpyxl is not available
        return export_to_csv(leads, filename.replace(".xlsx", ".csv"))
        
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"linkedin_leads_{timestamp}.xlsx"
        
    filepath = os.path.join(EXPORTS_DIR, filename)
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Scraped Talent Leads"
    
    # Enable gridlines
    ws.views.sheetView[0].showGridLines = True
    
    # Headers
    headers = [
        "Full Name", "Headline", "Current Role", "Company", "Location", 
        "Phone Number", "Email Address", "LinkedIn Profile URL", 
        "Key Skills", "Experience (Yrs)", "Contact Status"
    ]
    ws.append(headers)
    
    # Header Styling: Dark Navy Glass Theme (#1E293B / #0EA5E9)
    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )
    
    ws.row_dimensions[1].height = 28
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_align
        cell.border = thin_border
        
    # Append Rows
    for row_idx, lead in enumerate(leads, start=2):
        skills_str = ", ".join(lead.get("skills", [])) if isinstance(lead.get("skills"), list) else str(lead.get("skills", ""))
        profile_url = lead.get("profile_url", "")
        
        ws.append([
            lead.get("name", ""),
            lead.get("headline", ""),
            lead.get("role", ""),
            lead.get("company", ""),
            lead.get("location", ""),
            lead.get("phone", ""),
            lead.get("email", ""),
            profile_url,
            skills_str,
            lead.get("experience_years", ""),
            lead.get("status_badge", "")
        ])
        
        ws.row_dimensions[row_idx].height = 22
        
        # Style row cells
        is_even = (row_idx % 2 == 0)
        row_fill = PatternFill(start_color="F8FAFC" if is_even else "FFFFFF", fill_type="solid")
        
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.font = Font(name="Segoe UI", size=10)
            cell.fill = row_fill
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")
            
            # Special formatting for phone & email
            if col_idx == 6 and lead.get("raw_phone"):
                cell.font = Font(name="Segoe UI", size=10, bold=True, color="047857") # Emerald
            elif col_idx == 7 and lead.get("raw_email"):
                cell.font = Font(name="Segoe UI", size=10, bold=True, color="0369A1") # Sky blue
            elif col_idx == 8 and profile_url:
                cell.hyperlink = profile_url
                cell.font = Font(name="Segoe UI", size=10, color="2563EB", underline="single")
                
    # Auto-adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 12), 45)
        
    wb.save(filepath)
    return filepath


def export_to_json(leads: List[Dict[str, Any]], filename: str = "") -> str:
    """Exports leads to a structured JSON file."""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"linkedin_leads_{timestamp}.json"
        
    filepath = os.path.join(EXPORTS_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)
        
    return filepath
