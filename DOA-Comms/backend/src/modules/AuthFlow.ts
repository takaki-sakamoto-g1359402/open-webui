import type { Request, Response } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp();

export class AuthFlow {
  async handleSignup(req: Request, res: Response) {
    const { idToken } = req.body;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      // Call external webhook for KYC
      // await fetch('https://kyc.example.com', { method: 'POST', body: JSON.stringify(decoded) });
      res.json({ success: true, uid: decoded.uid });
    } catch (e) {
      res.status(400).json({ error: 'Invalid token' });
    }
  }
}
