import type { Request, Response } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

export class ChatService {
  async postMessage(req: Request, res: Response) {
    const { roomId, uid, message } = req.body;
    await db.collection('rooms').doc(roomId).collection('messages').add({
      uid,
      message,
      createdAt: Timestamp.now()
    });
    res.json({ success: true });
  }
}
