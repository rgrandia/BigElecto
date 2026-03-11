'use client';

import { useState } from 'react';
import { calculateElection, ElectoralMethod, ConstituencyResult } from '@/lib/calculations/electoralMethods';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  votes: number;
}

const defaultParties: Party[] = [
  { id: '1', name: 'Partit A', shortName: 'A', color: '#3b82f6', votes: 100000 },
  { id: '2', name: 'Partit B', shortName: 'B', color: '#ef4444', votes: 80000 },
  { id: '3', name: 'Partit C', shortName: 'C', color: '#10b981', votes: 60000 },
  { id: '4', name: 'Partit D', shortName: 'D', color: '#f59e0b', votes: 40000 },
];

const methods: { value: ElectoralMethod; label: string }[] = [
  { value: 'dhondt', label: "D'Hondt" },
  { value: 'saintelague', label: 'Sainte-Laguë' },
  { value: 'hare', label: 'Hare (Quota)' },
  { value: 'droop', label: 'Droop' },
  { value: 'imperiali', label: 'Imperiali' },
  { value: 'huntington', label: 'Huntington-Hill' },
  { value: 'danish', label: 'Danish' },
  { value: 'adams', label: 'Adams' },
];

export default function Simulator() {
  const [parties, setParties] = useState<Party[]>(defaultParties);
  const [seats, setSeats] = useState(10);
  const [threshold, setThreshold] = useState(3);
  const [method, setMethod] = useState<ElectoralMethod>('dhondt');
  const [result, setResult] = useState<ConstituencyResult | null>(null);

  const calculate = () => {
    const votes = parties.map(p => ({
      partyId: p.id,
      partyName: p.name,
      color: p.color,
      votes: p.votes
    }));
    const res = calculateElection(votes, seats, method, threshold);
    setResult(res);
  };

  const updatePartyVotes = (id: string, votes: number) => {
    setParties(parties.map(p => p.id === id ? { ...p, votes } : p));
  };

  const addParty = () => {
    const newId = (parties.length + 1).toString();
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
    setParties([...parties, {
      id: newId,
      name: `Partit ${newId}`,
      shortName: newId,
      color: colors[parties.length % colors.length],
      votes: 0
    }]);
  };

  const removeParty = (id: string) => {
    if (parties.length > 2) {
      setParties(parties.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            BigElecto
          </h1>
          <p className="text-slate-600 text-lg">Simulador Electoral Avançat</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panell de configuració */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm">⚙️</span>
              Configuració
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mètode electoral</label>
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value as ElectoralMethod)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {methods.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Escons a repartir</label>
                  <input 
                    type="number" 
                    value={seats} 
                    onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Llindar electoral (%)</label>
                  <input 
                    type="number" 
                    value={threshold} 
                    onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold text-slate-700">Partits</label>
                  <button 
                    onClick={addParty}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    + Afegir partit
                  </button>
                </div>
                
                <div className="space-y-3">
                  {parties.map((party) => (
                    <div key={party.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <input 
                        type="color" 
                        value={party.color}
                        onChange={(e) => setParties(parties.map(p => p.id === party.id ? { ...p, color: e.target.value } : p))}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <input 
                        type="text" 
                        value={party.name}
                        onChange={(e) => setParties(parties.map(p => p.id === party.id ? { ...p, name: e.target.value } : p))}
                        className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Nom del partit"
                      />
                      <input 
                        type="number" 
                        value={party.votes}
                        onChange={(e) => updatePartyVotes(party.id, parseInt(e.target.value) || 0)}
                        className="w-32 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Vots"
                      />
                      {parties.length > 2 && (
                        <button 
                          onClick={() => removeParty(party.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={calculate}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transform hover:scale-[1.02] transition-all"
              >
                🗳️ Calcular resultats
              </button>
            </div>
          </div>

          {/* Panell de resultats */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
              Resultats
            </h2>

            {result ? (
              <div className="space-y-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.parties}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="partyName" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        formatter={(value: number) => [`${value} escons`, 'Escons']}
                      />
                      <Bar dataKey="seats" radius={[8, 8, 0, 0]}>
                        {result.parties.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-4 font-semibold text-slate-700">Partit</th>
                        <th className="p-4 font-semibold text-slate-700 text-right">Vots</th>
                        <th className="p-4 font-semibold text-slate-700 text-right">%</th>
                        <th className="p-4 font-semibold text-slate-700 text-right">Escons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {result.parties.map((party) => (
                        <tr key={party.partyId} className="hover:bg-slate-50">
                          <td className="p-4 flex items-center gap-3">
                            <span 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: party.color }}
                            />
                            <span className="font-medium text-slate-900">{party.partyName}</span>
                          </td>
                          <td className="p-4 text-right text-slate-600">
                            {party.votes.toLocaleString('ca-ES')}
                          </td>
                          <td className="p-4 text-right text-slate-600">
                            {((party.votes / result.totalVotes) * 100).toFixed(2)}%
                          </td>
                          <td className="p-4 text-right">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 font-bold rounded-full">
                              {party.seats}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{result.totalVotes.toLocaleString('ca-ES')}</div>
                    <div className="text-sm text-blue-800">Vots totals</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{result.totalSeats}</div>
                    <div className="text-sm text-green-800">Escons</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {(result.totalVotes / result.totalSeats).toFixed(0)}
                    </div>
                    <div className="text-sm text-purple-800">Vots/escons</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🗳️</div>
                  <p>Configura els partits i prem "Calcular resultats"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
