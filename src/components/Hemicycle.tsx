'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Handshake, AlertCircle, Calculator } from 'lucide-react';

interface Seat {
  id: string;
  partyId: string;
  partyName: string;
  color: string;
  x: number;
  y: number;
  seatNumber: number;
}

interface Coalition {
  id: string;
  name: string;
  partyIds: string[];
  color: string;
  seats: number;
  isMajority: boolean;
}

interface HemicycleProps {
  seats: { partyId: string; partyName: string; color: string; count: number }[];
  totalSeats: number;
  majorityThreshold?: number;
  onCoalitionChange?: (coalitions: Coalition[]) => void;
  className?: string;
}

export default function Hemicycle({
  seats,
  totalSeats,
  majorityThreshold = Math.floor(totalSeats / 2) + 1,
  onCoalitionChange,
  className = ''
}: HemicycleProps) {
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [coalitions, setCoalitions] = useState<Coalition[]>([]);
  const [isCreatingCoalition, setIsCreatingCoalition] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [newCoalitionName, setNewCoalitionName] = useState('');

  // Expandir escons individuals
  const individualSeats = useMemo(() => {
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

  // Calcular posicions en arc de 180 graus
  const seatPositions: Seat[] = useMemo(() => {
    const positions: Seat[] = [];
    const total = individualSeats.length;
    const innerRadius = 80;
    const maxRadius = 200;
    
    for (let i = 0; i < total; i++) {
      // Distribuir uniformement en arc de 180 graus (π radians)
      const angle = Math.PI - (i / (total - 1 || 1)) * Math.PI;
      // Interpolar radius segons la posició per fer arc
      const radius = innerRadius + (maxRadius - innerRadius) * Math.sin((i / total) * Math.PI);
      
      const x = radius * Math.cos(angle);
      const y = -radius * Math.sin(angle);
      
      if (individualSeats[i]) {
        positions.push({
          id: `seat-${i}`,
          ...individualSeats[i],
          x,
          y,
          seatNumber: i + 1
        });
      }
    }
    return positions;
  }, [individualSeats]);

  // Trobar partit per ID
  const getPartyById = (id: string) => seats.find(s => s.partyId === id);

  // Calcular majories
  const majorityInfo = useMemo(() => {
    const sorted = [...seats].sort((a, b) => b.count - a.count);
    const winner = sorted[0];
    const hasAbsoluteMajority = winner?.count >= majorityThreshold;
    
    // Trobar combinacions possibles per majoria
    const possibleCoalitions: string[][] = [];
    
    // Provar totes les combinacions de 2 partits
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].count + sorted[j].count >= majorityThreshold) {
          possibleCoalitions.push([sorted[i].partyId, sorted[j].partyId]);
        }
      }
    }
    
    return { winner, hasAbsoluteMajority, possibleCoalitions, sorted };
  }, [seats, majorityThreshold]);

  // Crear coalició
  const createCoalition = () => {
    if (selectedParties.length < 2) return;
    
    const coalitionSeats = selectedParties.reduce((sum, id) => {
      const party = getPartyById(id);
      return sum + (party?.count || 0);
    }, 0);
    
    const newCoalition: Coalition = {
      id: Date.now().toString(),
      name: newCoalitionName || `Pacte ${coalitions.length + 1}`,
      partyIds: [...selectedParties],
      color: '#8b5cf6',
      seats: coalitionSeats,
      isMajority: coalitionSeats >= majorityThreshold
    };
    
    const updated = [...coalitions, newCoalition];
    setCoalitions(updated);
    setSelectedParties([]);
    setNewCoalitionName('');
    setIsCreatingCoalition(false);
    onCoalitionChange?.(updated);
  };

  // Eliminar coalició
  const removeCoalition = (id: string) => {
    const updated = coalitions.filter(c => c.id !== id);
    setCoalitions(updated);
    onCoalitionChange?.(updated);
  };

  // Toggle selecció de partit per pacte
  const togglePartySelection = (partyId: string) => {
    setSelectedParties(prev => 
      prev.includes(partyId)
        ? prev.filter(id => id !== partyId)
        : [...prev, partyId]
    );
  };

  // Color d'un escó (coalició o partit individual)
  const getSeatColor = (seat: Seat) => {
    // Si l'escó pertany a una coalició activa
    for (const coalition of coalitions) {
      if (coalition.partyIds.includes(seat.partyId)) {
        return coalition.color;
      }
    }
    return seat.color;
  };

  // Verificar si un escó està en una coalició
  const isInCoalition = (partyId: string) => {
    return coalitions.some(c => c.partyIds.includes(partyId));
  };

  const maxRadius = 250;
  const viewBoxSize = 600;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Barra d'informació de majories */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 border-2 border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                Llindar de majoria: {majorityThreshold} escons
              </h3>
              <p className="text-amber-700 dark:text-amber-300">
                {majorityInfo.hasAbsoluteMajority ? (
                  <span className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-600" />
                    <strong>{majorityInfo.winner?.partyName}</strong> té majoria absoluta ({majorityInfo.winner?.count} escons)
                  </span>
                ) : (
                  <span>Cap partit té majoria absoluta. Es necessiten pactes.</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingCoalition(!isCreatingCoalition)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isCreatingCoalition
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <Handshake className="w-4 h-4" />
              {isCreatingCoalition ? 'Cancel·lar' : 'Crear pacte'}
            </button>
          </div>
        </div>

        {/* Panell de creació de pacte */}
        <AnimatePresence>
          {isCreatingCoalition && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800"
            >
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                Selecciona 2 o més partits per formar un pacte:
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {seats.filter(s => s.count > 0).map(party => {
                  const isSelected = selectedParties.includes(party.partyId);
                  const alreadyInCoalition = isInCoalition(party.partyId);
                  
                  return (
                    <button
                      key={party.partyId}
                      onClick={() => !alreadyInCoalition && togglePartySelection(party.partyId)}
                      disabled={alreadyInCoalition}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        alreadyInCoalition
                          ? 'opacity-50 cursor-not-allowed border-slate-300'
                          : isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-slate-300 hover:border-purple-300'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: party.color }}
                      />
                      <span className="font-medium text-sm">{party.partyName}</span>
                      <span className="text-xs text-slate-500">({party.count})</span>
                      {isSelected && <span className="text-purple-600">✓</span>}
                    </button>
                  );
                })}
              </div>

              {selectedParties.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={newCoalitionName}
                    onChange={(e) => setNewCoalitionName(e.target.value)}
                    placeholder="Nom del pacte (opcional)"
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                  />
                  <button
                    onClick={createCoalition}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    Crear pacte ({selectedParties.reduce((sum, id) => sum + (getPartyById(id)?.count || 0), 0)} escons)
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Llista de pactes creats */}
      {coalitions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coalitions.map(coalition => (
            <motion.div
              key={coalition.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-4 rounded-xl border-2 ${
                coalition.isMajority
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 dark:text-white">{coalition.name}</h4>
                <button
                  onClick={() => removeCoalition(coalition.id)}
                  className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{coalition.seats}</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">escons</span>
                {coalition.isMajority && (
                  <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-bold">
                    MAJORIA
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {coalition.partyIds.map(id => {
                  const party = getPartyById(id);
                  return party ? (
                    <span
                      key={id}
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: party.color }}
                    >
                      {party?.partyName}
                    </span>
                  ) : null;
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Visualització de l'hemicicle */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <svg
          viewBox={`-${viewBoxSize/2} -${viewBoxSize * 0.6} ${viewBoxSize} ${viewBoxSize * 0.8}`}
          className="w-full"
          style={{ minHeight: '350px', maxHeight: '500px' }}
        >
          <defs>
            {seats.map(party => (
              <radialGradient key={party.partyId} id={`grad-${party.partyId}`}>
                <stop offset="0%" stopColor={party.color} />
                <stop offset="100%" stopColor={party.color} stopOpacity={0.7} />
              </radialGradient>
            ))}
            {coalitions.map(c => (
              <radialGradient key={c.id} id={`grad-coalition-${c.id}`}>
                <stop offset="0%" stopColor={c.color} />
                <stop offset="100%" stopColor={c.color} stopOpacity={0.7} />
              </radialGradient>
            ))}
          </defs>

          {/* Línia de majoria */}
          <line
            x1={-maxRadius * 0.9}
            y1={0}
            x2={maxRadius * 0.9}
            y2={0}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="8 4"
            className="text-amber-400"
            opacity={0.5}
          />
          <text
            x={0}
            y={-10}
            textAnchor="middle"
            className="text-xs font-bold fill-amber-500"
          >
            LLINDAR MAJORIA ({majorityThreshold})
          </text>

          {/* Escons */}
          <g>
            {seatPositions.map((seat, index) => {
              const isHovered = hoveredSeat === seat.id;
              const isSelected = selectedParties.includes(seat.partyId);
              const inCoalition = isInCoalition(seat.partyId);
              const seatColor = getSeatColor(seat);
              
              const baseRadius = Math.max(5, Math.min(10, 150 / Math.sqrt(totalSeats)));

              return (
                <motion.circle
                  key={seat.id}
                  cx={seat.x}
                  cy={seat.y}
                  r={baseRadius}
                  fill={inCoalition ? `url(#grad-coalition-${coalitions.find(c => c.partyIds.includes(seat.partyId))?.id})` : `url(#grad-${seat.partyId})`}
                  stroke={isSelected ? '#8b5cf6' : isHovered ? '#fff' : 'none'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
                  initial={{ scale: 0 }}
                  animate={{ scale: isHovered ? 1.3 : 1 }}
                  transition={{ delay: index * 0.005, type: 'spring' }}
                  onMouseEnter={() => setHoveredSeat(seat.id)}
                  onMouseLeave={() => setHoveredSeat(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </g>

          {/* Tooltip hover */}
          {hoveredSeat && (
            <g transform={`translate(${seatPositions.find(s => s.id === hoveredSeat)?.x}, ${(seatPositions.find(s => s.id === hoveredSeat)?.y || 0) - 20})`}>
              <rect x="-50" y="-20" width="100" height="20" rx="4" className="fill-slate-900 dark:fill-white" opacity="0.9" />
              <text x="0" y="-8" textAnchor="middle" className="text-xs fill-white dark:fill-slate-900 font-medium">
                {seatPositions.find(s => s.id === hoveredSeat)?.partyName}
              </text>
            </g>
          )}
        </svg>

        {/* Llegenda amb selecció */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {seats.filter(s => s.count > 0).sort((a, b) => b.count - a.count).map(party => {
            const isSelected = selectedParties.includes(party.partyId);
            const inCoalition = isInCoalition(party.partyId);
            
            return (
              <button
                key={party.partyId}
                onClick={() => isCreatingCoalition && !inCoalition && togglePartySelection(party.partyId)}
                disabled={!isCreatingCoalition || inCoalition}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  inCoalition
                    ? 'opacity-60 bg-slate-100 dark:bg-slate-800'
                    : isSelected
                      ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500'
                      : isCreatingCoalition
                        ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-800'
                }`}
              >
                <div 
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: party.color }}
                />
                <div className="text-left">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {party.partyName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {party.count} escons {inCoalition && '(en pacte)'}
                  </div>
                </div>
                {isSelected && <span className="text-purple-600 ml-1">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggeriments de pactes */}
      {!majorityInfo.hasAbsoluteMajority && majorityInfo.possibleCoalitions.length > 0 && coalitions.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Possibles majories amb pacte
          </h4>
          <div className="space-y-2">
            {majorityInfo.possibleCoalitions.slice(0, 3).map((combo, idx) => {
              const parties = combo.map(id => getPartyById(id)).filter(Boolean);
              const totalCombo = parties.reduce((sum, p) => sum + (p?.count || 0), 0);
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedParties(combo);
                    setIsCreatingCoalition(true);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    {parties.map((p, i) => (
  <span key={p?.partyId} className="flex items-center gap-1">
    <span 
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: p?.color }}
    />
    <span className="font-medium text-sm">{p?.partyName}</span>
    {i < parties.length - 1 && <span className="text-slate-400">+</span>}
  </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{totalCombo} escons</span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-bold">
                      MAJORIA
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
