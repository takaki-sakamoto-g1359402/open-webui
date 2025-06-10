import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const db = getFirestore();

const announcementSchema = z.object({
  message: z.string(),
  languages: z.array(z.string())
});

export class AnnouncementService {
  // アナウンス配信
  async broadcast(req: Request, res: Response) {
    const { message, languages } = announcementSchema.parse(req.body);
    await db.collection('announcements').add({ message, languages });
    res.json({ success: true });
  }
}
