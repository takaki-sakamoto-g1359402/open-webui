import type { Request, Response, NextFunction } from 'express';

// 非同期ハンドラーのエラーハンドリングを簡略化
export const asyncHandler = (
  fn: (req: Request, res: Response) => Promise<void>
) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};
