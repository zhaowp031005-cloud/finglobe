import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialIndicator } from '@/data/macroFinancialData';

interface FinancialChartModalProps {
  indicator: FinancialIndicator | null;
  onClose: () => void;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';

const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y'];

type Candle = { t: string; o: number; h: number; l: number; c: number };

function rangeToPoints(range: TimeRange) {
  if (range === '1D') return 96;
  if (range === '1W') return 120;
  if (range === '1M') return 120;
  if (range === '3M') return 140;
  return 160;
}

function generateMockOHLC(base: number, range: TimeRange): Candle[] {
  const points = rangeToPoints(range);
  const now = Date.now();
  const span =
    range === '1D'
      ? 24 * 60 * 60 * 1000
      : range === '1W'
        ? 7 * 24 * 60 * 60 * 1000
        : range === '1M'
          ? 30 * 24 * 60 * 60 * 1000
          : range === '3M'
            ? 90 * 24 * 60 * 60 * 1000
            : 365 * 24 * 60 * 60 * 1000;

  const step = Math.max(1, Math.floor(span / points));
  const vol = Math.max(0.001, base * (range === '1D' ? 0.002 : range === '1W' ? 0.006 : 0.012));

  const candles: Candle[] = [];
  let lastClose = base;
  for (let i = points - 1; i >= 0; i--) {
    const t = new Date(now - i * step).toISOString();
    const open = lastClose;
    const drift = (Math.random() - 0.5) * vol;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * vol * 0.6;
    const low = Math.min(open, close) - Math.random() * vol * 0.6;
    candles.push({
      t,
      o: Number(open.toFixed(6)),
      h: Number(high.toFixed(6)),
      l: Number(low.toFixed(6)),
      c: Number(close.toFixed(6)),
    });
    lastClose = close;
  }
  return candles;
}

function formatCandleTime(iso: string, range: TimeRange) {
  const d = new Date(iso);
  if (range === '1D') {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

export default function FinancialChartModal({
  indicator,
  onClose,
}: FinancialChartModalProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1W');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!indicator) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setHoverIndex(null);
      try {
        const resp = await fetch(`/api/ohlc?symbol=${encodeURIComponent(indicator.id)}&range=${encodeURIComponent(selectedRange)}`);
        const data = (await resp.json()) as unknown;
        const parsed = data as { updatedAt?: string; values?: Candle[] };
        if (!cancelled && Array.isArray(parsed.values) && parsed.values.length) {
          setCandles(parsed.values);
          if (parsed.updatedAt) {
            setDataUpdatedAt(
              new Date(parsed.updatedAt).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })
            );
          }
          setLoading(false);
          return;
        }
      } catch (error) {
        void error;
      }

      if (!cancelled) {
        const base = indicator.value || indicator.trendData[indicator.trendData.length - 1] || 1;
        setCandles(generateMockOHLC(base, selectedRange));
        setDataUpdatedAt(null);
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [indicator, selectedRange]);

  const displayCandles = useMemo(() => {
    const max = 80;
    if (candles.length <= max) return candles;
    return candles.slice(candles.length - max);
  }, [candles]);

  const stats = useMemo(() => {
    if (!displayCandles.length) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const c of displayCandles) {
      min = Math.min(min, c.l);
      max = Math.max(max, c.h);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
    return { min, max };
  }, [displayCandles]);

  const hovered = hoverIndex !== null ? displayCandles[hoverIndex] : null;

  if (!indicator) return null;

  const isPositive = indicator.changePercent >= 0;
  const useRedUp = indicator.countryCode === 'CHN' || indicator.countryCode === 'JPN';
  const positiveClass = useRedUp ? 'text-rose-400' : 'text-emerald-400';
  const negativeClass = useRedUp ? 'text-emerald-400' : 'text-rose-400';
  const changeClass = isPositive ? positiveClass : negativeClass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{indicator.name}</h2>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium">
                {indicator.code}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-bold text-white">
                {indicator.value.toFixed(2)}
              </span>
              <span
                className={cn(
                  'text-lg font-medium',
                  changeClass
                )}
              >
                {isPositive ? '+' : ''}
                {indicator.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 pb-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <div>{loading ? '加载中…' : dataUpdatedAt ? `数据更新时间：${dataUpdatedAt}` : '数据来源：模拟'}</div>
            {hovered && (
              <div className="text-slate-300">
                <span className="mr-2">{formatCandleTime(hovered.t, selectedRange)}</span>
                <span className="mr-2">开 {hovered.o.toFixed(2)}</span>
                <span className="mr-2">高 {hovered.h.toFixed(2)}</span>
                <span className="mr-2">低 {hovered.l.toFixed(2)}</span>
                <span>收 {hovered.c.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="h-[320px] w-full rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
            {stats ? (
              <svg
                viewBox="0 0 1000 320"
                className="w-full h-full text-slate-500"
                onMouseLeave={() => setHoverIndex(null)}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const idx = Math.floor((x / rect.width) * displayCandles.length);
                  if (idx >= 0 && idx < displayCandles.length) setHoverIndex(idx);
                }}
              >
                {displayCandles.map((c, i) => {
                  const n = displayCandles.length;
                  const w = 1000 / n;
                  const cx = i * w + w / 2;
                  const pad = Math.max(1, w * 0.15);
                  const bodyW = Math.max(2, w - pad * 2);
                  const scaleY = (v: number) => {
                    const p = (v - stats.min) / (stats.max - stats.min);
                    return 300 - p * 280;
                  };
                  const yH = scaleY(c.h);
                  const yL = scaleY(c.l);
                  const yO = scaleY(c.o);
                  const yC = scaleY(c.c);
                  const up = c.c >= c.o;
                  const upColor = useRedUp ? '#fb7185' : '#34d399';
                  const downColor = useRedUp ? '#34d399' : '#fb7185';
                  const color = up ? upColor : downColor;
                  const top = Math.min(yO, yC);
                  const height = Math.max(2, Math.abs(yC - yO));
                  return (
                    <g key={c.t}>
                      <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={color} strokeWidth={2} opacity={0.9} />
                      <rect x={cx - bodyW / 2} y={top} width={bodyW} height={height} fill={color} opacity={0.9} />
                      {hoverIndex === i && (
                        <rect x={i * w} y={0} width={w} height={320} fill="#ffffff" opacity={0.03} />
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                暂无数据
              </div>
            )}
          </div>
        </div>

        <div className="p-4 flex justify-center border-t border-slate-800/50 bg-slate-900/50">
          <div className="flex bg-slate-800 p-1 rounded-lg">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  selectedRange === range
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
