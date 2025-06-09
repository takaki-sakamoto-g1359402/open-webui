"""Demonstration script for the prototype system."""

from modules.auth_flow import AuthFlow, DB
from modules.profile_service import ProfileService
from modules.chat_service import ChatService
from modules.gatekeeper import Gatekeeper
from modules.invite_manager import InviteManager
from modules.feedback_agent import FeedbackAgent
from modules.announcement_service import AnnouncementService
from modules.helpers import KYCStatus, Role


def demo():
    # Admin setup
    admin_id = AuthFlow.register('admin@example.com', 'adminpass', 'admin-doc')
    AuthFlow.on_kyc_webhook(admin_id, KYCStatus.VERIFIED)
    DB['users'][admin_id]['role'] = Role.ADMIN

    # Member registration and verification
    user_id = AuthFlow.register('user@example.com', 'userpass', 'user-doc')
    AuthFlow.on_kyc_webhook(user_id, KYCStatus.VERIFIED)

    # Admin generates invite
    invite_code = InviteManager.generate_invite(admin_id)
    InviteManager.redeem_invite(invite_code, user_id)

    # Save and fetch profile
    ProfileService.save_profile(user_id, {'lang': {'en': {'bio': 'Hello'}}})
    profile = ProfileService.get_profile(user_id, 'en')
    print('Profile:', profile)

    # Send and read chat message
    ChatService.send_message('default_room', user_id, 'Hi!', 'en')
    msg = DB['messages'][-1]
    displayed = ChatService.on_new_message(msg, 'en')
    print('Displayed message:', displayed)

    # Feedback agent generates feedback
    FeedbackAgent.on_chat_event(user_id, 'default_room', msg_id='1')
    latest = FeedbackAgent.get_latest_feedback(user_id)
    print('Latest feedback:', latest)

    # Announcements
    AnnouncementService.create_announcement(admin_id, {
        'title': 'Welcome',
        'body': 'Welcome to the system',
        'src_lang': 'en'
    })
    for title, body in AnnouncementService.stream_announcements('en'):
        print('Announcement:', title, body)

    # Gatekeeper check
    can_enter = Gatekeeper.can_enter(user_id, 'default_room')
    print('Gatekeeper allows entry:', can_enter)


if __name__ == "__main__":
    demo()
