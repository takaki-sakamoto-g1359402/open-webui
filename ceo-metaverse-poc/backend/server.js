import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4060;

// --- Mock data stores ---
const users = [
  { id: 'u1', name: 'Ava CEO', company: 'Lumen Labs', role: 'CEO', reputationScore: 92, accessLevel: 'executive' },
  { id: 'u2', name: 'Leo Founder', company: 'Northwind Ventures', role: 'Founder', reputationScore: 88, accessLevel: 'executive' },
  { id: 'u3', name: 'Mia Ops', company: 'Skyline Group', role: 'COO', reputationScore: 80, accessLevel: 'guest' },
  { id: 'admin', name: 'Admin', company: 'Control', role: 'Admin', reputationScore: 100, accessLevel: 'admin' }
];

const onlinePresence = new Map();
const rooms = [];
const events = [];

// --- Middleware: Cloudflare Access token mock ---
app.use((req, res, next) => {
  const raw = req.header('x-cf-exec-identity');
  if (!raw) {
    return res.status(401).json({ message: 'Missing Cloudflare Access identity header' });
  }
  try {
    const parsed = JSON.parse(raw);
    const found = users.find((u) => u.id === parsed.id);
    if (!found) return res.status(403).json({ message: 'User not recognized' });
    req.currentUser = found;
    onlinePresence.set(found.id, { ...found, lastSeen: new Date().toISOString() });
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid identity header' });
  }
});

const requireExecutive = (req, res, next) => {
  if (!req.currentUser) return res.status(401).json({ message: 'Unauthorized' });
  if (['executive', 'admin'].includes(req.currentUser.accessLevel)) return next();
  return res.status(403).json({ message: 'Executives only' });
};

const requireAdmin = (req, res, next) => {
  if (req.currentUser?.accessLevel === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
};

// --- Helper logging ---
const logEvent = (type, metadata) => {
  const evt = {
    id: uuid(),
    type,
    participants: metadata.participants || [],
    metadata,
    createdAt: new Date().toISOString()
  };
  events.unshift(evt);
  return evt;
};

// --- Routes ---
app.get('/api/users/me', (req, res) => {
  res.json({ currentUser: req.currentUser });
});

app.get('/api/lobby/insights', requireExecutive, (req, res) => {
  const typeCounts = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
  const topRoom = rooms
    .map((room) => ({
      room,
      sessions: events.filter((e) => e.metadata?.roomId === room.id).length
    }))
    .sort((a, b) => b.sessions - a.sessions)[0];
  res.json({
    mostFrequentInteraction: Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0] || null,
    topActiveRoom: topRoom ? { id: topRoom.room.id, name: topRoom.room.name, sessions: topRoom.sessions } : null,
    totalExecutivesOnline: [...onlinePresence.values()].filter((u) => u.accessLevel === 'executive').length
  });
});

app.get('/api/main-floor/presence', requireExecutive, (req, res) => {
  res.json({ online: [...onlinePresence.values()] });
});

// --- Rooms ---
app.get('/api/rooms', requireExecutive, (req, res) => {
  const visible = rooms.filter((r) => r.ownerId === req.currentUser.id || r.invitees.includes(req.currentUser.id));
  res.json({ rooms: visible });
});

app.post('/api/rooms', requireExecutive, (req, res) => {
  const { name, description } = req.body;
  const room = { id: uuid(), name, description, ownerId: req.currentUser.id, invitees: [req.currentUser.id], createdAt: new Date().toISOString() };
  rooms.push(room);
  logEvent('PRIVATE_ROOM_CREATED', { roomId: room.id, owner: req.currentUser.id });
  res.status(201).json({ room });
});

app.post('/api/rooms/:id/invite', requireExecutive, (req, res) => {
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.ownerId !== req.currentUser.id) return res.status(403).json({ message: 'Only owners can invite' });
  const { userId } = req.body;
  if (!room.invitees.includes(userId)) room.invitees.push(userId);
  logEvent('PRIVATE_ROOM_INVITE', { roomId: room.id, inviter: req.currentUser.id, invitee: userId });
  res.json({ room });
});

app.get('/api/rooms/:id', requireExecutive, (req, res) => {
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (!room.invitees.includes(req.currentUser.id)) return res.status(403).json({ message: 'Not invited' });
  res.json({ room });
});

// --- Games hub ---
const miniGames = [
  { id: 'mini-putt', name: 'Virtual Putting Green', description: 'Simple timing-based putting mini game', url: '/minigame.html' }
];

const externalLinks = [
  { id: 'minecraft', label: 'Minecraft Exec Server', url: 'minecraft://join?server=ceo-world.example.com:25565' },
  { id: 'steam-golf', label: 'Steam Golf With Your Execs', url: 'steam://run/12345' }
];

app.get('/api/hub/games', requireExecutive, (req, res) => {
  res.json({ miniGames, externalLinks });
});

app.post('/api/hub/games/:id/launch', requireExecutive, (req, res) => {
  const game = [...miniGames, ...externalLinks].find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ message: 'Game not found' });
  const evt = logEvent('GAME_SESSION', { gameId: game.id, userId: req.currentUser.id, startedAt: new Date().toISOString() });
  res.json({ launch: game.url, eventId: evt.id });
});

// --- Admin events ---
app.get('/api/admin/events', requireAdmin, (req, res) => {
  const limit = Number(req.query.limit || 50);
  res.json({ events: events.slice(0, limit) });
});

// --- WebSocket chat ---
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/chat' });

wss.on('connection', (socket, req) => {
  const params = new URLSearchParams(req.url.replace('/ws/chat?', ''));
  const roomId = params.get('roomId');
  const identityHeader = req.headers['x-cf-exec-identity'] || params.get('identity');
  let user = null;
  try {
    const parsed = JSON.parse(identityHeader);
    user = users.find((u) => u.id === parsed.id);
  } catch (err) {
    socket.close();
    return;
  }
  if (!user) {
    socket.close();
    return;
  }
  socket.user = user;
  socket.roomId = roomId;
  socket.send(JSON.stringify({ system: true, message: `Welcome ${user.name} to ${roomId ? 'room ' + roomId : 'main floor'} chat.` }));

  socket.on('message', (data) => {
    const payload = JSON.parse(data.toString());
    const envelope = { from: { id: user.id, name: user.name }, roomId, message: payload.message, at: new Date().toISOString() };
    wss.clients.forEach((client) => {
      if (client.readyState === 1 && client.roomId === roomId) {
        client.send(JSON.stringify(envelope));
      }
    });
    logEvent(roomId ? 'PRIVATE_ROOM_CHAT' : 'MAIN_FLOOR_CHAT', { roomId, from: user.id, message: payload.message });
  });
});

server.listen(PORT, () => {
  console.log(`CEO Metaverse PoC API running on http://localhost:${PORT}`);
});
