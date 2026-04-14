import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Banknote,
  BarChart3,
  Scale,
  Activity,
} from 'lucide-react';
import {
  macroFinancialIndicators,
} from '@/data/macroFinancialData';
import type { FinancialIndicator } from '@/data/macroFinancialData';

// Helper to get icon based on category
const getCategoryIcon = (category: FinancialIndicator['category']) => {
  switch (category) {
    case 'equity':
      return <Banknote className="w-4 h-4 text-blue-400" />;
    case 'commodity':
      return <BarChart3 className="w-4 h-4 text-yellow-400" />;
    case 'bond_fx':
      return <Scale className="w-4 h-4 text-emerald-400" />;
    case 'sentiment':
      return <Activity className="w-4 h-4 text-purple-400" />;
    default:
      return <LineChart className="w-4 h-4 text-slate-400" />;
  }
};

// Sparkline component
const Sparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-8 opacity-70">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface FinancialIndicatorCardProps {
  indicator: FinancialIndicator;
  onClick?: (indicator: FinancialIndicator) => void;
}

const FinancialIndicatorCard = ({ indicator, onClick }: FinancialIndicatorCardProps) => {
  const isPositive = indicator.changePercent > 0;
  const useRedUp = indicator.countryCode === 'CHN' || indicator.countryCode === 'JPN';
  const positiveColor = useRedUp ? 'text-rose-400' : 'text-emerald-400';
  const negativeColor = useRedUp ? 'text-emerald-400' : 'text-rose-400';
  const changeColorClass = isPositive ? positiveColor : negativeColor;
  const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      onClick={() => onClick && onClick(indicator)}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg transition-colors duration-200',
        'hover:bg-slate-700/50 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-2">
        {getCategoryIcon(indicator.category)}
        <div>
          <p className="text-sm font-medium text-slate-200">{indicator.name}</p>
          <p className="text-xs text-slate-400">{indicator.code}</p>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <p className="text-lg font-bold text-white">{indicator.value.toFixed(2)}</p>
        <div className="flex items-center gap-1 text-xs font-medium">
          <ChangeIcon className={cn('w-3 h-3', changeColorClass)} />
          <span className={changeColorClass}>{indicator.changePercent.toFixed(2)}%</span>
          <Sparkline data={indicator.trendData} />
        </div>
      </div>
    </div>
  );
};

interface GlobalMacroFinancialDashboardProps {
  onIndicatorClick?: (indicator: FinancialIndicator) => void;
}

export default function GlobalMacroFinancialDashboard({ onIndicatorClick }: GlobalMacroFinancialDashboardProps) {
  const [indicators, setIndicators] = useState<FinancialIndicator[]>(macroFinancialIndicators);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchIndicators = async () => {
      try {
        const resp = await fetch('/api/indicators');
        const data = (await resp.json()) as unknown;
        const parsed = data as { updatedAt?: string; indicators?: FinancialIndicator[] };
        if (!cancelled && Array.isArray(parsed.indicators) && parsed.indicators.length) {
          setIndicators(parsed.indicators);
          if (parsed.updatedAt) {
            const t = new Date(parsed.updatedAt);
            setLastUpdateTime(
              t.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
            );
          }
        }
      } catch {
        if (!cancelled) setIndicators(macroFinancialIndicators);
      }
    };

    fetchIndicators();
    const timer = setInterval(fetchIndicators, 65000); // 65 seconds to avoid Twelve Data free tier 8 credits/min limit

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col',
        'bg-slate-900/90 backdrop-blur-md border-l border-slate-800',
        'overflow-y-auto'
      )}
    >
      <div className="p-6 pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white mb-2">全球宏观金融实时看板</h2>
        <p className="text-sm text-slate-400">
          追踪全球主要金融指标，洞察市场动态。
        </p>
      </div>

      <div className="flex-1 p-4 space-y-2">
        {indicators.map((indicator) => (
          <FinancialIndicatorCard 
            key={indicator.id} 
            indicator={indicator} 
            onClick={onIndicatorClick}
          />
        ))}
      </div>

      <div className="p-4 pt-3 border-t border-slate-800 text-xs text-slate-500 text-center">
        数据最后更新时间: {lastUpdateTime ?? '—'}
      </div>
    </div>
  );
}
