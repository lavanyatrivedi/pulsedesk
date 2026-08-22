import type { Request, Response } from 'express';

const commodities = [
  { symbol: 'CL=F', name: 'Crude Oil', unit: 'per barrel', currency: 'USD' },
  { symbol: 'GC=F', name: 'Gold', unit: 'per troy oz', currency: 'USD' },
  { symbol: 'NG=F', name: 'Natural Gas', unit: 'per MMBtu', currency: 'USD' },
];

export default function handler(_req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(commodities);
}
