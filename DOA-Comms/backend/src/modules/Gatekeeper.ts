import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';

const db = getFirestore();

const gateSchema = z.object({
  roomId: z.string(),
  code: z.string()
});

export class Gatekeeper {
  // 招待コード検証
  async validate(req: Request, res: Response) {
    const { roomId, code } = gateSchema.parse(req.body);
    const doc = await db.collection('invites').doc(code).get();
    if (!doc.exists || doc.data()?.roomId !== roomId) {
      throw new HttpError(403, 'Invalid code');
    }
    res.json({ allowed: true });
  }
}
