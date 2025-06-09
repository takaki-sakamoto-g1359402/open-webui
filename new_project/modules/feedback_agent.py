from typing import List, Dict
from .helpers import UserID, now
from .database import DB

DB.setdefault('feedback', {})

class FeedbackAgent:
    @staticmethod
    def on_chat_event(uid: UserID, room_id: str, msg_id: str):
        history = DB.get('messages', [])[-100:]
        suggestions = [f"Placeholder feedback for {uid}"]
        DB['feedback'].setdefault(uid, []).append({'suggestions': suggestions, 'ts': now()})
        # In real implementation, you would trigger a push notification

    @staticmethod
    def get_latest_feedback(uid: UserID) -> List[Dict]:
        return sorted(DB['feedback'].get(uid, []), key=lambda x: x['ts'], reverse=True)[:10]
