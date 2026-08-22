import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bell, BookOpen, ChevronDown, CircleAlert, Clock3, Command, Gauge, LineChart, RefreshCw, Search, Settings2, Signal, TrendingDown, TrendingUp, Wifi } from 'lucide-react';
import { getGetBriefQueryKey, getGetEventsQueryKey, getGetPricesQueryKey, getListCommoditiesQueryKey, useGetBrief, useGetEvents, useGetPrices, useListCommodities, type Commodity, type MarketEvent, type PricePoint } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import './index.css';

const queryClient = new QueryClient();

function formatDate(value?: string, short = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', short ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatPrice(value?: number, currency = '$') {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const prefix = currency.length <= 2 ? currency : `${currency} `;
  return `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function sentimentLabel(score: number) {
  if (score >= 0.35) return 'Constructive';
  if (score <= -0.35) return 'Defensive';
  return 'Mixed';
}

function sentimentClass(score: number) {
  if (score >= 0.15) return 'text-[#3b777c]';
  if (score <= -0.15) return 'text-[#b25546]';
  return 'text-[hsl(var(--muted-foreground))]';
}

function categoryTone(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('macro') || normalized.includes('rate')) return 'bg-[#e1e8e8] text-[#376b70]';
  if (normalized.includes('supply') || normalized.includes('weather')) return 'bg-[#f4e8c9] text-[#8b6828]';
  if (normalized.includes('demand') || normalized.includes('flow')) return 'bg-[#e9dfed] text-[#76547d]';
  return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
}

function ErrorState({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <div className="panel flex min-h-[260px] flex-col items-center justify-center px-5 text-center" data-testid={`status-error-${label}`}>
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#f6dfda] text-[#b25546]">
        <CircleAlert size={18} />
      </div>
      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Could not load {label}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-[hsl(var(--muted-foreground))]">The desk will try again when you ask it to.</p>
      <button className="focus-ring mt-4 inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold transition hover:border-[hsl(var(--primary)/.35)] hover:bg-[hsl(var(--muted))]" onClick={onRetry} data-testid={`button-retry-${label}`}>
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );
}

function LoadingPanel({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`panel ${wide ? 'min-h-[325px]' : 'min-h-[190px]'} p-5`} data-testid="status-loading">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-5 h-9 w-48" />
      <div className="skeleton mt-4 h-3 w-full" />
      <div className="skeleton mt-2 h-3 w-4/5" />
      {wide && <div className="skeleton mt-10 h-28 w-full" />}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="panel flex min-h-[190px] flex-col items-center justify-center px-5 text-center" data-testid={`status-empty-${label}`}>
      <Signal size={20} className="mb-3 text-[hsl(var(--muted-foreground))]" />
      <p className="text-sm font-semibold">No {label} yet</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">There is no market readout for this selection.</p>
    </div>
  );
}

function PriceChart({ points, currency }: { points: PricePoint[]; currency: string }) {
  const width = 720;
  const height = 230;
  const padX = 14;
  const padY = 25;
  const values = points.map((point) => point.close).filter((value) => Number.isFinite(value));
  if (!values.length) return <EmptyPanel label="price history" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(max * 0.02, 1);
  const coords = values.map((value, index) => ({
    x: padX + (index / Math.max(values.length - 1, 1)) * (width - padX * 2),
    y: padY + (1 - (value - min) / range) * (height - padY * 2),
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;
  const first = values[0];
  const last = values[values.length - 1];
  const delta = first ? ((last - first) / first) * 100 : 0;
  const yLabels = [max, min + range / 2, min];
  return (
    <div className="relative mt-4" data-testid="chart-price-history">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#3b777c]" />
          <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Close</span>
          <span className={`mono text-[10px] ${delta >= 0 ? 'text-[#3b777c]' : 'text-[#b25546]'}`}>{formatPct(delta)} across window</span>
        </div>
        <span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{formatPrice(last, currency)}</span>
      </div>
      <div className="flex">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[210px] min-w-0 flex-1 overflow-visible" role="img" aria-label="Commodity price history">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(187 42% 43% / .20)" />
              <stop offset="100%" stopColor="hsl(187 42% 43% / 0)" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((fraction) => <line key={fraction} x1={padX} x2={width - padX} y1={padY + fraction * (height - padY * 2)} y2={padY + fraction * (height - padY * 2)} className="chart-grid" />)}
          <polygon points={area} className="chart-area" />
          <polyline points={line} className="chart-line" />
          {coords.filter((_, index) => index === coords.length - 1).map((point) => <circle key={point.x} cx={point.x} cy={point.y} r="4.5" fill="hsl(var(--card))" stroke="hsl(187 42% 43%)" strokeWidth="2.5" />)}
        </svg>
        <div className="flex w-14 shrink-0 flex-col justify-between pb-5 pl-2 pt-1">
          {yLabels.map((value, index) => <span key={index} className="mono text-right text-[9px] text-[hsl(var(--muted-foreground))]">{formatPrice(value, currency)}</span>)}
        </div>
      </div>
      <div className="mono flex justify-between px-1 text-[9px] text-[hsl(var(--muted-foreground))]">
        <span>{formatDate(points[0]?.date, true)}</span>
        <span>{formatDate(points[Math.floor(points.length / 2)]?.date, true)}</span>
        <span>{formatDate(points[points.length - 1]?.date, true)}</span>
      </div>
    </div>
  );
}

function Sidebar() {
  const [showNotice, setShowNotice] = useState(false);
  return (
    <aside className="desk-rail" data-testid="navigation-sidebar">
      <div className="rail-topline">
        <div className="flex items-center gap-3">
          <div className="rail-logo-mark"><Signal size={17} strokeWidth={2.5} /></div>
          <div>
            <div className="text-[15px] font-bold tracking-[-0.02em]">PulseDesk</div>
            <div className="mono mt-0.5 text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--sidebar-foreground)/.48)]">Market intelligence</div>
          </div>
        </div>
        <button onClick={() => setShowNotice((current) => !current)} className="focus-ring hidden rounded-md p-2 text-[hsl(var(--sidebar-foreground)/.6)] transition hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))] md:block" data-testid="button-notifications" title="Notifications" aria-expanded={showNotice}><Bell size={16} /></button>
      </div>
      {showNotice && <div className="mt-4 rounded-lg border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))] px-3 py-2.5 text-[11px] leading-4 text-[hsl(var(--sidebar-foreground)/.7)]" role="status" data-testid="status-notifications">No new desk alerts. Your market feed is current.</div>}
      <div className="rail-nav mt-14 space-y-1">
        <div className="mb-3 px-3 section-kicker !text-[hsl(var(--sidebar-foreground)/.35)]">Workspace</div>
        <a href="/" className="rail-nav-item active focus-ring" data-testid="link-market-readout">
          <Gauge size={16} /><span>Market readout</span><span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />
        </a>
        <a href="#catalysts" className="rail-nav-item focus-ring" data-testid="link-catalysts"><LineChart size={16} /><span>Catalyst tape</span></a>
        <a href="#brief" className="rail-nav-item focus-ring" data-testid="link-desk-brief"><BookOpen size={16} /><span>Desk brief</span></a>
      </div>
      <div className="rail-foot mt-auto">
        <div className="mb-4 rounded-lg border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-3">
          <div className="flex items-center gap-2">
            <Wifi size={13} className="text-[hsl(var(--sidebar-primary))]" />
            <span className="mono text-[10px] uppercase tracking-[.08em] text-[hsl(var(--sidebar-foreground)/.7)]">Live feed</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-[hsl(var(--sidebar-foreground)/.48)]">Prices, catalysts, and realized moves in one place.</p>
        </div>
        <div className="flex items-center justify-between px-2 text-[11px] text-[hsl(var(--sidebar-foreground)/.45)]">
          <span>v1.0.4</span><Settings2 size={14} />
        </div>
      </div>
    </aside>
  );
}

function CommodityPicker({ commodities, selected, onSelect }: { commodities: Commodity[]; selected: string; onSelect: (value: string) => void }) {
  const selectedCommodity = commodities.find((commodity) => commodity.symbol === selected);
  return (
    <div className="relative">
      <label htmlFor="commodity-picker" className="section-kicker mb-2 block">Instrument</label>
      <div className="relative">
        <select id="commodity-picker" value={selected} onChange={(event) => onSelect(event.target.value)} className="focus-ring w-full min-w-[205px] appearance-none rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-3 pl-3 pr-10 text-sm font-semibold text-[hsl(var(--foreground))] shadow-sm transition hover:border-[hsl(var(--primary)/.35)]" data-testid="select-commodity">
          {commodities.map((commodity) => <option key={commodity.symbol} value={commodity.symbol}>{commodity.symbol} · {commodity.name}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      </div>
      {selectedCommodity && <div className="mono mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">{selectedCommodity.unit} · {selectedCommodity.currency}</div>}
    </div>
  );
}

function AppDashboard() {
  const commoditiesQuery = useListCommodities({ query: { queryKey: getListCommoditiesQueryKey() } });
  const commodities = commoditiesQuery.data ?? [];
  const [selectedSymbol, setSelectedSymbol] = useState('');

  useEffect(() => {
    if (!selectedSymbol && commodities[0]?.symbol) setSelectedSymbol(commodities[0].symbol);
  }, [commodities, selectedSymbol]);

  const params = { commodity: selectedSymbol };
  const pricesQuery = useGetPrices(params, { query: { enabled: Boolean(selectedSymbol), queryKey: getGetPricesQueryKey(params) } });
  const eventsQuery = useGetEvents(params, { query: { enabled: Boolean(selectedSymbol), queryKey: getGetEventsQueryKey(params) } });
  const briefQuery = useGetBrief(params, { query: { enabled: Boolean(selectedSymbol), queryKey: getGetBriefQueryKey(params) } });

  const commodity = commodities.find((item) => item.symbol === selectedSymbol);
  const points = pricesQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const brief = briefQuery.data;
  const latestPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  const latestPrice = brief?.latestPrice ?? latestPoint?.close;
  const computedChange = brief?.changePct ?? (previousPoint?.close && latestPoint ? ((latestPoint.close - previousPoint.close) / previousPoint.close) * 100 : undefined);
  const averageSentiment = useMemo(() => events.length ? events.reduce((sum, event) => sum + event.sentimentScore, 0) / events.length : 0, [events]);
  const averageImpact = useMemo(() => events.length ? events.reduce((sum, event) => sum + event.priceMove5d, 0) / events.length : 0, [events]);
  const latestEvent = events[0];
  const deskDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  const isLoading = commoditiesQuery.isLoading || (Boolean(selectedSymbol) && (pricesQuery.isLoading || eventsQuery.isLoading || briefQuery.isLoading));
  const hasError = commoditiesQuery.isError || (Boolean(selectedSymbol) && (pricesQuery.isError || eventsQuery.isError || briefQuery.isError));

  const refreshDesk = async () => {
    await Promise.all([commoditiesQuery.refetch(), pricesQuery.refetch(), eventsQuery.refetch(), briefQuery.refetch()]);
  };

  if (commoditiesQuery.isLoading) {
    return <div className="desk-shell"><Sidebar /><main className="desk-content"><div className="skeleton h-4 w-40" /><div className="skeleton mt-8 h-12 w-80" /><div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_.8fr]"><LoadingPanel wide /><LoadingPanel wide /></div></main></div>;
  }

  if (commoditiesQuery.isError) {
    return <div className="desk-shell"><Sidebar /><main className="desk-content"><div className="mx-auto max-w-xl pt-20"><ErrorState label="commodities" onRetry={() => commoditiesQuery.refetch()} /></div></main></div>;
  }

  if (!commodities.length) {
    return <div className="desk-shell"><Sidebar /><main className="desk-content"><div className="mx-auto max-w-xl pt-20"><EmptyPanel label="commodities" /></div></main></div>;
  }

  if (hasError) {
    return <div className="desk-shell"><Sidebar /><main className="desk-content"><div className="mx-auto max-w-xl pt-20"><ErrorState label="market data" onRetry={refreshDesk} /></div></main></div>;
  }

  return (
    <div className="desk-shell">
      <Sidebar />
      <main className="desk-content">
        <header className="fade-up flex flex-col gap-6 border-b border-[hsl(var(--border))] pb-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <span className="section-kicker">{deskDate}</span>
              <span className="h-1 w-1 rounded-full bg-[hsl(var(--accent-foreground))]" />
              <span className="mono text-[10px]">Morning desk</span>
            </div>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.06em] text-[hsl(var(--foreground))]">The market, <span className="display-serif font-normal italic">decoded.</span></h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">A clear read on what moved the tape and where the next five days could land.</p>
          </div>
          <div className="flex items-end gap-3">
            <CommodityPicker commodities={commodities} selected={selectedSymbol} onSelect={setSelectedSymbol} />
            <button onClick={refreshDesk} className="focus-ring mb-5 inline-flex h-11 items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-xs font-semibold text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/.35)] hover:bg-[hsl(var(--muted))]" data-testid="button-refresh-desk">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#dcebe8] text-[#3b777c]"><Clock3 size={13} /></span>
            <span>Readout as of <strong className="font-semibold text-[hsl(var(--foreground))]">{formatTime(brief?.asOf ?? latestPoint?.date)}</strong></span>
          </div>
          <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]"><span className="h-1.5 w-1.5 rounded-full bg-[#6c9a65]" /> Connected to market feed</div>
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_.8fr]">
          <article className="panel panel-hover fade-up fade-up-1 relative overflow-hidden p-6 sm:p-8" id="brief" data-testid="panel-desk-brief">
            <div className="absolute right-8 top-0 h-24 w-24 translate-y-[-42px] rounded-full border-[10px] border-[hsl(var(--accent)/.16)]" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="section-kicker">Desk brief</div>
                <div className="rounded-full bg-[hsl(var(--accent)/.42)] px-2.5 py-1 mono text-[9px] font-bold uppercase tracking-[.1em] text-[hsl(var(--accent-foreground))]">Signal / {sentimentLabel(averageSentiment)}</div>
              </div>
              {briefQuery.isLoading ? <div className="mt-10"><div className="skeleton h-7 w-4/5" /><div className="skeleton mt-3 h-7 w-3/5" /><div className="skeleton mt-7 h-3 w-full" /><div className="skeleton mt-2 h-3 w-11/12" /></div> : brief ? <p className="mt-9 max-w-3xl text-[clamp(1.35rem,2.2vw,2rem)] leading-[1.2] tracking-[-0.04em] text-[hsl(var(--foreground))]" data-testid="text-desk-brief">{brief.brief}</p> : <EmptyPanel label="desk brief" />}
              <div className="mt-9 flex flex-wrap items-end gap-x-10 gap-y-5 border-t border-[hsl(var(--border))] pt-5">
                <div><div className="section-kicker">Last price</div><div className="mono mt-2 text-2xl font-bold tracking-[-.04em]" data-testid="text-latest-price">{formatPrice(latestPrice, commodity?.currency)}</div></div>
                <div><div className="section-kicker">Session change</div><div className={`mono mt-2 flex items-center gap-1.5 text-xl font-bold tracking-[-.04em] ${computedChange !== undefined && computedChange >= 0 ? 'text-[#3b777c]' : 'text-[#b25546]'}`} data-testid="text-session-change">{computedChange !== undefined && computedChange >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}{formatPct(computedChange)}</div></div>
                <div className="ml-auto hidden text-right sm:block"><div className="section-kicker">Instrument</div><div className="mono mt-2 text-sm font-bold">{selectedSymbol}<span className="ml-2 font-normal text-[hsl(var(--muted-foreground))]">{commodity?.unit}</span></div></div>
              </div>
            </div>
          </article>

          <article className="panel panel-hover fade-up fade-up-2 flex flex-col justify-between p-6" data-testid="panel-signal-score">
            <div className="flex items-start justify-between"><div><div className="section-kicker">Catalyst signal</div><div className={`mt-3 text-3xl font-semibold tracking-[-.06em] ${sentimentClass(averageSentiment)}`} data-testid="text-sentiment-label">{sentimentLabel(averageSentiment)}</div></div><div className="grid h-10 w-10 place-items-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--chart-2))]"><Signal size={18} /></div></div>
            <div className="mt-8">
              <div className="flex items-end justify-between"><span className="section-kicker">Net sentiment</span><span className={`mono text-2xl font-bold ${sentimentClass(averageSentiment)}`} data-testid="text-sentiment-score">{averageSentiment >= 0 ? '+' : ''}{averageSentiment.toFixed(2)}</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`h-full rounded-full transition-all duration-500 ${averageSentiment >= 0 ? 'bg-[#3b777c]' : 'bg-[#b25546]'}`} style={{ width: `${Math.max(8, Math.min(100, Math.abs(averageSentiment) * 100))}%` }} /></div>
              <div className="mt-2 flex justify-between mono text-[9px] text-[hsl(var(--muted-foreground))]"><span>Defensive</span><span>Neutral</span><span>Constructive</span></div>
            </div>
            <div className="mt-7 border-t border-[hsl(var(--border))] pt-4"><div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]"><span>Realized 5D impact</span><strong className={`mono ${averageImpact >= 0 ? 'text-[#3b777c]' : 'text-[#b25546]'}`}>{formatPct(averageImpact)}</strong></div></div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <article className="panel panel-hover fade-up fade-up-2 p-5 sm:p-6" data-testid="panel-price-chart">
            <div className="flex items-start justify-between"><div><div className="section-kicker">Price action</div><h2 className="mt-2 text-lg font-semibold tracking-[-.03em]">A five-day view of the tape</h2></div><div className="rounded-md bg-[hsl(var(--secondary))] px-2.5 py-1.5 mono text-[10px] text-[hsl(var(--muted-foreground))]">{points.length} observations</div></div>
            {pricesQuery.isLoading ? <div className="mt-10"><div className="skeleton h-48 w-full" /></div> : points.length ? <PriceChart points={points} currency={commodity?.currency ?? '$'} /> : <div className="mt-5"><EmptyPanel label="price history" /></div>}
          </article>
          <article className="panel panel-hover fade-up fade-up-3 p-5 sm:p-6" data-testid="panel-snapshot">
            <div className="section-kicker">At a glance</div>
            <h2 className="mt-2 text-lg font-semibold tracking-[-.03em]">What matters now</h2>
            <div className="mt-6 divide-y divide-[hsl(var(--border))]">
              <div className="flex items-center justify-between py-3 first:pt-0"><span className="text-xs text-[hsl(var(--muted-foreground))]">Latest catalyst</span><span className="max-w-[58%] text-right text-xs font-semibold" data-testid="text-latest-catalyst">{latestEvent?.headline ?? 'No recent catalyst'}</span></div>
              <div className="flex items-center justify-between py-3"><span className="text-xs text-[hsl(var(--muted-foreground))]">Events in window</span><span className="mono text-sm font-bold" data-testid="text-event-count">{events.length}</span></div>
              <div className="flex items-center justify-between py-3"><span className="text-xs text-[hsl(var(--muted-foreground))]">Average realized move</span><span className={`mono text-sm font-bold ${averageImpact >= 0 ? 'text-[#3b777c]' : 'text-[#b25546]'}`} data-testid="text-average-impact">{formatPct(averageImpact)}</span></div>
              <div className="flex items-center justify-between py-3 last:pb-0"><span className="text-xs text-[hsl(var(--muted-foreground))]">Readout window</span><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(points[0]?.date, true)} — {formatDate(points[points.length - 1]?.date, true)}</span></div>
            </div>
            <div className="mt-7 rounded-lg bg-[hsl(var(--secondary)/.72)] p-3.5"><div className="flex gap-2.5"><Command size={14} className="mt-0.5 shrink-0 text-[hsl(var(--chart-3))]" /><p className="text-xs leading-5 text-[hsl(var(--foreground)/.78)]">Use the catalyst tape below to pressure-test the brief before the open.</p></div></div>
          </article>
        </section>

        <section id="catalysts" className="mt-5">
          <div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Catalyst tape</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Headlines that moved the market</h2></div><div className="mono hidden text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))] sm:block">Sentiment → realized move</div></div>
          <div className="panel overflow-hidden" data-testid="panel-catalyst-tape">
            {eventsQuery.isLoading ? <div className="space-y-4 p-5"><div className="skeleton h-14 w-full" /><div className="skeleton h-14 w-full" /><div className="skeleton h-14 w-full" /></div> : !events.length ? <EmptyPanel label="catalysts" /> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Catalyst</th><th className="px-5 py-3 font-bold">Desk tag</th><th className="px-5 py-3 text-right font-bold">Sentiment</th><th className="px-5 py-3 text-right font-bold">5D impact</th></tr></thead><tbody>{events.map((event: MarketEvent, index) => <tr key={`${event.date}-${index}`} className="group border-b border-[hsl(var(--border))] last:border-0 transition-colors hover:bg-[hsl(var(--secondary)/.4)]" data-testid={`row-catalyst-${index}`}><td className="whitespace-nowrap px-5 py-4 align-top mono text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(event.date, true)}</td><td className="max-w-[430px] px-5 py-4 align-top"><div className="text-sm font-semibold leading-5">{event.headline}</div><div className="mt-1 flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]"><Search size={11} /> {event.source}</div></td><td className="px-5 py-4 align-top"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold capitalize ${categoryTone(event.category)}`}>{event.category}</span></td><td className={`px-5 py-4 text-right align-top mono text-xs font-bold ${sentimentClass(event.sentimentScore)}`}>{event.sentimentScore >= 0 ? '+' : ''}{event.sentimentScore.toFixed(2)}</td><td className={`px-5 py-4 text-right align-top mono text-xs font-bold ${event.priceMove5d >= 0 ? 'text-[#3b777c]' : 'text-[#b25546]'}`}>{formatPct(event.priceMove5d)}</td></tr>)}</tbody></table></div>}
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-[hsl(var(--border))] pt-5 text-[10px] text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between">
          <span data-testid="text-footer-status">PulseDesk / Focused on the first read.</span>
          <span className="mono">Prices are indicative · Sources shown per catalyst</span>
        </footer>
      </main>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={AppDashboard} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;