import type { Request, Response } from 'express';
import { z } from 'zod';

const feedbackSchema = z.object({
  text: z.string()
});

export class FeedbackAgent {
  // AI フィードバック生成
  async generate(req: Request, res: Response) {
    const { text } = feedbackSchema.parse(req.body);
    // AutoGen によるフィードバック生成処理(省略)
    const feedback = `AI feedback for: ${text}`;
    res.json({ feedback });
  }
}
