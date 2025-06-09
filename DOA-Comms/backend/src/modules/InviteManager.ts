import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

export class InviteManager {
  async createInvite(req: Request, res: Response) {
    const { roomId } = req.body;
    const code = uuidv4();
    await db.collection('invites').doc(code).set({ roomId });
    res.json({ code });
  }
}
