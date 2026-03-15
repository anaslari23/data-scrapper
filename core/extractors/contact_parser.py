import re
from typing import Set

class ContactParser:
    """Fallback parser for emails and Indian phone numbers using Regex."""
    
    # RFC 5322 compliant regex for emails
    EMAIL_REGEX = re.compile(
        r"(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"
        r'"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\'
        r'[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+'
        r'[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}'
        r'(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:'
        r'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\'
        r'[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])',
        re.IGNORECASE
    )

    # Regex for Indian phone numbers (Mobile + Landline)
    # Handles: +91, 0 prefix, 10-digit mobile, STD codes (0XX-XXXXXXXX)
    PHONE_REGEX = re.compile(
        r'(?:(?:\+|0{0,2})91[\s-]*)?'
        r'(?:0[\s-]*)?'
        r'(?:[6-9]\d{9}|[1-9]\d{2}[\s-]?\d{7}|[1-9]\d{3}[\s-]?\d{6})[^\d]'
    )

    @classmethod
    def extract_emails(cls, text: str) -> Set[str]:
        """Extracts and deduplicates emails from text."""
        if not text:
            return set()
        matches = cls.EMAIL_REGEX.findall(text)
        return {email.lower() for email in matches}

    @classmethod
    def extract_phones(cls, text: str) -> Set[str]:
        """Extracts and deduplicates Indian phone numbers from text."""
        if not text:
            return set()
        
        matches = cls.PHONE_REGEX.findall(text + " ") 
        
        cleaned_phones = set()
        for match in matches:
            # Clean up the match (remove non-digits, keep '+')
            clean = re.sub(r'[^\d+]', '', match)
            if clean:
                cleaned_phones.add(clean)
                
        return cleaned_phones

    @classmethod
    def extract_contacts(cls, text: str) -> dict:
        """Extract both emails and phones from text."""
        emails = cls.extract_emails(text)
        phones = cls.extract_phones(text)
        return {
            "emails": list(emails),
            "phones": list(phones)
        }
