'use client';

import { useMemo, useState } from 'react';
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

interface Slot {
  x: number;
  y: number;
  angle: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

  const partiesWithSeats = useMemo(() => seats.filter((party) => party.count > 0), [seats]);

  const seatLayout = useMemo(() => {
    const total = partiesWithSeats.reduce((sum, p) => sum + p.count, 0);
    if (total === 0) {
      return {
        positionedSeats: [] as Seat[],
        seatRadius: 6,
        outerRadius: 180,
        topY: -180,
        bottomY: 14,
        majorityX: 0
      };
    }

    const rows = clamp(Math.ceil(Math.sqrt(total) * 0.72), 3, 12);
    const innerRadius = 90;
    const rowGap = clamp(220 / rows, 16, 28);
    const outerRadius = innerRadius + (rows - 1) * rowGap;
    const anglePadding = clamp(0.08 + total / 4000, 0.08, 0.2);

    const rowRadii = Array.from({ length: rows }, (_, row) => innerRadius + row * rowGap);
    const rowWeights = rowRadii.map((r) => Math.PI * r);
    const weightTotal = rowWeights.reduce((a, b) => a + b, 0);

    const rawCounts = rowWeights.map((w) => (w / weightTotal) * total);
    const rowCounts = rawCounts.map((c) => Math.floor(c));
    let assigned = rowCounts.reduce((a, b) => a + b, 0);

    const remainders = rawCounts
      .map((v, i) => ({ i, remainder: v - Math.floor(v) }))
      .sort((a, b) => b.remainder - a.remainder);

    let rIndex = 0;
    while (assigned < total && remainders.length > 0) {
      rowCounts[remainders[rIndex % remainders.length].i] += 1;
      assigned += 1;
      rIndex += 1;
    }

    const slots: Slot[] = [];
    rowCounts.forEach((count, row) => {
      if (count <= 0) return;
      const radius = rowRadii[row];
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = Math.PI - anglePadding - t * (Math.PI - anglePadding * 2);
        slots.push({
          angle,
          x: radius * Math.cos(angle),
          y: -radius * Math.sin(angle)
        });
      }
    });

    slots.sort((a, b) => b.angle - a.angle);

    const sequence = partiesWithSeats.flatMap((party) =>
      Array.from({ length: party.count }, () => ({
        partyId: party.partyId,
        partyName: party.partyName,
        color: party.color
      }))
    );

    const positionedSeats: Seat[] = slots.slice(0, sequence.length).map((slot, index) => ({
      id: `seat-${index}`,
      ...sequence[index],
      x: slot.x,
      y: slot.y,
      seatNumber: index + 1
    }));

    const seatsByOrder = [...positionedSeats].sort((a, b) => b.x - a.x);
    const leftMajoritySeat = seatsByOrder[majorityThreshold - 1];
    const rightMajoritySeat = seatsByOrder[majorityThreshold];
    const majorityX = leftMajoritySeat && rightMajoritySeat
      ? (leftMajoritySeat.x + rightMajoritySeat.x) / 2
      : 0;

    const seatRadius = clamp(11 - rows * 0.6, 3.4, 9.5);

    return {
      positionedSeats,
      seatRadius,
      outerRadius,
      topY: -outerRadius - 24,
      bottomY: 16,
      majorityX
    };
  }, [partiesWithSeats, majorityThreshold]);

  const getPartyById = (id: string) => seats.find((s) => s.partyId === id);

  const majorityInfo = useMemo(() => {
    const sorted = [...seats].sort((a, b) => b.count - a.count);
    const winner = sorted[0];
    const hasAbsoluteMajority = winner?.count >= majorityThreshold;
    const possibleCoalitions: string[][] = [];

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].count + sorted[j].count >= majorityThreshold) {
          possibleCoalitions.push([sorted[i].partyId, sorted[j].partyId]);
        }
      }
    }

    return { winner, hasAbsoluteMajority, possibleCoalitions };
  }, [seats, majorityThreshold]);

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

  const removeCoalition = (id: string) => {
    const updated = coalitions.filter((c) => c.id !== id);
    setCoalitions(updated);
    onCoalitionChange?.(updated);
  };

  const togglePartySelection = (partyId: string) => {
    setSelectedParties((prev) =>
      prev.includes(partyId) ? prev.filter((id) => id !== partyId) : [...prev, partyId]
    );
  };

  const isInCoalition = (partyId: string) => coalitions.some((c) => c.partyIds.includes(partyId));

  const hoveredSeatData = hoveredSeat ? seatLayout.positionedSeats.find((s) => s.id === hoveredSeat) : null;
  const viewHalf = seatLayout.outerRadius + 52;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 border-2 border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">Llindar de majoria: {majorityThreshold} escons</h3>
              <p className="text-amber-700 dark:text-amber-300">
                {majorityInfo.hasAbsoluteMajority ? (
                  <span className="flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-600" /><strong>{majorityInfo.winner?.partyName}</strong> té majoria absoluta ({majorityInfo.winner?.count} escons)</span>
                ) : (
                  <span>Cap partit té majoria absoluta. Es necessiten pactes.</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => setIsCreatingCoalition(!isCreatingCoalition)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isCreatingCoalition ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
            <Handshake className="w-4 h-4" />{isCreatingCoalition ? 'Cancel·lar' : 'Crear pacte'}
          </button>
        </div>

        <AnimatePresence>
          {isCreatingCoalition && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">Selecciona 2 o més partits per formar un pacte:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {seats.filter((s) => s.count > 0).map((party) => {
                  const isSelected = selectedParties.includes(party.partyId);
                  const alreadyInCoalition = isInCoalition(party.partyId);
                  return (
                    <button key={party.partyId} onClick={() => !alreadyInCoalition && togglePartySelection(party.partyId)} disabled={alreadyInCoalition} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${alreadyInCoalition ? 'opacity-50 cursor-not-allowed border-slate-300' : isSelected ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-300 hover:border-purple-300'}`}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: party.color }} />
                      <span className="font-medium text-sm">{party.partyName}</span>
                      <span className="text-xs text-slate-500">({party.count})</span>
                      {isSelected && <span className="text-purple-600">✓</span>}
                    </button>
                  );
                })}
              </div>
              {selectedParties.length >= 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                  <input type="text" value={newCoalitionName} onChange={(e) => setNewCoalitionName(e.target.value)} placeholder="Nom del pacte (opcional)" className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800" />
                  <button onClick={createCoalition} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Crear pacte ({selectedParties.reduce((sum, id) => sum + (getPartyById(id)?.count || 0), 0)} escons)</button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <svg viewBox={`${-viewHalf} ${seatLayout.topY - 8} ${viewHalf * 2} ${Math.abs(seatLayout.topY) + seatLayout.bottomY + 16}`} className="w-full" style={{ minHeight: '360px', maxHeight: '560px' }}>
          <defs>
            {seats.map((party) => (
              <radialGradient key={party.partyId} id={`grad-${party.partyId}`}>
                <stop offset="0%" stopColor={party.color} />
                <stop offset="100%" stopColor={party.color} stopOpacity={0.72} />
              </radialGradient>
            ))}
            {coalitions.map((c) => (
              <radialGradient key={c.id} id={`grad-coalition-${c.id}`}>
                <stop offset="0%" stopColor={c.color} />
                <stop offset="100%" stopColor={c.color} stopOpacity={0.72} />
              </radialGradient>
            ))}
          </defs>

          <path d={`M ${-seatLayout.outerRadius} 0 Q 0 ${seatLayout.outerRadius * 0.24} ${seatLayout.outerRadius} 0`} stroke="currentColor" strokeWidth="1.5" fill="none" className="text-slate-300 dark:text-slate-700" opacity={0.6} />

          <line x1={seatLayout.majorityX} y1={seatLayout.topY + 6} x2={seatLayout.majorityX} y2={seatLayout.bottomY} stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" className="text-amber-500" opacity={0.8} />
          <text x={seatLayout.majorityX + 8} y={seatLayout.topY + 18} textAnchor="start" className="text-[10px] font-bold fill-amber-600">MAJORIA {majorityThreshold}</text>

          <g>
            {seatLayout.positionedSeats.map((seat, index) => {
              const isHovered = hoveredSeat === seat.id;
              const isSelected = selectedParties.includes(seat.partyId);
              const coalition = coalitions.find((c) => c.partyIds.includes(seat.partyId));

              return (
                <motion.circle
                  key={seat.id}
                  cx={seat.x}
                  cy={seat.y}
                  r={seatLayout.seatRadius}
                  fill={coalition ? `url(#grad-coalition-${coalition.id})` : `url(#grad-${seat.partyId})`}
                  stroke={isSelected ? '#8b5cf6' : isHovered ? '#fff' : 'none'}
                  strokeWidth={isSelected ? 2.6 : isHovered ? 1.8 : 0}
                  initial={{ scale: 0 }}
                  animate={{ scale: isHovered ? 1.18 : 1 }}
                  transition={{ delay: index * 0.0015, type: 'spring', stiffness: 160, damping: 14 }}
                  onMouseEnter={() => setHoveredSeat(seat.id)}
                  onMouseLeave={() => setHoveredSeat(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </g>

          {hoveredSeatData && (
            <g transform={`translate(${hoveredSeatData.x}, ${hoveredSeatData.y - 22})`}>
              <rect x="-70" y="-24" width="140" height="24" rx="6" className="fill-slate-900 dark:fill-white" opacity="0.92" />
              <text x="0" y="-9" textAnchor="middle" className="text-xs fill-white dark:fill-slate-900 font-semibold">{hoveredSeatData.partyName}</text>
            </g>
          )}
        </svg>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {seats.filter((s) => s.count > 0).sort((a, b) => b.count - a.count).map((party) => {
            const isSelected = selectedParties.includes(party.partyId);
            const inCoalition = isInCoalition(party.partyId);
            return (
              <button key={party.partyId} onClick={() => isCreatingCoalition && !inCoalition && togglePartySelection(party.partyId)} disabled={!isCreatingCoalition || inCoalition} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${inCoalition ? 'opacity-60 bg-slate-100 dark:bg-slate-800' : isSelected ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500' : isCreatingCoalition ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer' : 'bg-slate-50 dark:bg-slate-800'}`}>
                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: party.color }} />
                <div className="text-left">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{party.partyName}</div>
                  <div className="text-xs text-slate-500">{party.count} escons {inCoalition && '(en pacte)'}</div>
                </div>
                {isSelected && <span className="text-purple-600 ml-1">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {coalitions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coalitions.map((coalition) => (
            <motion.div key={coalition.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-4 rounded-xl border-2 ${coalition.isMajority ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 dark:text-white">{coalition.name}</h4>
                <button onClick={() => removeCoalition(coalition.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded">✕</button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{coalition.seats}</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">escons</span>
                {coalition.isMajority && <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-bold">MAJORIA</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!majorityInfo.hasAbsoluteMajority && majorityInfo.possibleCoalitions.length > 0 && coalitions.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Possibles majories amb pacte</h4>
          <div className="space-y-2">
            {majorityInfo.possibleCoalitions.slice(0, 3).map((combo, idx) => {
              const comboParties = combo.map((id) => getPartyById(id)).filter(Boolean);
              const totalCombo = comboParties.reduce((sum, p) => sum + (p?.count || 0), 0);
              return (
                <button key={idx} onClick={() => { setSelectedParties(combo); setIsCreatingCoalition(true); }} className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl hover:shadow-md transition-all text-left">
                  <div className="flex items-center gap-2">
                    {comboParties.map((p, i) => (
                      <span key={p?.partyId} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p?.color }} />
                        <span className="font-medium text-sm">{p?.partyName}</span>
                        {i < comboParties.length - 1 && <span className="text-slate-400">+</span>}
                      </span>
                    ))}
                  </div>
                  <span className="font-bold text-green-600">{totalCombo} escons ✓</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
