export type FinancialIndicatorCategory = 'equity' | 'commodity' | 'bond_fx' | 'sentiment';

export interface FinancialIndicator {
  id: string;
  name: string;
  code: string;
  category: FinancialIndicatorCategory;
  value: number;
  change: number;
  changePercent: number;
  trendData: number[]; // Simple array for sparkline
  countryCode?: string; // Optional, for future globe interaction
  location?: { lat: number; lng: number; altitude?: number }; // Specific location to focus on
}

export const macroFinancialIndicators: FinancialIndicator[] = [
  // Equities
  {
    id: 'shcomp',
    name: '上证指数',
    code: 'SHCOMP',
    category: 'equity',
    value: 3050.12,
    change: 15.30,
    changePercent: 0.50,
    trendData: [3030, 3045, 3035, 3060, 3050, 3055, 3040, 3050],
    countryCode: 'CHN',
    location: { lat: 35.8617, lng: 104.1954, altitude: 1.5 }, // China
  },
  {
    id: 'ixic',
    name: '纳斯达克',
    code: 'IXIC',
    category: 'equity',
    value: 17600.55,
    change: -80.20,
    changePercent: -0.45,
    trendData: [17650, 17620, 17680, 17590, 17630, 17580, 17610, 17600],
    countryCode: 'USA',
    location: { lat: 37.0902, lng: -95.7129, altitude: 1.5 }, // USA
  },
  {
    id: 'n225',
    name: '日经 225',
    code: 'N225',
    category: 'equity',
    value: 38500.70,
    change: 120.30,
    changePercent: 0.31,
    trendData: [38400, 38450, 38380, 38550, 38520, 38480, 38510, 38500],
    countryCode: 'JPN',
    location: { lat: 36.2048, lng: 138.2529, altitude: 1.5 }, // Japan
  },
  // Commodities
  {
    id: 'xauusd',
    name: '现货黄金',
    code: 'XAU/USD',
    category: 'commodity',
    value: 2350.80,
    change: 5.20,
    changePercent: 0.22,
    trendData: [2345, 2348, 2340, 2355, 2352, 2349, 2353, 2350],
  },
  {
    id: 'brentoil',
    name: '布伦特原油',
    code: 'Brent Oil',
    category: 'commodity',
    value: 85.30,
    change: -0.75,
    changePercent: -0.87,
    trendData: [86.0, 85.8, 86.5, 85.0, 85.5, 85.2, 85.7, 85.3],
  },
  // Bonds / Forex
  {
    id: 'us10y',
    name: '美债 10 年期收益率',
    code: 'US10Y',
    category: 'bond_fx',
    value: 4.52,
    change: 0.03,
    changePercent: 0.67,
    trendData: [4.49, 4.50, 4.48, 4.53, 4.51, 4.50, 4.54, 4.52],
    countryCode: 'USA',
    location: { lat: 37.0902, lng: -95.7129, altitude: 1.5 }, // USA
  },
  {
    id: 'dxy',
    name: '美元指数',
    code: 'DXY',
    category: 'bond_fx',
    value: 105.20,
    change: -0.15,
    changePercent: -0.14,
    trendData: [105.35, 105.25, 105.40, 105.10, 105.30, 105.18, 105.22, 105.20],
    countryCode: 'USA',
    location: { lat: 37.0902, lng: -95.7129, altitude: 1.5 }, // USA
  },
  // Sentiment
  {
    id: 'vix',
    name: 'VIX 恐慌指数',
    code: 'VIX',
    category: 'sentiment',
    value: 13.80,
    change: 0.40,
    changePercent: 2.99,
    trendData: [13.40, 13.55, 13.30, 13.90, 13.75, 13.60, 13.85, 13.80],
  },
];

export const getMacroFinancialIndicators = () => {
  // In a real application, this would fetch data from an API
  return macroFinancialIndicators;
};

export const getLastUpdateTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};