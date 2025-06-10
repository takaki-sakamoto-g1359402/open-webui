import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const db = getFirestore();

const profileSchema = z.object({
  uid: z.string(),
  profile: z.record(z.any())
});

export class ProfileService {
  // プロフィール更新
  async updateProfile(req: Request, res: Response) {
    const { uid, profile } = profileSchema.parse(req.body);
    await db.collection('profiles').doc(uid).set(profile, { merge: true });
    res.json({ success: true });
  }
}
