import type { VercelRequest, VercelResponse } from '@vercel/node';

type PricePoint = { date: string; close: number };

const bases: Record<string, number> = { 'CL=F': 76.42, 'GC=F': 2478.6, 'NG=F': 3.18 };

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const symbol = req.query.commodity as string;
  if (!symbol || !bases[symbol]) return res.status(400).json({ error: 'Valid commodity symbol required' });

  const base = bases[symbol];
  const points: PricePoint[] = [];
  for (let i = 44; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(2026, 7, 22 - i));
    const wave = Math.sin((44 - i) * 0.46) * base * 0.012;
    const drift = (44 - i) * base * 0.0008;
    const eventPulse = (44 - i === 40 ? base * 0.018 : 0) + (44 - i === 33 ? -base * 0.014 : 0);
    const close = base - base * 0.028 + wave + drift + eventPulse;
    points.push({ date: date.toISOString().slice(0, 10), close: Number(close.toFixed(2)) });
  }
  return res.status(200).json(points);
}
