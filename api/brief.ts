import type { VercelRequest, VercelResponse } from '@vercel/node';

const commodities = [
  { symbol: 'CL=F', name: 'Crude Oil', unit: 'per barrel', currency: 'USD' },
  { symbol: 'GC=F', name: 'Gold', unit: 'per troy oz', currency: 'USD' },
  { symbol: 'NG=F', name: 'Natural Gas', unit: 'per MMBtu', currency: 'USD' },
];

const eventTemplates: Record<string, any[]> = {
  'CL=F': [{ date: '2026-08-18', headline: 'EIA inventory draw exceeds expectations by 2.1M barrels' }],
  'GC=F': [{ date: '2026-08-18', headline: 'Fed minutes reinforce patience on rate cuts' }],
  'NG=F': [{ date: '2026-08-19', headline: 'Forecast points to hotter-than-normal week across Texas' }],
};

const bases: Record<string, number> = { 'CL=F': 76.42, 'GC=F': 2478.6, 'NG=F': 3.18 };

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const symbol = req.query.commodity as string;
  const commodity = commodities.find((c) => c.symbol === symbol);
  if (!commodity) return res.status(404).json({ error: 'No market data for that commodity' });

  const base = bases[symbol] ?? 100;
  const firstPrice = base - base * 0.028;
  const latestPrice = base + base * 0.015;
  const changePct = Number((((latestPrice - firstPrice) / firstPrice) * 100).toFixed(2));
  const events = eventTemplates[symbol] ?? [];
  const tone = changePct >= 0 ? 'constructive' : 'defensive';
  const lead = events[0]?.headline ?? 'No major catalysts have been logged recently.';
  const brief = `${commodity.name} is trading with a ${tone} bias, up ${Math.abs(changePct).toFixed(2)}% across the tracked window. The latest catalyst is ${lead.toLowerCase()} The tape is responding more to event risk than to a clean trend, so keep position sizing measured around the next scheduled release.`;

  return res.status(200).json({
    commodity: commodity.symbol,
    brief,
    latestPrice,
    changePct,
    asOf: '2026-08-22T08:30:00Z',
  });
}
