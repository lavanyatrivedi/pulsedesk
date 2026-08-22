import type { Request, Response } from 'express';

export default function handler(_req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
