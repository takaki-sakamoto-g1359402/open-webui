from .helpers import UserID, InviteCode, Role, gen_uuid, now
from .auth_flow import DB

DB.setdefault('invites', {})
DB.setdefault('invite_whitelist', {})

class InviteManager:
    @staticmethod
    def generate_invite(issuer_id: UserID, max_uses: int = 1) -> InviteCode:
        user = DB['users'].get(issuer_id)
        if not user or user.get('role') != Role.ADMIN:
            raise PermissionError('Admin only')
        code = gen_uuid()[:8]
        DB['invites'][code] = {
            'issuer': issuer_id,
            'uses_left': max_uses,
            'created_at': now()
        }
        return code

    @staticmethod
    def redeem_invite(code: InviteCode, uid: UserID) -> bool:
        inv = DB['invites'].get(code)
        if inv and inv['uses_left'] > 0:
            DB.setdefault('invite_whitelist', {}).setdefault(uid, set()).add('default_room')
            inv['uses_left'] -= 1
            return True
        return False
