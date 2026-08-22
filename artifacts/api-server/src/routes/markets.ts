import { Router, type IRouter } from "express";
import {
  GetBriefQueryParams,
  GetEventsQueryParams,
  GetPricesQueryParams,
  GetPricesResponse,
  GetEventsResponse,
  GetBriefResponse,
  ListCommoditiesResponse,
} from "@workspace/api-zod";

type Commodity = {
  symbol: string;
  name: string;
  unit: string;
  currency: string;
};

type PricePoint = { date: string; close: number };
type MarketEvent = {
  date: string;
  headline: string;
  category: string;
  sentimentScore: number;
  priceMove5d: number;
  source: string;
};

const commodities: Commodity[] = [
  { symbol: "CL=F", name: "Crude Oil", unit: "per barrel", currency: "USD" },
  { symbol: "GC=F", name: "Gold", unit: "per troy oz", currency: "USD" },
  { symbol: "NG=F", name: "Natural Gas", unit: "per MMBtu", currency: "USD" },
];

const eventTemplates: Record<string, MarketEvent[]> = {
  "CL=F": [
    { date: "2026-08-18", headline: "EIA inventory draw exceeds expectations by 2.1M barrels", category: "EIA", sentimentScore: 0.78, priceMove5d: 3.42, source: "Energy Information Administration" },
    { date: "2026-08-11", headline: "OPEC+ signals disciplined supply policy through Q4", category: "OPEC+", sentimentScore: 0.54, priceMove5d: 1.86, source: "OPEC Secretariat" },
    { date: "2026-08-04", headline: "China manufacturing PMI contracts for third month", category: "Macro", sentimentScore: -0.62, priceMove5d: -2.17, source: "National Bureau of Statistics" },
    { date: "2026-07-28", headline: "Shipping disruption reported in key Red Sea route", category: "Geopolitics", sentimentScore: 0.41, priceMove5d: 1.09, source: "Market desk" },
  ],
  "GC=F": [
    { date: "2026-08-18", headline: "Fed minutes reinforce patience on rate cuts", category: "Fed", sentimentScore: 0.32, priceMove5d: 1.27, source: "Federal Reserve" },
    { date: "2026-08-12", headline: "Central bank purchases remain elevated in July", category: "Flows", sentimentScore: 0.71, priceMove5d: 2.12, source: "World Gold Council" },
    { date: "2026-08-05", headline: "US payrolls beat consensus, lifting real yields", category: "Macro", sentimentScore: -0.58, priceMove5d: -1.64, source: "Bureau of Labor Statistics" },
  ],
  "NG=F": [
    { date: "2026-08-19", headline: "Forecast points to hotter-than-normal week across Texas", category: "Weather", sentimentScore: 0.67, priceMove5d: 4.18, source: "NOAA" },
    { date: "2026-08-13", headline: "Storage injection lands above five-year average", category: "EIA", sentimentScore: -0.49, priceMove5d: -2.73, source: "Energy Information Administration" },
    { date: "2026-08-06", headline: "LNG feedgas demand reaches seasonal high", category: "Demand", sentimentScore: 0.61, priceMove5d: 2.88, source: "Pipeline data" },
  ],
};

function makePrices(symbol: string): PricePoint[] {
  const bases: Record<string, number> = { "CL=F": 76.42, "GC=F": 2478.6, "NG=F": 3.18 };
  const base = bases[symbol] ?? 100;
  const points: PricePoint[] = [];
  for (let i = 44; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(2026, 7, 22 - i));
    const wave = Math.sin((44 - i) * 0.46) * base * 0.012;
    const drift = (44 - i) * base * 0.0008;
    const eventPulse = (44 - i === 40 ? base * 0.018 : 0) + (44 - i === 33 ? -base * 0.014 : 0);
    const close = base - base * 0.028 + wave + drift + eventPulse;
    points.push({ date: date.toISOString().slice(0, 10), close: Number(close.toFixed(2)) });
  }
  return points;
}

function findCommodity(symbol: string) {
  return commodities.find((commodity) => commodity.symbol === symbol);
}

const router: IRouter = Router();

router.get("/commodities", (_req, res) => {
  res.json(ListCommoditiesResponse.parse(commodities));
});

router.get("/prices", (req, res) => {
  const parsed = GetPricesQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "commodity is required" });
  const prices = makePrices(parsed.data.commodity);
  if (!findCommodity(parsed.data.commodity)) return res.status(404).json({ error: "No price data for that commodity" });
  return res.json(GetPricesResponse.parse(prices));
});

router.get("/events", (req, res) => {
  const parsed = GetEventsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "commodity is required" });
  if (!findCommodity(parsed.data.commodity)) return res.status(404).json({ error: "No events for that commodity" });
  return res.json(GetEventsResponse.parse(eventTemplates[parsed.data.commodity] ?? []));
});

router.get("/brief", (req, res) => {
  const parsed = GetBriefQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "commodity is required" });
  const commodity = findCommodity(parsed.data.commodity);
  if (!commodity) return res.status(404).json({ error: "No market data for that commodity" });
  const prices = makePrices(commodity.symbol);
  const latestPrice = prices[prices.length - 1].close;
  const firstPrice = prices[0].close;
  const changePct = Number((((latestPrice - firstPrice) / firstPrice) * 100).toFixed(2));
  const events = eventTemplates[commodity.symbol] ?? [];
  const tone = changePct >= 0 ? "constructive" : "defensive";
  const lead = events[0]?.headline ?? "No major catalysts have been logged recently.";
  const brief = `${commodity.name} is trading with a ${tone} bias, up ${Math.abs(changePct).toFixed(2)}% across the tracked window. The latest catalyst is ${lead.toLowerCase()} The tape is responding more to event risk than to a clean trend, so keep position sizing measured around the next scheduled release.`;
  return res.json(GetBriefResponse.parse({
    commodity: commodity.symbol,
    brief,
    latestPrice,
    changePct,
    asOf: "2026-08-22T08:30:00Z",
  }));
});

export default router;