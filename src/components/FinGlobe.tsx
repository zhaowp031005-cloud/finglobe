import { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { categoryIcons } from '../data/mockEvents';
import type { GlobeEvent } from '../data/mockEvents';

interface FinGlobeProps {
  onEventHover: (event: GlobeEvent | null) => void;
  focusLocation?: { lat: number; lng: number; altitude?: number } | null;
  events?: GlobeEvent[];
}

export default function FinGlobe({ onEventHover, focusLocation, events }: FinGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth - 320, // Adjust for the sidebar width
    height: window.innerHeight,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth - 320, // Adjust for the sidebar width
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configure Globe on mount
  useEffect(() => {
    if (globeRef.current) {
      // Auto-rotate the globe slightly
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      
      // Initial point of view
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2 });
    }
  }, []);

  // Handle focusing on a specific location
  useEffect(() => {
    if (focusLocation && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: focusLocation.lat, lng: focusLocation.lng, altitude: focusLocation.altitude || 2 },
        1000 // 1000ms transition duration
      );
    }
  }, [focusLocation]);

  const htmlElementData = useMemo(() => {
    return events ?? [];
  }, [events]);

  return (
    <div className="absolute inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // HTML Elements for Markers
        htmlElementsData={htmlElementData}
        htmlElement={(d: object) => {
          const event = d as GlobeEvent;
          const el = document.createElement('div');
          // Important: enable pointer events on the marker so hover works
          el.style.pointerEvents = 'auto';
          el.innerHTML = `
            <div class="relative group cursor-pointer animate-bounce-slow">
              <div class="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] hover:scale-125 transition-transform duration-200">
                ${categoryIcons[event.category]}
              </div>
              <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full blur-[2px]"></div>
            </div>
          `;
          el.onmouseenter = () => {
            onEventHover(event);
            if (globeRef.current) {
              globeRef.current.controls().autoRotate = false;
            }
          };
          el.onmouseleave = () => {
            onEventHover(null);
            if (globeRef.current) {
              globeRef.current.controls().autoRotate = true;
            }
          };
          return el;
        }}
        htmlAltitude={0.05}
        
        // Rings effect for markers to make them stand out
        ringsData={htmlElementData}
        ringColor={() => '#ffffff'}
        ringMaxRadius={2.5}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1500}
      />
    </div>
  );
}
