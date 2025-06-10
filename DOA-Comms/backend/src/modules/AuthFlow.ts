import type { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
import { HttpError } from '../utils/HttpError.js';

const signupSchema = z.object({
  idToken: z.string()
});

export class AuthFlow {
  // サインアップ処理
  async handleSignup(req: Request, res: Response) {
    const { idToken } = signupSchema.parse(req.body);
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      // 外部KYCサービス呼び出し(省略)
      res.json({ success: true, uid: decoded.uid });
    } catch (e) {
      throw new HttpError(401, 'Invalid token');
    }
  }
}
