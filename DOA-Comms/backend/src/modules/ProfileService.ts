import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export class ProfileService {
  async updateProfile(req: Request, res: Response) {
    const { uid, profile } = req.body;
    await db.collection('profiles').doc(uid).set(profile, { merge: true });
    res.json({ success: true });
  }
}
