import { categoryIcons } from '../data/mockEvents';
import type { GlobeEvent } from '../data/mockEvents';
import { Calendar, TrendingDown, TrendingUp, AlertCircle, Building2, Landmark } from 'lucide-react';
import { cn } from '../lib/utils';

interface HoverInfoCardProps {
  event: GlobeEvent | null;
}

export default function HoverInfoCard({ event }: HoverInfoCardProps) {
  if (!event) return null;

  return (
    <div 
      className={cn(
        "absolute z-50 w-96 p-5 rounded-xl shadow-2xl transition-opacity duration-200 pointer-events-none",
        "bg-slate-900/95 backdrop-blur-md border border-slate-700/50 text-slate-100",
        "bottom-8 left-1/2 -translate-x-1/2"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl mt-0.5 filter drop-shadow-md">
          {categoryIcons[event.category]}
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight tracking-tight text-white mb-1">
            {event.title}
          </h3>
          <div className="flex items-center text-xs text-slate-400 gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{event.date}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        {event.summary}
      </p>

      {/* Latest Updates */}
      <div className="mb-4 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-1.5 uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5" />
          最新动态
        </div>
        <p className="text-xs text-slate-300">
          {event.latestUpdates}
        </p>
      </div>

      {/* Financial Impact */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2.5 uppercase tracking-wider">
          <Landmark className="w-3.5 h-3.5" />
          金融影响评估
        </div>
        
        {/* Sectors */}
        <div className="mb-3">
          <div className="text-xs text-slate-400 mb-1.5">受影响行业：</div>
          <div className="flex flex-wrap gap-1.5">
            {event.impact.sectors.map(sector => (
              <span key={sector} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium">
                {sector}
              </span>
            ))}
          </div>
        </div>

        {/* Companies */}
        <div className="grid grid-cols-2 gap-3">
          {/* Positive Impact */}
          {event.impact.positiveCompanies.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1.5">
                <TrendingUp className="w-3 h-3" />
                <span>利好企业</span>
              </div>
              <ul className="space-y-1">
                {event.impact.positiveCompanies.map(company => (
                  <li key={company} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Building2 className="w-3 h-3 text-emerald-500/70" />
                    <span className="truncate" title={company}>{company}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Negative Impact */}
          {event.impact.negativeCompanies.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs text-rose-400 mb-1.5">
                <TrendingDown className="w-3 h-3" />
                <span>利空企业</span>
              </div>
              <ul className="space-y-1">
                {event.impact.negativeCompanies.map(company => (
                  <li key={company} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Building2 className="w-3 h-3 text-rose-500/70" />
                    <span className="truncate" title={company}>{company}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}