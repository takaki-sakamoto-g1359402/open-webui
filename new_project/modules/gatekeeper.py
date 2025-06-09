from .helpers import UserID, Role, KYCStatus
from .auth_flow import DB

class Gatekeeper:
    @staticmethod
    def can_enter(uid: UserID, room_id: str) -> bool:
        user = DB['users'].get(uid)
        invite_ok = room_id in DB.get('invite_whitelist', {}).get(uid, set())
        return (
            user and
            user.get('role') == Role.MEMBER and
            user.get('kyc_status') == KYCStatus.VERIFIED and
            invite_ok
        )
