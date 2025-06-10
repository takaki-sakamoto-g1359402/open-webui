import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import type { Role } from '../types/role.js';
import { HttpError } from '../utils/HttpError.js';

export interface AuthenticatedRequest extends Request {
  user?: { uid: string; role: Role };
}

// Firebase ID Token を検証するミドルウェア
export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Unauthorized'));
  }
  const token = header.split(' ')[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded.role as Role) ?? 'USER';
    req.user = { uid: decoded.uid, role };
    next();
  } catch (err) {
    next(new HttpError(401, 'Invalid token'));
  }
};

// 必要なロールを要求するミドルウェア
export const requireRole = (roles: Role[]) => (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, 'Forbidden'));
  }
  next();
};
