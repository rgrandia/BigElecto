'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Swords } from 'lucide-react';
import { ConstituencyResult } from '@/lib/calculations/electoralMethods';

interface HeatmapProps {
  results: ConstituencyResult[];
  constituencies: { id: string; name: string; seats: number }[];
}

export default function ConstituencyHeatmap({ results, constituencies }: HeatmapProps) {
  const heatmapData = useMemo(() => {
    return results.map((result, idx) => {
      const sorted = [...result.parties].sort((a, b) => b.seats - a.seats);
      const winner = sorted[0];
      const second = sorted[1];
      const margin = winner && second ? winner.seats - second.seats : 0;
      const totalVotes = result.totalVotes;
      const voteMargin = winner && second ? 
        ((winner.votes / (winner.seats || 1)) - (second.votes / (second.seats || 1))) : 0;
      
      // Calcular intensitat (0-100)
      const intensity = Math.min(100, (margin / result.totalSeats) * 100 + 20);
      
      // Determinar tipus
      let type: 'landslide' | 'comfortable' | 'tight' | 'tossup' = 'tossup';
      if (margin >= result.totalSeats * 0.5) type = 'landslide';
      else if (margin >= result.totalSeats * 0.2) type = 'comfortable';
      else if (margin > 0) type = 'tight';
      
      return {
        ...result,
        name: constituencies[idx]?.name || result.name,
        margin,
        intensity,
        type,
        winner,
        second
      };
    });
  }, [results, constituencies]);

  const getColor = (type: string, intensity: number) => {
    const alpha = intensity / 100;
    switch (type) {
      case 'landslide': return `rgba(34, 197, 94, ${0.3 + alpha * 0.5})`; // Verd
      case 'comfortable': return `rgba(59, 130, 246, ${0.3 + alpha * 0.5})`; // Blau
      case 'tight': return `rgba(245, 158, 11, ${0.3 + alpha * 0.5})`; // Taronja
      case 'tossup': return `rgba(239, 68, 68, ${0.5 + alpha * 0.3})`; // Vermell
      default: return 'rgba(156, 163, 175, 0.5)';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'landslide': return <Shield className="w-4 h-4" />;
      case 'comfortable': return <Shield className="w-4 h-4" />;
      case 'tight': return <Swords className="w-4 h-4" />;
      case 'tossup': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'landslide': return 'Majoria aplastant';
      case 'comfortable': return 'Majoria còmoda';
      case 'tight': return 'Competitiva';
      case 'tossup': return 'Indecisa';
    }
  };

  return (
    <div className="space-y-4">
      {/* Llegenda */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { type: 'landslide', label: 'Aplastant', color: 'bg-green-500' },
          { type: 'comfortable', label: 'Còmoda', color: 'bg-blue-500' },
          { type: 'tight', label: 'Ajustada', color: 'bg-amber-500' },
          { type: 'tossup', label: 'Indecisa', color: 'bg-red-500' }
        ].map(item => (
          <div key={item.type} className="flex items-center gap-2 text-sm">
            <div className={`w-4 h-4 rounded ${item.color}`} />
            <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid de circumscripcions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {heatmapData.map((data, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all"
            style={{ backgroundColor: getColor(data.type, data.intensity) }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 dark:text-white truncate">
                  {data.name}
                </h4>
                <span className={`p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 ${
                  data.type === 'landslide' ? 'text-green-600' :
                  data.type === 'comfortable' ? 'text-blue-600' :
                  data.type === 'tight' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {getIcon(data.type)}
                </span>
              </div>
              
              <div className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                {getLabel(data.type)}
              </div>

              {/* Resultat */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: data.winner?.color }}
                    />
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {data.winner?.partyName}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {data.winner?.seats}
                  </span>
                </div>
                
                {data.second && data.second.seats > 0 && (
                  <div className="flex items-center justify-between opacity-70">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: data.second?.color }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 text-sm">
                        {data.second?.partyName}
                      </span>
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">
                      {data.second?.seats}
                    </span>
                  </div>
                )}
              </div>

              {/* Marge */}
              <div className="mt-3 pt-3 border-t border-white/30 dark:border-slate-700/30">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Marge:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    +{data.margin} escons
                  </span>
                </div>
                <div className="w-full h-2 bg-white/50 dark:bg-slate-700/50 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-slate-900 dark:bg-white rounded-full transition-all"
                    style={{ width: `${Math.min(100, (data.margin / data.totalSeats) * 200)}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
