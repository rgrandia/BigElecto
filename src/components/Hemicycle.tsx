'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Seat {
  id: string;
  partyId: string;
  partyName: string;
  color: string;
  angle: number;
  radius: number;
  row: number;
  col: number;
}

interface HemicycleProps {
  seats: { partyId: string; partyName: string; color: string; count: number }[];
  totalSeats: number;
  rows?: number;
  innerRadius?: number;
  seatRadius?: number;
  gap?: number;
  onSeatClick?: (seat: Seat) => void;
  className?: string;
}

export default function Hemicycle({
  seats,
  totalSeats,
  rows = 10,
  innerRadius = 80,
  seatRadius = 8,
  gap = 2,
  onSeatClick,
  className = ''
}: HemicycleProps) {
  // Distribuir escons en l'hemicicle
  const seatPositions: Seat[] = useMemo(() => {
    const positions: Seat[] = [];
    let seatIndex = 0;
    
    // Expandir la llista d'escons individuals
    const individualSeats: { partyId: string; partyName: string; color: string }[] = [];
    seats.forEach(party => {
      for (let i = 0; i < party.count; i++) {
        individualSeats.push({
          partyId: party.partyId,
          partyName: party.partyName,
          color: party.color
        });
      }
    });

    // Distribuir en arcs concèntrics
    for (let row = 0; row < rows && seatIndex < totalSeats; row++) {
      const currentRadius = innerRadius + row * (seatRadius * 2 + gap);
      const circumference = Math.PI * currentRadius; // Només hemicicle (180°)
      const seatsInRow = Math.floor(circumference / (seatRadius * 2 + gap));
      const actualSeatsInRow = Math.min(seatsInRow, totalSeats - seatIndex);
      
      for (let i = 0; i < actualSeatsInRow; i++) {
        const angle = (i / (actualSeatsInRow - 1)) * Math.PI; // 0 a π
        const x = currentRadius * Math.cos(angle);
        const y = -currentRadius * Math.sin(angle); // Negatiu perquè 0,0 és baix
        
        if (individualSeats[seatIndex]) {
          positions.push({
            id: `seat-${seatIndex}`,
            ...individualSeats[seatIndex],
            angle,
            radius: currentRadius,
            row,
            col: i,
          });
        }
        seatIndex++;
      }
    }
    
    return positions;
  }, [seats, totalSeats, rows, innerRadius, seatRadius, gap]);

  const maxRadius = innerRadius + rows * (seatRadius * 2 + gap);
  const viewBoxSize = (maxRadius + 50) * 2;

  return (
    <div className={`relative ${className}`}>
      <svg 
        viewBox={`-${maxRadius + 20} -${maxRadius + 20} ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full"
        style={{ maxHeight: '500px' }}
      >
        {/* Fons de l'hemicicle */}
        <defs>
          <radialGradient id="hemicycle-gradient" cx="50%" cy="100%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Arcs de referència */}
        {[...Array(rows)].map((_, i) => {
          const r = innerRadius + i * (seatRadius * 2 + gap);
          return (
            <path
              key={`arc-${i}`}
              d={`M -${r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-300 dark:text-slate-700"
              opacity={0.5}
            />
          );
        })}

        {/* Escons */}
        {seatPositions.map((seat, index) => (
          <motion.circle
            key={seat.id}
            cx={seat.radius * Math.cos(seat.angle)}
            cy={-seat.radius * Math.sin(seat.angle)}
            r={seatRadius}
            fill={seat.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              delay: index * 0.01,
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
            whileHover={{ 
              scale: 1.5, 
              zIndex: 10,
              filter: 'brightness(1.2)'
            }}
            className="cursor-pointer drop-shadow-md"
            onClick={() => onSeatClick?.(seat)}
          >
            <title>{seat.partyName}</title>
          </motion.circle>
        ))}

        {/* Podi central */}
        <rect
          x="-30"
          y="10"
          width="60"
          height="20"
          rx="4"
          className="fill-slate-200 dark:fill-slate-800"
        />
        <text
          x="0"
          y="24"
          textAnchor="middle"
          className="text-xs font-bold fill-slate-600 dark:fill-slate-400"
        >
          {totalSeats} escons
        </text>
      </svg>

      {/* Llegenda */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {seats.filter(s => s.count > 0).map(party => (
          <div key={party.partyId} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: party.color }}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {party.partyName}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-500">
              ({party.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
