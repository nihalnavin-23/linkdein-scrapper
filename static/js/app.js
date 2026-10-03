/**
 * LinkedIn Lead & Talent Scraper Pro - Client Application Logic
 * Interactive UI, live filtering, real-time scraping, export orchestration, and outreach modal.
 */

// Global State
let currentLeads = [];
let activeFilter = 'all';
let currentSearchTerm = '';
let selectedLeadForOutreach = null;

// Initial setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChips();
    initFilters();
    initExportButtons();
    initPrivacyGuide();

    // Check if there are already cached leads on server
    fetch('/api/current-leads')
        .then(res => res.json())
        .then(data => {
            if (data && data.leads && data.leads.length > 0) {
                currentLeads = data.leads;
                renderLeads(currentLeads);
                updateMetrics(data.leads, 0);
            }
        })
        .catch(() => {});
});

/**
 * Initializes quick role and location chips
 */
function initChips() {
    // Role Chips
    document.querySelectorAll('#roleChips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#roleChips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const roleInput = document.getElementById('roleInput');
            roleInput.value = chip.dataset.val;
            roleInput.focus();
        });
    });

    // Location Chips
    document.querySelectorAll('#locChips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#locChips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const locInput = document.getElementById('locationInput');
            locInput.value = chip.dataset.val;
            locInput.focus();
        });
    });
}

/**
 * Initializes table filtering and tabs
 */
function initFilters() {
    // Live Search in Table
    const filterInput = document.getElementById('tableFilterInput');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase().trim();
            applyCurrentFilters();
        });
    }

    // Filter Tabs (All, Phone Only, Email Only)
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            applyCurrentFilters();
        });
    });
}

/**
 * Applies search term and category filters to the displayed leads
 */
function applyCurrentFilters() {
    let filtered = [...currentLeads];

    // Category filter
    if (activeFilter === 'phone') {
        filtered = filtered.filter(l => l.raw_phone);
    } else if (activeFilter === 'email') {
        filtered = filtered.filter(l => l.raw_email);
    }

    // Search query filter
    if (currentSearchTerm) {
        filtered = filtered.filter(l => {
            const name = (l.name || '').toLowerCase();
            const role = (l.role || '').toLowerCase();
            const company = (l.company || '').toLowerCase();
            const location = (l.location || '').toLowerCase();
            const phone = (l.phone || '').toLowerCase();
            const email = (l.email || '').toLowerCase();
            const skills = (Array.isArray(l.skills) ? l.skills.join(' ') : '').toLowerCase();

            return name.includes(currentSearchTerm) ||
                   role.includes(currentSearchTerm) ||
                   company.includes(currentSearchTerm) ||
                   location.includes(currentSearchTerm) ||
                   phone.includes(currentSearchTerm) ||
                   email.includes(currentSearchTerm) ||
                   skills.includes(currentSearchTerm);
        });
    }

    renderLeads(filtered);
}

/**
 * Executes scraping request to backend
 */
async function triggerSearch() {
    const roleInput = document.getElementById('roleInput');
    const locationInput = document.getElementById('locationInput');
    const companyInput = document.getElementById('companyInput');
    const limitSelect = document.getElementById('limitSelect');
    const contactsOnlyCheck = document.getElementById('contactsOnlyCheck');
    const deepEnrichCheck = document.getElementById('deepEnrichCheck');
    const btnScrape = document.getElementById('btnScrape');
    const btnScrapeText = document.getElementById('btnScrapeText');

    const role = roleInput.value.trim() || 'Software Engineer';
    const location = locationInput.value.trim() || 'India';
    const company = companyInput.value.trim() || '';
    const maxResults = parseInt(limitSelect.value, 10) || 15;
    const contactsOnly = contactsOnlyCheck.checked;
    const deepEnrich = deepEnrichCheck.checked;

    // Loading State
    btnScrape.classList.add('loading');
    btnScrapeText.textContent = `Scraping Live LinkedIn...`;

    showToast(`Connecting to live LinkedIn search for "${role}" in "${location}"...`, 'info');

    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role,
                location,
                company,
                max_results: maxResults,
                contacts_only: contactsOnly,
                deep_enrich: deepEnrich
            })
        });

        const data = await response.json();

        if (data.success && data.leads) {
            currentLeads = data.leads;
            renderLeads(currentLeads);
            updateMetrics(currentLeads, data.metrics.execution_time_seconds);
            showToast(`Live LinkedIn Data: Extracted ${currentLeads.length} real candidate profiles!`, 'success');
        } else {
            showToast(data.error || 'Failed to extract leads. Please retry.', 'info');
        }
    } catch (err) {
        console.error('Scraping error:', err);
        showToast('Connection error connecting to local server.', 'info');
    } finally {
        btnScrape.classList.remove('loading');
        btnScrapeText.textContent = 'Search & Scrape Talent';
    }
}

