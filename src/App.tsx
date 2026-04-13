import { useState } from 'react';
import FinGlobe from './components/FinGlobe';
import HoverInfoCard from './components/HoverInfoCard';
import CurrentTimeDisplay from './components/CurrentTimeDisplay';
import GlobalMacroFinancialDashboard from './components/GlobalMacroFinancialDashboard';
import FinancialChartModal from './components/FinancialChartModal';
import type { GlobeEvent } from './data/mockEvents';
import type { FinancialIndicator } from './data/macroFinancialData';

function App() {
  const [hoveredEvent, setHoveredEvent] = useState<GlobeEvent | null>(null);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; altitude?: number } | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<FinancialIndicator | null>(null);

  const handleIndicatorClick = (indicator: FinancialIndicator) => {
    // 1. Focus globe on location if available
    if (indicator.location) {
      setFocusLocation(indicator.location);
    }
    // 2. Open chart modal
    setSelectedIndicator(indicator);
  };

  const closeChartModal = () => {
    setSelectedIndicator(null);
  };

  return (
    <div className="flex w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      {/* Left Pane: FinGlobe */}
      <div className="relative flex-1">
        {/* Header / Brand */}
        <div className="absolute top-6 left-8 z-10 pointer-events-none">
          <h1 className="text-4xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm">
            FinGlobe
          </h1>
        </div>

        {/* Current Time Display */}
        <div className="absolute top-6 right-8 z-10 pointer-events-none">
          <CurrentTimeDisplay />
        </div>

        {/* 3D Globe Component */}
        <FinGlobe onEventHover={setHoveredEvent} focusLocation={focusLocation} />

        {/* Hover Information Card for Globe Events */}
        {hoveredEvent && (
          <HoverInfoCard event={hoveredEvent} />
        )}
      </div>

      {/* Right Pane: Global Macro Financial Dashboard */}
      <div className="w-[320px] bg-slate-900/90 backdrop-blur-md border-l border-slate-800 overflow-y-auto z-20">
        <GlobalMacroFinancialDashboard onIndicatorClick={handleIndicatorClick} />
      </div>

      {/* Financial Chart Modal */}
      {selectedIndicator && (
        <FinancialChartModal indicator={selectedIndicator} onClose={closeChartModal} />
      )}
    </div>
  );
}

export default App;
