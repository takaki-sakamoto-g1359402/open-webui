from .helpers import UserID, KYCStatus, Role, now, call_kyc_provider
from .database import DB

class AuthFlow:
    @staticmethod
    def register(email: str, password: str, id_document: str) -> UserID:
        uid = email  # simplified unique ID
        kyc = call_kyc_provider(id_document)
        DB['users'][uid] = {
            'email': email,
            'role': Role.PENDING,
            'kyc_status': kyc,
            'created_at': now()
        }
        return uid

    @staticmethod
    def on_kyc_webhook(uid: UserID, new_status: KYCStatus) -> None:
        user = DB['users'].get(uid)
        if not user:
            return
        user['kyc_status'] = new_status
        if new_status == KYCStatus.VERIFIED:
            user['role'] = Role.MEMBER
