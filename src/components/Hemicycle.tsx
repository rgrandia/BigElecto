'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Seat {
  id: string;
  partyId: string;
  partyName: string;
  color: string;
  angle: number;
  radius: number;
  x: number;
  y: number;
  row: number;
  seatNumber: number;
}

interface HemicycleProps {
  seats: { partyId: string; partyName: string; color: string; count: number }[];
  totalSeats: number;
  rows?: number;
  onSeatClick?: (seat: Seat) => void;
  className?: string;
  showNumbers?: boolean;
  animated?: boolean;
}

export default function Hemicycle({
  seats,
  totalSeats,
  rows = 12,
  onSeatClick,
  className = '',
  showNumbers = false,
  animated = true
}: HemicyycleProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  // Expandir escons individuals
  const individualSeats: { partyId: string; partyName: string; color: string }[] = useMemo(() => {
    const list: { partyId: string; partyName: string; color: string }[] = [];
    seats.forEach(party => {
      for (let i = 0; i < party.count; i++) {
        list.push({
          partyId: party.partyId,
          partyName: party.partyName,
          color: party.color
        });
      }
    });
    return list;
  }, [seats]);

  // Calcular posicions amb distribució òptima
  const seatPositions: Seat[] = useMemo(() => {
    const positions: Seat[] = [];
    let seatIndex = 0;
    
    // Configuració adaptable segons el nombre d'escons
    const baseRadius = Math.max(60, Math.min(120, totalSeats * 2));
    const seatRadius = Math.max(4, Math.min(12, 200 / Math.sqrt(totalSeats)));
    const gap = seatRadius * 0.3;
    
    // Distribuir en arcs concèntrics des de dalt (180°) fins als costats (0° i 360°)
    for (let row = 0; row < rows && seatIndex < totalSeats; row++) {
      const currentRadius = baseRadius + row * (seatRadius * 2 + gap);
      
      // Arc disponible: 180 graus (π radians) - de 0 a π
      const arcLength = Math.PI * currentRadius;
      const maxSeatsInArc = Math.floor(arcLength / (seatRadius * 2 + gap));
      const remainingSeats = totalSeats - seatIndex;
      const seatsInRow = Math.min(maxSeatsInArc, remainingSeats);
      
      // Angle de cada escó
      const angleStep = Math.PI / (seatsInRow - 1 || 1);
      
      for (let i = 0; i < seatsInRow && seatIndex < totalSeats; i++) {
        // Angle de π a 0 (d'esquerra a dreta, de dalt cap avall)
        const angle = Math.PI - (i * angleStep);
        const x = currentRadius * Math.cos(angle);
        const y = -currentRadius * Math.sin(angle); // Negatiu perquè 0,0 és a dalt
        
        if (individualSeats[seatIndex]) {
          positions.push({
            id: `seat-${seatIndex}`,
            ...individualSeats[seatIndex],
            angle,
            radius: currentRadius,
            x,
            y,
            row,
            seatNumber: seatIndex + 1
          });
        }
        seatIndex++;
      }
    }
    
    return positions;
  }, [individualSeats, totalSeats, rows]);

  // Dimensions del SVG
  const maxRadius = Math.max(...seatPositions.map(s => s.radius), 100) + 30;
  const viewBoxWidth = maxRadius * 2.5;
  const viewBoxHeight = maxRadius * 1.5;
  
  // Calcular estadístiques per partit
  const partyStats = useMemo(() => {
    const stats: Record<string, { count: number; percentage: number }> = {};
    seats.forEach(s => {
      stats[s.partyId] = {
        count: s.count,
        percentage: totalSeats > 0 ? (s.count / totalSeats) * 100 : 0
      };
    });
    return stats;
  }, [seats, totalSeats]);

  return (
    <div className={`relative ${className}`}>
      {/* SVG Principal */}
      <svg 
        viewBox={`-${viewBoxWidth/2} -${viewBoxHeight * 0.8} ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-auto"
        style={{ minHeight: '400px', maxHeight: '600px' }}
      >
        <defs>
          {/* Gradients per als escons */}
          {seats.map(party => (
            <radialGradient key={party.partyId} id={`gradient-${party.partyId}`}>
              <stop offset="0%" stopColor={party.color} stopOpacity={1} />
              <stop offset="70%" stopColor={party.color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={party.color} stopOpacity={0.6} />
            </radialGradient>
            
            <filter key={`shadow-${party.partyId}`} id={`shadow-${party.partyId}`}>
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
            </filter>
          ))}
          
          {/* Gradient de fons */}
          <radialGradient id="bg-gradient" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Fons de l'hemicicle */}
        <path
          d={`M -${maxRadius * 0.8} 0 A ${maxRadius * 0.8} ${maxRadius * 0.8} 0 0 1 ${maxRadius * 0.8} 0`}
          fill="url(#bg-gradient)"
          className="text-slate-400"
        />
        
        {/* Línies de referència concèntriques */}
        {[...Array(Math.min(rows, 8))].map((_, i) => {
          const r = 60 + i * 25;
          return (
            <path
              key={`arc-${i}`}
              d={`M -${r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-300 dark:text-slate-700"
              opacity={0.3}
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Escons */}
        <g>
          {seatPositions.map((seat, index) => {
            const isHovered = hoveredSeat === seat.id;
            const isSelected = selectedParty === seat.partyId;
            const isDimmed = selectedParty && selectedParty !== seat.partyId;
            
            const baseRadius = Math.max(6, Math.min(14, 180 / Math.sqrt(totalSeats)));
            
            return (
              <motion.g
                key={seat.id}
                initial={animated ? { scale: 0, opacity: 0 } : false}
                animate={{ 
                  scale: isHovered ? 1.4 : 1,
                  opacity: isDimmed ? 0.3 : 1,
                  filter: isHovered ? 'brightness(1.2)' : 'brightness(1)'
                }}
                transition={{ 
                  delay: animated ? index * 0.01 : 0,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }}
                onMouseEnter={() => setHoveredSeat(seat.id)}
                onMouseLeave={() => setHoveredSeat(null)}
                onClick={() => {
                  setSelectedParty(selectedParty === seat.partyId ? null : seat.partyId);
                  onSeatClick?.(seat);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Cercle exterior (resplendor quan hover) */}
                {isHovered && (
                  <circle
                    cx={seat.x}
                    cy={seat.y}
                    r={baseRadius * 1.8}
                    fill={seat.color}
                    opacity={0.2}
                  />
                )}
                
                {/* Escó principal */}
                <circle
                  cx={seat.x}
                  cy={seat.y}
                  r={baseRadius}
                  fill={`url(#gradient-${seat.partyId})`}
                  stroke={isSelected ? '#fff' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                  filter={`url(#shadow-${seat.partyId})`}
                />
                
                {/* Número interior (opcional) */}
                {showNumbers && baseRadius > 8 && (
                  <text
                    x={seat.x}
                    y={seat.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[8px] font-bold fill-white pointer-events-none"
                    style={{ fontSize: Math.max(6, baseRadius * 0.6) }}
                  >
                    {seat.seatNumber}
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>

        {/* Podi central */}
        <g transform={`translate(0, ${maxRadius * 0.1})`}>
          <rect
            x="-50"
            y="0"
            width="100"
            height="30"
            rx="8"
            className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
          />
          <text
            x="0"
            y="20"
            textAnchor="middle"
            className="text-sm font-bold fill-slate-700 dark:fill-slate-300"
          >
            {totalSeats} escons
          </text>
        </g>

        {/* Informació hover */}
        {hoveredSeat && (
          <g transform={`translate(${seatPositions.find(s => s.id === hoveredSeat)?.x}, ${(seatPositions.find(s => s.id === hoveredSeat)?.y || 0) - 30})`}>
            <rect
              x="-60"
              y="-25"
              width="120"
              height="20"
              rx="4"
              className="fill-slate-900 dark:fill-white"
              opacity="0.9"
            />
            <text
              x="0"
              y="-12"
              textAnchor="middle"
              className="text-xs font-medium fill-white dark:fill-slate-900"
            >
              {seatPositions.find(s => s.id === hoveredSeat)?.partyName}
            </text>
          </g>
        )}
      </svg>

      {/* Llegenda interactiva */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {seats
          .filter(s => s.count > 0)
          .sort((a, b) => b.count - a.count)
          .map(party => {
            const isSelected = selectedParty === party.partyId;
            const stats = partyStats[party.partyId];
            
            return (
              <motion.button
                key={party.partyId}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedParty(isSelected ? null : party.partyId)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg' 
                    : 'border-transparent bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-md'
                }`}
              >
                <div 
                  className="w-8 h-8 rounded-full shadow-inner flex-shrink-0"
                  style={{ 
                    backgroundColor: party.color,
                    boxShadow: `0 0 10px ${party.color}40`
                  }}
                />
                <div className="text-left min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {party.partyName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {party.count} escons ({stats?.percentage.toFixed(1)}%)
                  </div>
                </div>
              </motion.button>
            );
          })}
      </div>

      {/* Controls */}
      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={() => setSelectedParty(null)}
          className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Mostrar tots
        </button>
        <button
          onClick={() => setSelectedParty(seats[0]?.partyId)}
          className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Seleccionar guanyador
        </button>
      </div>
    </div>
  );
}
