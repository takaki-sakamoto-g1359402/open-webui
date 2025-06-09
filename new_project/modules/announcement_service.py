from typing import Dict
from .helpers import UserID, LangCode, Role, translate, now
from .auth_flow import DB

DB.setdefault('announcements', [])
SUPPORTED_LANGS = ['en', 'ja']
DEFAULT_LANG = 'en'

class AnnouncementService:
    @staticmethod
    def create_announcement(author_id: UserID, payload: Dict):
        user = DB['users'].get(author_id)
        if not user or user.get('role') != Role.ADMIN:
            raise PermissionError('Admin only')

        translations = {}
        for lang in SUPPORTED_LANGS:
            translations[lang] = payload['body'] if lang == payload['src_lang'] else translate(payload['body'], payload['src_lang'], lang)

        DB['announcements'].append({
            'author_id': author_id,
            'title': payload['title'],
            'translations': translations,
            'created_at': now()
        })

    @staticmethod
    def stream_announcements(lang: LangCode):
        for a in DB['announcements']:
            yield a['title'], a['translations'].get(lang, a['translations'].get(DEFAULT_LANG))
