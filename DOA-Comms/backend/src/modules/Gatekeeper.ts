import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export class Gatekeeper {
  async validate(req: Request, res: Response) {
    const { roomId, code } = req.body;
    const doc = await db.collection('invites').doc(code).get();
    if (!doc.exists || doc.data()?.roomId !== roomId) {
      res.status(403).json({ allowed: false });
    } else {
      res.json({ allowed: true });
    }
  }
}
