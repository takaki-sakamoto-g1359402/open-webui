import { describe, it, expect } from 'vitest';
import { requireRole } from '../src/middlewares/auth.js';
import type { AuthenticatedRequest } from '../src/middlewares/auth.js';
import { HttpError } from '../src/utils/HttpError.js';

// requireRole の挙動テスト

describe('requireRole', () => {
  it('should call next with error when role is insufficient', () => {
    const req = { user: { uid: 'u1', role: 'USER' } } as AuthenticatedRequest;
    let passedError: HttpError | null = null;
    requireRole(['ADMIN'])(req, {} as any, (err?: unknown) => {
      passedError = err as HttpError;
    });
    expect(passedError).toBeInstanceOf(HttpError);
    expect(passedError?.status).toBe(403);
  });
});
