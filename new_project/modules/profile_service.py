from typing import Dict
from .helpers import UserID, LangCode, KYCStatus
from .auth_flow import DB

class ProfileService:
    @staticmethod
    def save_profile(uid: UserID, profile_data: Dict):
        user = DB['users'].get(uid)
        if not user or user.get('kyc_status') != KYCStatus.VERIFIED:
            raise PermissionError('KYC not verified')
        DB.setdefault('profiles', {})[uid] = profile_data

    @staticmethod
    def get_profile(uid: UserID, lang: LangCode):
        profiles = DB.get('profiles', {})
        p = profiles.get(uid, {})
        langs = p.get('lang', {})
        if lang in langs:
            return langs[lang]
        if langs:
            fallback = next(iter(langs))
            return langs[fallback]
        return {}
