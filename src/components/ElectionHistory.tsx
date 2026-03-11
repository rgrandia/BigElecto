'use client';

import { ConstituencyResult } from '@/lib/calculations/electoralMethods';

interface ElectionHistoryProps {
  currentResults: ConstituencyResult[];
}

const HISTORICAL = [
  {
    year: 2015,
    turnout: 68.2,
    seats: { A: 122, B: 90, C: 69, D: 40 }
  },
  {
    year: 2019,
    turnout: 66.5,
    seats: { A: 120, B: 88, C: 52, D: 28 }
  },
  {
    year: 2023,
    turnout: 70.4,
    seats: { A: 136, B: 122, C: 31, D: 33 }
  }
];

export default function ElectionHistory({ currentResults }: ElectionHistoryProps) {
  const currentSeats = currentResults.reduce((acc, res) => {
    res.parties.forEach((p) => {
      const key = p.partyName.slice(-1).toUpperCase();
      acc[key] = (acc[key] || 0) + p.seats;
    });
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <p className="text-slate-600 dark:text-slate-300">
        Històric d'eleccions i comparació ràpida amb la simulació actual.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2">Any</th>
              <th className="text-right py-2">Participació</th>
              <th className="text-right py-2">A</th>
              <th className="text-right py-2">B</th>
              <th className="text-right py-2">C</th>
              <th className="text-right py-2">D</th>
            </tr>
          </thead>
          <tbody>
            {HISTORICAL.map((e) => (
              <tr key={e.year} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-semibold">{e.year}</td>
                <td className="py-2 text-right">{e.turnout}%</td>
                <td className="py-2 text-right">{e.seats.A}</td>
                <td className="py-2 text-right">{e.seats.B}</td>
                <td className="py-2 text-right">{e.seats.C}</td>
                <td className="py-2 text-right">{e.seats.D}</td>
              </tr>
            ))}
            <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-bold">
              <td className="py-2">Simulació actual</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">{currentSeats.A || 0}</td>
              <td className="py-2 text-right">{currentSeats.B || 0}</td>
              <td className="py-2 text-right">{currentSeats.C || 0}</td>
              <td className="py-2 text-right">{currentSeats.D || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
