'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConstituencyResult, ElectoralMethod, calculateElection } from '@/lib/calculations/electoralMethods';

interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

interface Constituency {
  id: string;
  name: string;
  seats: number;
  votes: Record<string, number>;
}

interface PredictionPanelProps {
  parties: Party[];
  constituencies: Constituency[];
  method: ElectoralMethod;
  threshold: number;
}

const ITERATIONS = 1000;

const randomNormal = (mean: number, stdDev: number) => {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
};

export default function PredictionPanel({ parties, constituencies, method, threshold }: PredictionPanelProps) {
  const baseVotes = useMemo(() => {
    const totals = Object.fromEntries(parties.map((p) => [p.id, 0] as const));
    constituencies.forEach((c) => {
      parties.forEach((p) => {
        totals[p.id] += c.votes[p.id] || 0;
      });
    });
    return totals;
  }, [parties, constituencies]);

  const totalVotes = (Object.values(baseVotes) as number[]).reduce((a, b) => a + b, 0);

  const [polls, setPolls] = useState<Record<string, number>>(() => {
    const initial = Object.fromEntries(
      parties.map((p) => [p.id, totalVotes > 0 ? ((baseVotes[p.id] || 0) / totalVotes) * 100 : 0])
    );
    return initial;
  });
  const [marginError, setMarginError] = useState(2.5);

  const monteCarlo = useMemo(() => {
    const seatSamples: Record<string, number[]> = Object.fromEntries(parties.map((p) => [p.id, []]));

    for (let i = 0; i < ITERATIONS; i++) {
      const noisyShares = parties.map((p) => ({
        partyId: p.id,
        share: Math.max(0.1, randomNormal(polls[p.id] ?? 0, marginError))
      }));
      const shareSum = noisyShares.reduce((sum, s) => sum + s.share, 0);

      const normalizedShares = Object.fromEntries(
        noisyShares.map((s) => [s.partyId, (s.share / shareSum)])
      );

      const constituencyResults: ConstituencyResult[] = constituencies.map((c) => {
        const constituencyTotal = parties.reduce((sum, p) => sum + (c.votes[p.id] || 0), 0);
        const syntheticVotes = parties
          .map((p) => ({
            partyId: p.id,
            partyName: p.name,
            color: p.color,
            votes: Math.round(constituencyTotal * (normalizedShares[p.id] || 0))
          }))
          .filter((v) => v.votes > 0);

        return calculateElection(syntheticVotes, c.seats, method, threshold);
      });

      const aggregatedSeats = Object.fromEntries(parties.map((p) => [p.id, 0]));
      constituencyResults.forEach((res) => {
        res.parties.forEach((p) => {
          aggregatedSeats[p.partyId] = (aggregatedSeats[p.partyId] || 0) + p.seats;
        });
      });

      parties.forEach((p) => {
        seatSamples[p.id].push(aggregatedSeats[p.id] || 0);
      });
    }

    const quantile = (arr: number[], q: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor(q * (sorted.length - 1));
      return sorted[idx];
    };

    return parties
      .map((p) => {
        const samples = seatSamples[p.id];
        const expectedSeats = samples.reduce((a, b) => a + b, 0) / samples.length;
        return {
          partyId: p.id,
          partyName: p.shortName,
          color: p.color,
          expectedSeats: Number(expectedSeats.toFixed(1)),
          low: quantile(samples, 0.05),
          high: quantile(samples, 0.95)
        };
      })
      .sort((a, b) => b.expectedSeats - a.expectedSeats);
  }, [constituencies, marginError, method, parties, polls, threshold]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {parties.map((party) => (
            <div key={party.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{party.name}</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={(polls[party.id] ?? 0).toFixed(1)}
                  onChange={(e) => setPolls((prev) => ({ ...prev, [party.id]: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  step="0.1"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Marge d'error: ±{marginError.toFixed(1)} punts
          </label>
          <input
            type="range"
            min="0.5"
            max="8"
            step="0.1"
            value={marginError}
            onChange={(e) => setMarginError(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <p className="text-xs text-slate-500 mt-3">Simulació Monte Carlo: {ITERATIONS} iteracions</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monteCarlo}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="partyName" />
            <YAxis />
            <Tooltip formatter={(value, name) => [value, name === 'expectedSeats' ? 'Escons esperats' : name]} />
            <Bar dataKey="expectedSeats" name="Escons esperats">
              {monteCarlo.map((entry) => (
                <Cell key={entry.partyId} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2">Partit</th>
              <th className="text-right py-2">Esperat</th>
              <th className="text-right py-2">IC 90%</th>
            </tr>
          </thead>
          <tbody>
            {monteCarlo.map((p) => (
              <tr key={p.partyId} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2">{p.partyName}</td>
                <td className="text-right py-2 font-semibold">{p.expectedSeats}</td>
                <td className="text-right py-2">{p.low} - {p.high}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
