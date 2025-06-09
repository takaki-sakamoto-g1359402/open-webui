from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional

# Global type definitions
UserID = str
LangCode = str
Timestamp = int
InviteCode = str

class Role(Enum):
    PENDING = 'PENDING'
    MEMBER = 'MEMBER'
    ADMIN = 'ADMIN'

class KYCStatus(Enum):
    UNVERIFIED = 'UNVERIFIED'
    PENDING = 'PENDING'
    VERIFIED = 'VERIFIED'
    REJECTED = 'REJECTED'

def now() -> Timestamp:
    import time
    return int(time.time() * 1000)

# Stub translation and external services

def translate(text: str, src_lang: Optional[LangCode] = None, dest_lang: LangCode = 'en') -> str:
    """Placeholder translation function."""
    return text

def gen_uuid() -> str:
    import uuid
    return str(uuid.uuid4())

def call_kyc_provider(id_doc: str) -> KYCStatus:
    """Stub call to external KYC service."""
    return KYCStatus.PENDING
