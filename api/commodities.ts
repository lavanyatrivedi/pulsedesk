import type { VercelRequest, VercelResponse } from '@vercel/node';

const commodities = [
  { symbol: 'CL=F', name: 'Crude Oil', unit: 'per barrel', currency: 'USD' },
  { symbol: 'GC=F', name: 'Gold', unit: 'per troy oz', currency: 'USD' },
  { symbol: 'NG=F', name: 'Natural Gas', unit: 'per MMBtu', currency: 'USD' },
];

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json(commodities);
}
