import type { Request, Response } from 'express';

const eventTemplates: Record<string, any[]> = {
  'CL=F': [
    { date: '2026-08-18', headline: 'EIA inventory draw exceeds expectations by 2.1M barrels', category: 'EIA', sentimentScore: 0.78, priceMove5d: 3.42, source: 'Energy Information Administration' },
    { date: '2026-08-11', headline: 'OPEC+ signals disciplined supply policy through Q4', category: 'OPEC+', sentimentScore: 0.54, priceMove5d: 1.86, source: 'OPEC Secretariat' },
    { date: '2026-08-04', headline: 'China manufacturing PMI contracts for third month', category: 'Macro', sentimentScore: -0.62, priceMove5d: -2.17, source: 'National Bureau of Statistics' },
    { date: '2026-07-28', headline: 'Shipping disruption reported in key Red Sea route', category: 'Geopolitics', sentimentScore: 0.41, priceMove5d: 1.09, source: 'Market desk' },
  ],
  'GC=F': [
    { date: '2026-08-18', headline: 'Fed minutes reinforce patience on rate cuts', category: 'Fed', sentimentScore: 0.32, priceMove5d: 1.27, source: 'Federal Reserve' },
    { date: '2026-08-12', headline: 'Central bank purchases remain elevated in July', category: 'Flows', sentimentScore: 0.71, priceMove5d: 2.12, source: 'World Gold Council' },
    { date: '2026-08-05', headline: 'US payrolls beat consensus, lifting real yields', category: 'Macro', sentimentScore: -0.58, priceMove5d: -1.64, source: 'Bureau of Labor Statistics' },
  ],
  'NG=F': [
    { date: '2026-08-19', headline: 'Forecast points to hotter-than-normal week across Texas', category: 'Weather', sentimentScore: 0.67, priceMove5d: 4.18, source: 'NOAA' },
    { date: '2026-08-13', headline: 'Storage injection lands above five-year average', category: 'EIA', sentimentScore: -0.49, priceMove5d: -2.73, source: 'Energy Information Administration' },
    { date: '2026-08-06', headline: 'LNG feedgas demand reaches seasonal high', category: 'Demand', sentimentScore: 0.61, priceMove5d: 2.88, source: 'Pipeline data' },
  ],
};

export default function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const symbol = req.query.commodity as string;
  if (!symbol) return res.status(400).json({ error: 'Commodity required' });
  return res.json(eventTemplates[symbol] ?? []);
}
