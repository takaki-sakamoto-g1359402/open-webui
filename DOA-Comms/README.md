# DOA-Comms

DOA-Comms is a communication platform built with Firebase and Next.js.
It provides user authentication with KYC, multilingual profiles and chat,
and a set of utilities for invites, announcements and room access control.

## Modules

1. **AuthFlow** – Firebase Auth signup integrated with an external KYC webhook.
2. **ProfileService** – Stores multilingual user profiles in Firestore.
3. **ChatService** – Real-time multilingual chat using Firestore realtime updates.
4. **FeedbackAgent** – Generates AI-based feedback using AutoGen.
5. **AnnouncementService** – Broadcasts translated announcements.
6. **InviteManager** – Controls invite-based room access.
7. **Gatekeeper** – Validates access to virtual rooms.

The backend is written in TypeScript/Node.js and uses Firestore.
The frontend is a Next.js app styled with Tailwind CSS.
Deployment is aimed at Vercel for the frontend and Firebase for APIs.


## Development

```
cd backend && npm install && npm run build && npm start
```

In another terminal:

```
cd frontend && npm install && npm run dev
```

The frontend can be deployed to Vercel, while the backend and Firebase configuration can be deployed with `firebase deploy`.

### 注意: 開発環境について

このリポジトリでは Node.js と Python の依存パッケージがそろっていることを前提に各種スクリプトを提供しています。
ローカル環境に必要なモジュールがない場合、`npm run lint` などのコマンドが失敗することがあります。
`npm install` 及び `pip install -r requirements.txt` を実行してから開発を行ってください。
