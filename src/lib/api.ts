import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export type Commodity = {
  symbol: string;
  name: string;
  unit: string;
  currency: string;
};

export type PricePoint = {
  date: string;
  close: number;
};

export type MarketEvent = {
  date: string;
  headline: string;
  category: string;
  sentimentScore: number;
  priceMove5d: number;
  source: string;
};

export type DeskBrief = {
  commodity: string;
  brief: string;
  latestPrice: number;
  changePct: number;
  asOf: string;
};

export const getListCommoditiesQueryKey = () => ['/api/commodities'] as const;
export const getGetPricesQueryKey = (params?: { commodity?: string }) => ['/api/prices', params] as const;
export const getGetEventsQueryKey = (params?: { commodity?: string }) => ['/api/events', params] as const;
export const getGetBriefQueryKey = (params?: { commodity?: string }) => ['/api/brief', params] as const;

export function useListCommodities(options?: any): UseQueryResult<Commodity[], Error> {
  return useQuery<Commodity[], Error>({
    queryKey: getListCommoditiesQueryKey(),
    queryFn: async (): Promise<Commodity[]> => {
      const res = await fetch('/api/commodities');
      if (!res.ok) throw new Error('Failed to fetch commodities');
      return res.json();
    },
    ...options?.query,
  });
}

export function useGetPrices(params: { commodity: string }, options?: any): UseQueryResult<PricePoint[], Error> {
  return useQuery<PricePoint[], Error>({
    queryKey: getGetPricesQueryKey(params),
    queryFn: async (): Promise<PricePoint[]> => {
      if (!params?.commodity) return [];
      const res = await fetch(`/api/prices?commodity=${encodeURIComponent(params.commodity)}`);
      if (!res.ok) throw new Error('Failed to fetch prices');
      return res.json();
    },
    ...options?.query,
  });
}

export function useGetEvents(params: { commodity: string }, options?: any): UseQueryResult<MarketEvent[], Error> {
  return useQuery<MarketEvent[], Error>({
    queryKey: getGetEventsQueryKey(params),
    queryFn: async (): Promise<MarketEvent[]> => {
      if (!params?.commodity) return [];
      const res = await fetch(`/api/events?commodity=${encodeURIComponent(params.commodity)}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    ...options?.query,
  });
}

export function useGetBrief(params: { commodity: string }, options?: any): UseQueryResult<DeskBrief, Error> {
  return useQuery<DeskBrief, Error>({
    queryKey: getGetBriefQueryKey(params),
    queryFn: async (): Promise<DeskBrief> => {
      if (!params?.commodity) throw new Error('Commodity required');
      const res = await fetch(`/api/brief?commodity=${encodeURIComponent(params.commodity)}`);
      if (!res.ok) throw new Error('Failed to fetch brief');
      return res.json();
    },
    ...options?.query,
  });
}
