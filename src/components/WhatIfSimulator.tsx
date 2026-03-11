'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Plus, 
  Minus, 
  Save, 
  Trash2, 
  GitCompare,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { calculateElection, ElectoralMethod, ConstituencyResult } from '@/lib/calculations/electoralMethods';
import Hemicycle from './Hemicycle';

interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  votes: number;
}

interface Constituency {
  id: string;
  name: string;
  seats: number;
  votes: Record<string, number>;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  parties: Party[];
  constituencies: Constituency[];
  results: ConstituencyResult[];
  color: string;
}

interface WhatIfSimulatorProps {
  baseParties: Party[];
  baseConstituencies: Constituency[];
  method: ElectoralMethod;
  threshold: number;
  onApplyChanges?: (parties: Party[], constituencies: Constituency[]) => void;
  onSaveScenario?: (scenario: { name: string; results: ConstituencyResult[] }) => void;
}

export default function WhatIfSimulator({
  baseParties,
  baseConstituencies,
  method,
  threshold,
  onApplyChanges,
  onSaveScenario
}: WhatIfSimulatorProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<string>('current');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentVariation, setCurrentVariation] = useState(0);

  // Clonar dades base per no modificar originals
  const [workingParties, setWorkingParties] = useState<Party[]>(
    JSON.parse(JSON.stringify(baseParties))
  );
  const [workingConstituencies, setWorkingConstituencies] = useState<Constituency[]>(
    JSON.parse(JSON.stringify(baseConstituencies))
  );

  // Recalcular quan canvia
  const currentResults = useCallback(() => {
    return workingConstituencies.map(constituency => {
      const votes = workingParties.map(p => ({
        partyId: p.id,
        partyName: p.name,
        color: p.color,
        votes: constituency.votes[p.id] || 0
      })).filter(v => v.votes > 0);
      
      return calculateElection(votes, constituency.seats, method, threshold);
    });
  }, [workingParties, workingConstituencies, method, threshold]);

  // Mode reproducció automàtica
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentVariation(prev => {
        const next = prev + (playbackSpeed * 0.5);
        if (next >= 20) {
          setIsPlaying(false);
          return 20;
        }
        return next;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Aplicar variació als vots
  useEffect(() => {
    const variationFactor = 1 + (currentVariation / 100);
    
    const newParties = baseParties.map(party => ({
      ...party,
      votes: Math.round(party.votes * variationFactor)
    }));
    
    const newConstituencies = baseConstituencies.map(cons => ({
      ...cons,
      votes: Object.fromEntries(
        Object.entries(cons.votes).map(([partyId, votes]) => [
          partyId,
          Math.round(votes * variationFactor)
        ])
      )
    }));
    
    setWorkingParties(newParties);
    setWorkingConstituencies(newConstituencies);
  }, [currentVariation, baseParties, baseConstituencies]);

  // Ajustar vots d'un partit específic
  const adjustPartyVotes = (partyId: string, percentChange: number) => {
    setWorkingParties(prev => prev.map(p => {
      if (p.id !== partyId) return p;
      return {
        ...p,
        votes: Math.round(p.votes * (1 + percentChange / 100))
      };
    }));
    
    setWorkingConstituencies(prev => prev.map(cons => ({
      ...cons,
      votes: {
        ...cons.votes,
        [partyId]: Math.round((cons.votes[partyId] || 0) * (1 + percentChange / 100))
      }
    })));
  };

  // Ajustar tots els vots
  const adjustAllVotes = (percentChange: number) => {
    setCurrentVariation(prev => Math.max(-50, Math.min(50, prev + percentChange)));
  };

  // Guardar escenari
  const saveScenario = () => {
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: `Escenari ${scenarios.length + 1}`,
      description: currentVariation > 0 ? `+${currentVariation}%` : `${currentVariation}%`,
      parties: JSON.parse(JSON.stringify(workingParties)),
      constituencies: JSON.parse(JSON.stringify(workingConstituencies)),
      results: currentResults(),
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][scenarios.length % 5]
    };
    
    setScenarios([...scenarios, newScenario]);
    onSaveScenario?.({ name: newScenario.name, results: newScenario.results });
  };

  // Carregar escenari
  const loadScenario = (scenario: Scenario) => {
    setWorkingParties(JSON.parse(JSON.stringify(scenario.parties)));
    setWorkingConstituencies(JSON.parse(JSON.stringify(scenario.constituencies)));
    setActiveScenario(scenario.id);
    setCurrentVariation(parseFloat(scenario.description) || 0);
  };

  // Eliminar escenari
  const deleteScenario = (id: string) => {
    setScenarios(scenarios.filter(s => s.id !== id));
    if (activeScenario === id) setActiveScenario('current');
  };

  // Aplicar canvis al simulador principal
  const applyToMain = () => {
    onApplyChanges?.(workingParties, workingConstituencies);
  };

  const results = currentResults();
  const totalSeats = results.reduce((sum, r) => sum + r.totalSeats, 0);
  const aggregated = results.reduce((acc, cons) => {
    cons.parties.forEach(p => {
      if (!acc[p.partyId]) acc[p.partyId] = { ...p, seats: 0 };
      acc[p.partyId].seats += p.seats;
    });
    return acc;
  }, {} as Record<string, any>);
  const sortedResults = Object.values(aggregated).sort((a: any, b: any) => b.seats - a.seats);

  return (
    <div className="space-y-6">
      {/* Controls principals */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Mode "Què passaria si"
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Aturar' : 'Simular onada'}
            </button>
            
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
            >
              <option value={0.5}>Lent</option>
              <option value={1}>Normal</option>
              <option value={2}>Ràpid</option>
            </select>
          </div>
        </div>

        {/* Slider global */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Variació global de vots
            </span>
            <span className={`text-lg font-bold ${currentVariation > 0 ? 'text-green-600' : currentVariation < 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {currentVariation > 0 ? '+' : ''}{currentVariation.toFixed(1)}%
            </span>
          </div>
          
          <input
            type="range"
            min="-50"
            max="50"
            step="0.5"
            value={currentVariation}
            onChange={(e) => setCurrentVariation(Number(e.target.value))}
            className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">-50%</span>
            <span className="text-xs text-slate-500">Base</span>
            <span className="text-xs text-slate-500">+50%</span>
          </div>
        </div>

        {/* Botons ràpids per partit */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workingParties.map(party => {
            const baseParty = baseParties.find(p => p.id === party.id);
            const change = baseParty ? ((party.votes - baseParty.votes) / baseParty.votes * 100) : 0;
            
            return (
              <div key={party.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div 
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: party.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white text-sm truncate">
                    {party.name}
                  </div>
                  <div className={`text-xs font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => adjustPartyVotes(party.id, -10)}
                    className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="-10%"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => adjustPartyVotes(party.id, 10)}
                    className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    title="+10%"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botons d'onada electoral */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => adjustAllVotes(-10)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
          >
            <TrendingDown className="w-4 h-4" />
            Onada negativa (-10%)
          </button>
          <button
            onClick={() => setCurrentVariation(0)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium"
          >
            Reset
          </button>
          <button
            onClick={() => adjustAllVotes(10)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
          >
            <TrendingUp className="w-4 h-4" />
            Onada positiva (+10%)
          </button>
        </div>
      </div>

      {/* Visualització en temps real */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
        <h4 className="font-bold text-slate-900 dark:text-white mb-4">Resultat en temps real</h4>
        <Hemicycle
          seats={sortedResults.map((r: any) => ({
            partyId: r.partyId,
            partyName: r.partyName,
            color: r.color,
            count: r.seats
          }))}
          totalSeats={totalSeats}
        />
      </div>

      {/* Gestió d'escenaris */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-500" />
            Escenaris guardats
          </h4>
          <div className="flex gap-2">
            <button
              onClick={saveScenario}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              Guardar actual
            </button>
            <button
              onClick={() => {
                setCurrentVariation(0);
                setTimeout(saveScenario, 0);
              }}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium"
            >
              Base
            </button>
            <button
              onClick={() => {
                setCurrentVariation(10);
                setTimeout(saveScenario, 0);
              }}
              className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium"
            >
              Optimista
            </button>
            <button
              onClick={() => {
                setCurrentVariation(-10);
                setTimeout(saveScenario, 0);
              }}
              className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium"
            >
              Pessimista
            </button>
            <button
              onClick={applyToMain}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              Aplicar al simulador
            </button>
          </div>
        </div>

        {scenarios.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No hi ha escenaris guardats. Ajusta els vots i guarda per comparar.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map(scenario => (
              <motion.div
                key={scenario.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  activeScenario === scenario.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
                onClick={() => loadScenario(scenario)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: scenario.color }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScenario(scenario.id);
                    }}
                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">{scenario.name}</h5>
                <p className="text-sm text-slate-500">{scenario.description}</p>
                <div className="mt-2 flex gap-2">
                  {scenario.results.map((r, i) => (
                    <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {r.totalSeats} escons
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Comparador d'escenaris */}
      {scenarios.length >= 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h4 className="font-bold text-slate-900 dark:text-white mb-4">Comparativa d'escenaris</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-4">Partit</th>
                  <th className="text-center py-2 px-4">Base</th>
                  {scenarios.map(s => (
                    <th key={s.id} className="text-center py-2 px-4" style={{ color: s.color }}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baseParties.map(party => {
                  const baseSeats = results.reduce((sum, r) => {
                    const p = r.parties.find((x: any) => x.partyId === party.id);
                    return sum + (p?.seats || 0);
                  }, 0);
                  
                  return (
                    <tr key={party.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 px-4 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: party.color }} />
                        <span className="font-medium">{party.shortName}</span>
                      </td>
                      <td className="text-center py-2 px-4 font-bold">{baseSeats}</td>
                      {scenarios.map(s => {
                        const scenarioSeats = s.results.reduce((sum, r) => {
                          const p = r.parties.find((x: any) => x.partyId === party.id);
                          return sum + (p?.seats || 0);
                        }, 0);
                        const diff = scenarioSeats - baseSeats;
                        
                        return (
                          <td key={s.id} className="text-center py-2 px-4">
                            <span className="font-bold">{scenarioSeats}</span>
                            {diff !== 0 && (
                              <span className={`text-xs ml-1 ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
