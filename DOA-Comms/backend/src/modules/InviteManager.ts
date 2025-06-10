import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const db = getFirestore();

const inviteSchema = z.object({
  roomId: z.string()
});

export class InviteManager {
  // 招待コード生成
  async createInvite(req: Request, res: Response) {
    const { roomId } = inviteSchema.parse(req.body);
    const code = uuidv4();
    await db.collection('invites').doc(code).set({ roomId });
    res.json({ code });
  }
}
