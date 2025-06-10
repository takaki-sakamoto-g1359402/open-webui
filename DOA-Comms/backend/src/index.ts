import express from 'express';
import { config } from 'dotenv';
import { cert, initializeApp } from 'firebase-admin/app';
import { AuthFlow } from './modules/AuthFlow.js';
import { ProfileService } from './modules/ProfileService.js';
import { ChatService } from './modules/ChatService.js';
import { FeedbackAgent } from './modules/FeedbackAgent.js';
import { AnnouncementService } from './modules/AnnouncementService.js';
import { InviteManager } from './modules/InviteManager.js';
import { Gatekeeper } from './modules/Gatekeeper.js';
import { verifyFirebaseToken, requireRole } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { asyncHandler } from './utils/asyncHandler.js';

config();

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const app = express();
app.use(express.json());

const auth = new AuthFlow();
const profiles = new ProfileService();
const chat = new ChatService();
const feedback = new FeedbackAgent();
const announce = new AnnouncementService();
const invites = new InviteManager();
const gatekeeper = new Gatekeeper();

app.post('/signup', asyncHandler((req, res) => auth.handleSignup(req, res)));
app.post(
  '/profile',
  verifyFirebaseToken,
  asyncHandler((req, res) => profiles.updateProfile(req, res))
);
app.post(
  '/chat',
  verifyFirebaseToken,
  asyncHandler((req, res) => chat.postMessage(req, res))
);
app.post(
  '/feedback',
  verifyFirebaseToken,
  asyncHandler((req, res) => feedback.generate(req, res))
);
app.post(
  '/announce',
  verifyFirebaseToken,
  requireRole(['ADMIN']),
  asyncHandler((req, res) => announce.broadcast(req, res))
);
app.post(
  '/invite',
  verifyFirebaseToken,
  requireRole(['ADMIN']),
  asyncHandler((req, res) => invites.createInvite(req, res))
);
app.post(
  '/gatekeeper',
  verifyFirebaseToken,
  asyncHandler((req, res) => gatekeeper.validate(req, res))
);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
