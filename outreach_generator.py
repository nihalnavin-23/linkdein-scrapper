"""
LinkedIn Lead & Talent Scraper Pro - Outreach Generator
Generates personalized, high-converting outreach notes for any scraped profile.
"""

from typing import Dict, Any


def generate_outreach_templates(lead: Dict[str, Any], sender_name: str = "Hiring Team", sender_role: str = "Technical Recruiter") -> Dict[str, str]:
    """Generates 3 tailored outreach variations for a selected candidate."""
    full_name = lead.get("name", "Candidate")
    first_name = full_name.split()[0] if full_name else "there"
    company = lead.get("company", "your team")
    role = lead.get("role", "Software Engineer")
    skills = lead.get("skills", ["Software Engineering"])
    top_skill = skills[0] if skills else "tech"
    phone = lead.get("raw_phone")
    email = lead.get("raw_email")

    # 1. LinkedIn Connection Note (Strictly under 300 characters for LinkedIn free note limit)
    connection_note = (
        f"Hi {first_name}, impressed by your engineering impact at {company}! "
        f"We're scaling high-impact {top_skill} systems and your technical background stood out. "
        f"Would love to connect and share opportunities when you're open to exploring."
    )
    if len(connection_note) > 295:
        connection_note = f"Hi {first_name}, loved your work at {company}! Your background in {role} is stellar. Would love to connect and keep in touch regarding exciting engineering roles."

    # 2. Comprehensive Cold Recruiter Email
    email_subject = f"Opportunity: Senior Engineering Roles for {first_name} ({company} Background)"
    email_body = (
        f"Hi {first_name},\n\n"
        f"I came across your profile while researching standout {role} talent at {company}. "
        f"Your deep expertise in {', '.join(skills[:3]) if skills else 'distributed systems'} immediately caught our attention.\n\n"
        f"We are currently expanding our core engineering team and looking for leaders who can drive architecture design, "
        f"scale microservices, and mentor junior engineers.\n\n"
        f"A few quick details about the role:\n"
        f"  • Scope: High-throughput distributed platforms & modern cloud infrastructure\n"
        f"  • Compensation: Highly competitive market rate + equity grants\n"
        f"  • Culture: Autonomous, product-focused, engineering-driven\n\n"
        f"Would you be open to a brief 10-minute introductory conversation this week? If so, feel free to reply with a time that works best or ping me directly.\n\n"
        f"Best regards,\n"
        f"{sender_name}\n"
        f"{sender_role}"
    )

    # 3. WhatsApp / SMS Direct Ping (Friendly, non-spammy, direct)
    phone_display = phone if phone else "Direct Message"
    sms_text = (
        f"Hi {first_name}, this is {sender_name} ({sender_role}). "
        f"Came across your impressive {role} background at {company}. "
        f"We have an exciting leadership engineering opening that matches your stack. "
        f"Sent you a quick email / LinkedIn note as well—happy to chat whenever convenient!"
    )

    return {
        "candidate_name": full_name,
        "company": company,
        "role": role,
        "linkedin_note": connection_note,
        "linkedin_char_count": len(connection_note),
        "email_subject": email_subject,
        "email_body": email_body,
        "sms_phone": phone_display,
        "sms_text": sms_text
    }