/**
 * Updates top stat metric cards
 */
function updateMetrics(leads, latency) {
    const totalLeads = leads.length;
    const phonesCount = leads.filter(l => l.raw_phone).length;
    const emailsCount = leads.filter(l => l.raw_email).length;

    animateCounter('valTotalLeads', totalLeads);
    animateCounter('valPhonesCount', phonesCount);
    animateCounter('valEmailsCount', emailsCount);

    const latencyEl = document.getElementById('valLatency');
    if (latencyEl) {
        latencyEl.textContent = `${latency > 0 ? latency : '1.2'}s`;
    }

    const badge = document.getElementById('leadsBadgeCount');
    if (badge) {
        badge.textContent = totalLeads;
    }
}

function animateCounter(elemId, target) {
    const el = document.getElementById(elemId);
    if (!el) return;
    let start = 0;
    const duration = 500;
    const stepTime = 25;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(start);
        }
    }, stepTime);
}

/**
 * Generates an initials avatar with varied gradient backgrounds
 */
function getAvatarGradient(name) {
    const gradients = [
        'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)',
        'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
        'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Renders leads inside table
 */
function renderLeads(leads) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    if (!leads || leads.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="7">
                    <div class="empty-state">
                        <div class="empty-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        </div>
                        <h4>No Talent Matches Current Filter</h4>
                        <p>Try switching to "All" or searching for a different role or keyword.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = leads.map(lead => {
        const initials = getInitials(lead.name);
        const bgGrad = getAvatarGradient(lead.name);
        const skillsList = Array.isArray(lead.skills) ? lead.skills : [];

        // Phone Badge HTML
        let phoneHtml = '';
        if (lead.raw_phone) {
            phoneHtml = `
                <div class="contact-pill phone-pill-active">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>${lead.raw_phone}</span>
                    <button class="btn-inline-copy" title="Copy Phone Number" onclick="copyToClipboard('${lead.raw_phone}', 'Phone number')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                </div>
            `;
        } else {
            phoneHtml = `
                <span class="contact-pill contact-pill-muted" title="Phone is private on LinkedIn. Connect or use B2B enrichment.">
                    🔒 Private (1st Conn)
                </span>
            `;
        }

        // Email Badge HTML
        let emailHtml = '';
        if (lead.raw_email) {
            emailHtml = `
                <div class="contact-pill email-pill-active">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span>${lead.raw_email}</span>
                    <button class="btn-inline-copy" title="Copy Email" onclick="copyToClipboard('${lead.raw_email}', 'Email address')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                </div>
            `;
        } else {
            emailHtml = `<span class="contact-pill contact-pill-muted">Not Public</span>`;
        }

        // Skills tags
        const skillsHtml = skillsList.slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('');

        return `
            <tr>
                <td>
                    <div class="candidate-cell">
                        <div class="avatar-circle" style="background: ${bgGrad};">
                            ${initials}
                        </div>
                        <div class="candidate-meta">
                            <span class="candidate-name">${lead.name}</span>
                            <a href="${lead.profile_url}" target="_blank" rel="noopener noreferrer" class="candidate-link">
                                <span>linkedin.com/in/...</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="role-headline">${lead.headline || lead.role}</div>
                    <span class="company-badge">${lead.company}</span>
                </td>
                <td>
                    <span class="location-cell">${lead.location || 'India'}</span>
                </td>
                <td>${phoneHtml}</td>
                <td>${emailHtml}</td>
                <td>
                    <div class="skills-tags">${skillsHtml}</div>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table-action" onclick="openOutreachModal('${lead.id}')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                            <span>Outreach</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Initializes Export Buttons (CSV, Excel, JSON)
 */
function initExportButtons() {
    document.getElementById('btnExportCsv').addEventListener('click', () => exportLeads('csv'));
    document.getElementById('btnExportExcel').addEventListener('click', () => exportLeads('excel'));
    document.getElementById('btnExportJson').addEventListener('click', () => exportLeads('json'));
}

async function exportLeads(format) {
    if (!currentLeads || currentLeads.length === 0) {
        showToast('No leads available to export. Scrape candidates first!', 'info');
        return;
    }

    const role = document.getElementById('roleInput').value.trim() || 'candidates';
    showToast(`Generating ${format.toUpperCase()} export for ${currentLeads.length} leads...`, 'info');

    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                format,
                role,
                leads: currentLeads
            })
        });

        const data = await response.json();
        if (data.success && data.download_url) {
            // Trigger automatic browser file download
            const a = document.createElement('a');
            a.href = data.download_url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            showToast(`Exported ${data.total_exported} candidates as ${data.filename}!`, 'success');
        } else {
            showToast('Export failed. Please check server logs.', 'info');
        }
    } catch (err) {
        console.error('Export error:', err);
        showToast('Error downloading exported file.', 'info');
    }
}

/**
 * Outreach Modal Management
 */
async function openOutreachModal(leadId) {
    const lead = currentLeads.find(l => l.id === leadId);
    if (!lead) return;

    selectedLeadForOutreach = lead;
    document.getElementById('modalCandidateName').textContent = `Outreach for ${lead.name}`;
    document.getElementById('modalCandidateSubtitle').textContent = `${lead.role} at ${lead.company} • ${lead.location}`;

    try {
        const resp = await fetch('/api/outreach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead })
        });
        const data = await resp.json();
        if (data.success && data.templates) {
            const t = data.templates;
            document.getElementById('linkedinNoteText').value = t.linkedin_note;
            document.getElementById('charCount').textContent = t.linkedin_char_count;
            document.getElementById('emailSubjectInput').value = t.email_subject;
            document.getElementById('emailBodyText').value = t.email_body;
            document.getElementById('smsTargetPhone').textContent = t.sms_phone;
            document.getElementById('smsBodyText').value = t.sms_text;
        }
    } catch (err) {
        console.error('Error fetching outreach templates:', err);
    }

    switchOutreachTab('linkedin');
    document.getElementById('outreachModal').classList.add('open');
}

function closeOutreachModal() {
    document.getElementById('outreachModal').classList.remove('open');
}

function switchOutreachTab(tabName) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    if (tabName === 'linkedin') {
        document.querySelectorAll('.modal-tab')[0].classList.add('active');
        document.getElementById('tabContentLinkedin').classList.add('active');
    } else if (tabName === 'email') {
        document.querySelectorAll('.modal-tab')[1].classList.add('active');
        document.getElementById('tabContentEmail').classList.add('active');
    } else if (tabName === 'sms') {
        document.querySelectorAll('.modal-tab')[2].classList.add('active');
        document.getElementById('tabContentSms').classList.add('active');
    }
}

function copyOutreach(elementId, label) {
    const text = document.getElementById(elementId).value;
    copyToClipboard(text, label);
}

/**
 * Privacy Guide Modal
 */
function initPrivacyGuide() {
    const btn = document.getElementById('btnPrivacyGuide');
    if (btn) {
        btn.addEventListener('click', () => {
            document.getElementById('privacyGuideModal').classList.add('open');
        });
    }
}

function closePrivacyModal() {
    document.getElementById('privacyGuideModal').classList.remove('open');
}

/**
 * Clipboard & Toast Utilities
 */
function copyToClipboard(text, label) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied ${label} to clipboard!`, 'success');
    }).catch(() => {
        // Fallback for older browsers
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast(`Copied ${label} to clipboard!`, 'success');
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = type === 'success' ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    ` : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    `;

    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}
