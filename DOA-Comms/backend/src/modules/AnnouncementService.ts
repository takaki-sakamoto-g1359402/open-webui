import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export class AnnouncementService {
  async broadcast(req: Request, res: Response) {
    const { message, languages } = req.body;
    await db.collection('announcements').add({ message, languages });
    res.json({ success: true });
  }
}
