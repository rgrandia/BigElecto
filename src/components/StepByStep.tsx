'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConstituencyResult } from '@/lib/calculations/electoralMethods';
import { Trophy, ArrowRight, Calculator, Crown, TrendingUp, Award } from 'lucide-react';

interface StepByStepProps {
  result: ConstituencyResult;
  autoPlay?: boolean;
  speed?: number;
}

export default function StepByStep({ result, autoPlay = false, speed = 1000 }: StepByStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (isPlaying && !showAll && currentStep < (result.distribution?.length || 0)) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (currentStep >= (result.distribution?.length || 0)) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, result.distribution, showAll, speed]);

  if (!result.distribution || result.distribution.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Calcula els resultats per veure el repartiment pas a pas</p>
      </div>
    );
  }

  const visibleSteps = showAll ? result.distribution : result.distribution.slice(0, currentStep);
  const currentDistribution = result.distribution[currentStep - 1];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4">
        <div>
          <h3 className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Repartiment dels {result.totalSeats} escons
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Es calcula el quocient per cada partit i s'assigna l'escó al més alt
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCurrentStep(0);
              setIsPlaying(!isPlaying);
              setShowAll(false);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isPlaying ? '⏸️ Pausa' : '▶️ Reproduir'}
          </button>
          <button
            onClick={() => {
              setShowAll(!showAll);
              setIsPlaying(false);
              if (!showAll) setCurrentStep(result.distribution.length);
            }}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {showAll ? '👁️ Mostrar pas a pas' : '⚡ Mostrar tot'}
          </button>
        </div>
      </div>

      {/* Barra de progrés */}
      <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / result.distribution.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Pas actual destacat */}
      <AnimatePresence mode="wait">
        {currentDistribution && !showAll && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-3xl p-8 border-2 border-yellow-200 dark:border-yellow-800 shadow-xl"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border-4 border-dashed border-yellow-300 dark:border-yellow-700"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-24 h-24 rounded-full shadow-2xl flex items-center justify-center text-3xl"
                    style={{ 
                      backgroundColor: result.parties.find(p => p.partyId === currentDistribution.partyId)?.color,
                      boxShadow: `0 0 40px ${result.parties.find(p => p.partyId === currentDistribution.partyId)?.color}60`
                    }}
                  >
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  #{currentDistribution.seatNumber}
                </div>
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {result.parties.find(p => p.partyId === currentDistribution.partyId)?.partyName}
              </h4>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                Guanya l'escó número <span className="font-bold text-yellow-600">{currentDistribution.seatNumber}</span>
              </p>
              
              <div className="inline-flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl px-6 py-3 shadow-lg">
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Quocient</div>
                  <div className="text-2xl font-mono font-bold text-blue-600">
                    {currentDistribution.quotient.toFixed(2)}
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-300 dark:bg-slate-600" />
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Vots</div>
                  <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    {result.parties.find(p => p.partyId === currentDistribution.partyId)?.votes.toLocaleString()}
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-300 dark:bg-slate-600" />
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Divisor</div>
                  <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    {Math.round((result.parties.find(p => p.partyId === currentDistribution.partyId)?.votes || 0) / currentDistribution.quotient)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Llista de passos */}
      <div className="grid gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {visibleSteps.map((step, index) => {
          const party = result.parties.find(p => p.partyId === step.partyId);
          if (!party) return null;
          
          const isCurrent = index === currentStep - 1 && !showAll;
          const isPast = index < currentStep - 1 || showAll;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              animate={{ 
                opacity: isCurrent ? 1 : 0.7, 
                x: 0,
                scale: isCurrent ? 1.02 : 1
              }}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                isCurrent 
                  ? 'bg-white dark:bg-slate-800 border-yellow-400 shadow-xl' 
                  : isPast
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50'
              }`}
            >
              {/* Número d'escó */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                isCurrent 
                  ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' 
                  : isPast
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {isPast && !isCurrent ? '✓' : step.seatNumber}
              </div>

              {/* Info del partit */}
              <div className="flex-1 flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full shadow-md"
                  style={{ backgroundColor: party.color }}
                />
                <div>
                  <div className={`font-bold ${isCurrent ? 'text-lg' : ''} text-slate-900 dark:text-white`}>
                    {party.partyName}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Quocient: <span className="font-mono font-medium">{step.quotient.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Indicador */}
              {isCurrent && (
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <ArrowRight className="w-6 h-6 text-yellow-500" />
                </motion.div>
              )}
              {isPast && !isCurrent && (
                <Award className="w-5 h-5 text-green-500" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Resum final */}
      {showAll && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800"
        >
          <h4 className="font-bold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Resultat final
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {result.parties
              .filter(p => p.seats > 0)
              .sort((a, b) => b.seats - a.seats)
              .map(party => (
                <motion.div 
                  key={party.partyId} 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: party.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {party.partyName}
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {party.seats} escons
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
