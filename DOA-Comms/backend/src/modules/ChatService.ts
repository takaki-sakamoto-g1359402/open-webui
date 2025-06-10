import type { Request, Response } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

const db = getFirestore();

const messageSchema = z.object({
  roomId: z.string(),
  uid: z.string(),
  message: z.string()
});

export class ChatService {
  // メッセージ投稿
  async postMessage(req: Request, res: Response) {
    const { roomId, uid, message } = messageSchema.parse(req.body);
    await db.collection('rooms').doc(roomId).collection('messages').add({
      uid,
      message,
      createdAt: Timestamp.now()
    });
    res.json({ success: true });
  }
}
