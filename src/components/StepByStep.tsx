'use client';

import { motion } from 'framer-motion';
import { ConstituencyResult } from '@/lib/calculations/electoralMethods';
import { Trophy, ArrowRight, Calculator } from 'lucide-react';

interface StepByStepProps {
  result: ConstituencyResult;
}

export default function StepByStep({ result }: StepByStepProps) {
  if (!result.distribution || result.distribution.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Calcula els resultats per veure el repartiment pas a pas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
          Com es reparteixen els {result.totalSeats} escons?
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Es calcula el quocient per cada partit (vots / divisor) i s'assigna l'escó al partit amb quocient més alt.
          El divisor depèn del mètode electoral seleccionat.
        </p>
      </div>

      <div className="grid gap-3">
        {result.distribution.map((step, index) => {
          const party = result.parties.find(p => p.partyId === step.partyId);
          if (!party) return null;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full font-bold text-slate-600 dark:text-slate-400">
                {step.seatNumber}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: party.color }}
                  />
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {party.partyName}
                  </span>
                  {index === 0 && (
                    <Trophy className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Quocient: <span className="font-mono font-medium">{step.quotient.toFixed(2)}</span>
                  {' '}({party.votes.toLocaleString()} vots / {Math.round(party.votes / step.quotient)})
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Escó #{step.seatNumber}</span>
                <ArrowRight className="w-4 h-4 text-green-500" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Resum final */}
      <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <h4 className="font-bold text-green-900 dark:text-green-100 mb-3">Resultat final</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {result.parties
            .filter(p => p.seats > 0)
            .sort((a, b) => b.seats - a.seats)
            .map(party => (
              <div key={party.partyId} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: party.color }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {party.partyName}: {party.seats}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
