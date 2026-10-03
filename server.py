"""
LinkedIn Lead & Talent Scraper Pro - Local Web Server & API
Serves the Glassmorphic Dashboard, executes lead scraping pipelines,
generates tailored outreach notes, and handles instant CSV/Excel/JSON exports.
"""

import os
import sys
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

# Enforce UTF-8 output streams on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from scraper_engine import search_and_scrape_linkedin_leads
from exporter import export_to_csv, export_to_excel, export_to_json, EXPORTS_DIR
from outreach_generator import generate_outreach_templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
INDEX_PATH = os.path.join(BASE_DIR, 'index.html')
PORT = 8525

# In-memory session store
SESSION_LEADS = []


class LeadScraperHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Root route -> serve index.html
        if path in ['', '/', '/index.html']:
            if os.path.exists(INDEX_PATH):
                with open(INDEX_PATH, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self.send_error(404, "index.html not found")
                return

        # Serve static assets (CSS, JS, SVG)
        if path.startswith('/static/'):
            rel_path = path[len('/static/'):]
            file_path = os.path.join(STATIC_DIR, rel_path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                content_type = 'text/plain'
                if file_path.endswith('.css'):
                    content_type = 'text/css'
                elif file_path.endswith('.js'):
                    content_type = 'application/javascript'
                elif file_path.endswith('.svg'):
                    content_type = 'image/svg+xml'
                elif file_path.endswith('.json'):
                    content_type = 'application/json'

                with open(file_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        # API: Download exported file
        if path == '/api/download':
            query_params = urllib.parse.parse_qs(parsed.query)
            filename = query_params.get('file', [''])[0]
            # Sanitize filename
            filename = os.path.basename(filename)
            target_path = os.path.join(EXPORTS_DIR, filename)

            if os.path.exists(target_path) and os.path.isfile(target_path):
                content_type = 'application/octet-stream'
                if filename.endswith('.csv'):
                    content_type = 'text/csv; charset=utf-8'
                elif filename.endswith('.xlsx'):
                    content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                elif filename.endswith('.json'):
                    content_type = 'application/json'

                with open(target_path, 'rb') as f:
                    file_bytes = f.read()

                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                self.send_header('Content-Length', str(len(file_bytes)))
                self.end_headers()
                self.wfile.write(file_bytes)
                return
            else:
                self.send_error(404, "Exported file not found")
                return

        # API: Get current session leads
        if path == '/api/current-leads':
            global SESSION_LEADS
            self.send_json({"leads": SESSION_LEADS, "total": len(SESSION_LEADS)})
            return

        self.send_error(404, "Route not found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        try:
            req_data = json.loads(body)
        except Exception:
            req_data = {}

        # API: Search & Scrape Leads
        if path == '/api/scrape':
            role = req_data.get('role', 'Software Engineer')
            location = req_data.get('location', 'India')
            company = req_data.get('company', '')
            max_results = int(req_data.get('max_results', 20))
            deep_enrich = bool(req_data.get('deep_enrich', False))
            contacts_only = bool(req_data.get('contacts_only', False))

            print(f"\n[🚀 Scraper API] Searching for: '{role}' in '{location}' (Company: '{company}') | Limit: {max_results}")
            result = search_and_scrape_linkedin_leads(
                role=role,
                location=location,
                company=company,
                max_results=max_results,
                deep_enrich=deep_enrich
            )

            # If contacts_only requested, filter for those with phone or email
            if contacts_only:
                filtered = [l for l in result['leads'] if l.get('raw_phone') or l.get('raw_email')]
                result['leads'] = filtered
                result['metrics']['total_leads'] = len(filtered)

            global SESSION_LEADS
            SESSION_LEADS = result['leads']

            self.send_json(result)
            return

        # API: Export leads
        if path == '/api/export':
            fmt = req_data.get('format', 'csv').lower()
            leads_to_export = req_data.get('leads') or SESSION_LEADS

            if not leads_to_export:
                self.send_json({"success": False, "error": "No leads to export"}, status=400)
                return

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            role_slug = req_data.get('role', 'candidates').replace(" ", "_").lower()

            if fmt == 'excel' or fmt == 'xlsx':
                fname = f"linkedin_leads_{role_slug}_{timestamp}.xlsx"
                fpath = export_to_excel(leads_to_export, fname)
            elif fmt == 'json':
                fname = f"linkedin_leads_{role_slug}_{timestamp}.json"
                fpath = export_to_json(leads_to_export, fname)
            else:
                fname = f"linkedin_leads_{role_slug}_{timestamp}.csv"
                fpath = export_to_csv(leads_to_export, fname)

            download_url = f"/api/download?file={fname}"
            self.send_json({
                "success": True,
                "format": fmt,
                "filename": fname,
                "download_url": download_url,
                "total_exported": len(leads_to_export)
            })
            return

        # API: Generate tailored outreach message
        if path == '/api/outreach':
            lead = req_data.get('lead', {})
            sender_name = req_data.get('sender_name', 'Hiring Team')
            sender_role = req_data.get('sender_role', 'Technical Recruiter')

            templates = generate_outreach_templates(lead, sender_name, sender_role)
            self.send_json({"success": True, "templates": templates})
            return

        self.send_error(404, "Endpoint not found")


def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, LeadScraperHandler)
    print("=" * 65)
    print(f"  ⚡ LinkedIn Lead & Talent Scraper Pro Server")
    print(f"  🌐 Running on: http://localhost:{PORT}")
    print(f"  🎯 Ready to scrape profiles, phone numbers, and emails!")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == '__main__':
    run_server()
