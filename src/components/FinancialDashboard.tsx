import type { GlobeEvent } from '../data/mockEvents';
import { TrendingUp, TrendingDown, Building2, Landmark } from 'lucide-react';

interface FinancialDashboardProps {
  event: GlobeEvent | null;
}

export default function FinancialDashboard({ event }: FinancialDashboardProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">金融数据看板</h2>

      {event ? (
        <div className="space-y-6">
          {/* Event Summary */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
            <p className="text-sm text-slate-300 mb-3">{event.summary}</p>
            <p className="text-xs text-slate-400">最新动态: {event.latestUpdates}</p>
          </div>

          {/* Affected Sectors */}
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-amber-400 mb-3">
              <Landmark className="w-5 h-5" />
              <span>受影响行业</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.impact.sectors.map(sector => (
                <span key={sector} className="px-3 py-1 rounded-full bg-slate-700 border border-slate-600 text-sm text-slate-200 font-medium">
                  {sector}
                </span>
              ))}
            </div>
          </div>

          {/* Affected Companies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.impact.positiveCompanies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-lg text-emerald-400 mb-3">
                  <TrendingUp className="w-5 h-5" />
                  <span>利好企业</span>
                </div>
                <ul className="space-y-2">
                  {event.impact.positiveCompanies.map(company => (
                    <li key={company} className="flex items-center gap-2 text-sm text-slate-300">
                      <Building2 className="w-4 h-4 text-emerald-500/70" />
                      <span className="truncate">{company}</span>
                      {/* Placeholder for real-time stock price */}
                      <span className="text-emerald-500 ml-auto">+1.25% (模拟)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {event.impact.negativeCompanies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-lg text-rose-400 mb-3">
                  <TrendingDown className="w-5 h-5" />
                  <span>利空企业</span>
                </div>
                <ul className="space-y-2">
                  {event.impact.negativeCompanies.map(company => (
                    <li key={company} className="flex items-center gap-2 text-sm text-slate-300">
                      <Building2 className="w-4 h-4 text-rose-500/70" />
                      <span className="truncate">{company}</span>
                      {/* Placeholder for real-time stock price */}
                      <span className="text-rose-500 ml-auto">-0.78% (模拟)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Placeholder for other real-time data */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-3">其他实时数据 (模拟)</h3>
            <div className="space-y-2 text-slate-300">
              <p>原油价格: <span className="text-yellow-400">$78.50/桶 (+0.5%)</span></p>
              <p>美元/人民币汇率: <span className="text-blue-400">7.25 (-0.02%)</span></p>
              <p>黄金价格: <span className="text-yellow-200">$2350/盎司 (+0.1%)</span></p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-slate-400 text-center mt-10">
          请将鼠标悬停在地球上的事件图标上，以查看详细的金融影响数据。
        </p>
      )}
    </div>
  );
}