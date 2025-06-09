from typing import List, Dict
from .helpers import UserID, LangCode, translate, now
from .auth_flow import DB

DB.setdefault('messages', [])

class ChatService:
    @staticmethod
    def send_message(room_id: str, user: UserID, text: str, lang_detected: LangCode = None):
        src_lang = lang_detected or 'en'
        DB['messages'].append({
            'room_id': room_id,
            'from': user,
            'text': text,
            'src_lang': src_lang,
            'ts': now()
        })

    @staticmethod
    def on_new_message(msg: Dict, viewer_lang: LangCode) -> str:
        if msg['src_lang'] == viewer_lang:
            return msg['text']
        return translate(msg['text'], msg['src_lang'], viewer_lang)
