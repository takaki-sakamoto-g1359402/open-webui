import express from 'express';
import { AuthFlow } from './modules/AuthFlow';
import { ProfileService } from './modules/ProfileService';
import { ChatService } from './modules/ChatService';
import { FeedbackAgent } from './modules/FeedbackAgent';
import { AnnouncementService } from './modules/AnnouncementService';
import { InviteManager } from './modules/InviteManager';
import { Gatekeeper } from './modules/Gatekeeper';

const app = express();
app.use(express.json());

const auth = new AuthFlow();
const profiles = new ProfileService();
const chat = new ChatService();
const feedback = new FeedbackAgent();
const announce = new AnnouncementService();
const invites = new InviteManager();
const gatekeeper = new Gatekeeper();

app.post('/signup', (req, res) => auth.handleSignup(req, res));
app.post('/profile', (req, res) => profiles.updateProfile(req, res));
app.post('/chat', (req, res) => chat.postMessage(req, res));
app.post('/feedback', (req, res) => feedback.generate(req, res));
app.post('/announce', (req, res) => announce.broadcast(req, res));
app.post('/invite', (req, res) => invites.createInvite(req, res));
app.post('/gatekeeper', (req, res) => gatekeeper.validate(req, res));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
