# Prototype System

This directory contains a minimal Python prototype based on the earlier pseudocode. It integrates KYC-enabled registration, multilingual profiles, chat with automatic translation, invitation-based access, and AI-generated feedback stubs.

Modules are located in `modules/`:

- `auth_flow.py` – registration and KYC webhook logic
- `profile_service.py` – profile storage and retrieval
- `chat_service.py` – basic chat message handling with translation stubs
- `gatekeeper.py` – room entry validation
- `feedback_agent.py` – placeholder feedback generation
- `announcement_service.py` – multi-language announcements
- `invite_manager.py` – invite code generation and redemption

All modules use a simple in-memory dictionary `DB` as a stand-in for a database.

## Demo Script

Run `python demo.py` inside this directory to see a simple interaction that covers registration, invitation redemption, profile management, messaging, feedback, announcements and gatekeeping.
