'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { 
  Calculator, 
  Save, 
  Download, 
  Share2, 
  Settings,
  Plus,
  Trash2,
  Copy,
  GitCompare,
  Eye,
  EyeOff,
  Play,
  Pause,
  Users,
  MapPin,
  LogOut,
  User,
  Zap,
  Maximize2,
  TrendingUp
} from 'lucide-react';
import { 
  calculateElection, 
  ElectoralMethod, 
  ConstituencyResult,
  PartyResult 
} from '@/lib/calculations/electoralMethods';
import Hemicycle from '@/components/Hemicycle';
import StepByStep from '@/components/StepByStep';
import ExportPanel from '@/components/ExportPanel';
import PartyLibrary from '@/components/PartyLibrary';
import AuthModal from '@/components/AuthModal';
import WhatIfSimulator from '@/components/WhatIfSimulator';
import ConstituencyHeatmap from '@/components/ConstituencyHeatmap';
import PresentationMode from '@/components/PresentationMode';
import ThemeToggle from '@/components/ThemeToggle';
import PredictionPanel from '@/components/PredictionPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

// Tipus
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

interface User {
  id: string;
  name: string;
  email: string;
}

// Plantilles
const TEMPLATES = {
  spain: {
    name: 'Congrés dels Diputats (Espanya)',
    constituencies: [
      { name: 'Madrid', seats: 37 },
      { name: 'Barcelona', seats: 31 },
      { name: 'València', seats: 15 },
      { name: 'Sevilla', seats: 12 },
      { name: 'Alicante', seats: 12 },
      { name: 'Màlaga', seats: 11 },
      { name: 'Múrcia', seats: 10 },
      { name: 'Cádiz', seats: 9 },
      { name: 'Balears', seats: 8 },
      { name: 'Las Palmas', seats: 8 },
    ]
  },
  catalonia: {
    name: 'Parlament de Catalunya',
    constituencies: [
      { name: 'Barcelona', seats: 85 },
      { name: 'Tarragona', seats: 18 },
      { name: 'Girona', seats: 17 },
      { name: 'Lleida', seats: 15 },
    ]
  }
};

const METHODS: { value: ElectoralMethod; label: string; description: string }[] = [
  { value: 'dhondt', label: "D'Hondt", description: 'Mètode més utilitzat. Beneficia partits grans.' },
  { value: 'saintelague', label: 'Sainte-Laguë', description: 'Més proporcional que D\'Hondt. Divisors: 1, 3, 5, 7...' },
  { value: 'hare', label: 'Quota Hare', description: 'Quota simple. Vots/escons. Residus per major.' },
  { value: 'droop', label: 'Quota Droop', description: 'Quota majoritària. Més estable que Hare.' },
  { value: 'imperiali', label: 'Imperiali', description: 'Divisors: 2, 3, 4... Molt majoritari.' },
  { value: 'huntington', label: 'Huntington-Hill', description: 'Mitjana geomètrica. USA House of Representatives.' },
  { value: 'danish', label: 'Danish', description: 'Divisors: 1, 4, 7, 10... Molt proporcional.' },
  { value: 'adams', label: 'Adams', description: 'Prim escó automàtic. Molt proporcional.' },
];

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#8b5cf6', '#a855f7', '#0ea5e9'
];


const TAB_CONFIG = [
  { id: 'setup', label: 'Configuració', icon: Settings },
  { id: 'results', label: 'Resultats', icon: Calculator },
  { id: 'whatif', label: 'Què passaria si', icon: Zap },
  { id: 'heatmap', label: 'Mapa de calor', icon: MapPin },
  { id: 'prediction', label: 'Predicció', icon: TrendingUp },
  { id: 'stepbystep', label: 'Pas a pas', icon: Eye },
  { id: 'compare', label: 'Comparador', icon: GitCompare },
  { id: 'export', label: 'Exportar', icon: Download },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>;


export default function SimulatorPage() {
  // Estat principal
  const [parties, setParties] = useState<Party[]>([
    { id: '1', name: 'Partit A', shortName: 'A', color: '#3b82f6', votes: 120000 },
    { id: '2', name: 'Partit B', shortName: 'B', color: '#ef4444', votes: 95000 },
    { id: '3', name: 'Partit C', shortName: 'C', color: '#10b981', votes: 70000 },
    { id: '4', name: 'Partit D', shortName: 'D', color: '#f59e0b', votes: 45000 },
  ]);
  
  const [constituencies, setConstituencies] = useState<Constituency[]>([
    { id: '1', name: 'Circumscripció 1', seats: 10, votes: {} }
  ]);
  
  const [method, setMethod] = useState<ElectoralMethod>('dhondt');
  const [threshold, setThreshold] = useState(3);
  const [results, setResults] = useState<ConstituencyResult[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof TAB_CONFIG)[number]['id']>('setup');
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Record<ElectoralMethod, ConstituencyResult[]>>({} as any);
  const [isRealTime, setIsRealTime] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Estat per biblioteca, autenticació i funcionalitats noves
  const [showPartyLibrary, setShowPartyLibrary] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [scenarios, setScenarios] = useState<{ name: string; results: ConstituencyResult[] }[]>([]);
  const [presentationMode, setPresentationMode] = useState(false);

  // Carregar usuari al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('bigelecto-current-user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        console.error('Error carregant usuari:', e);
      }
    }
  }, []);

  // Tancar sessió
  const logout = () => {
    localStorage.removeItem('bigelecto-current-user');
    setCurrentUser(null);
  };

  // Calcular resultats
  const calculateResults = useCallback(() => {
    const newResults = constituencies.map(constituency => {
      const votes = parties.map(p => ({
        partyId: p.id,
        partyName: p.name,
        color: p.color,
        votes: constituency.votes[p.id] || 0
      })).filter(v => v.votes > 0);
      
      return calculateElection(votes, constituency.seats, method, threshold);
    });
    
    setResults(newResults);
    
    if (showComparison) {
      const comparison: Record<ElectoralMethod, ConstituencyResult[]> = {} as any;
      METHODS.forEach(m => {
        comparison[m.value] = constituencies.map(constituency => {
          const votes = parties.map(p => ({
            partyId: p.id,
            partyName: p.name,
            color: p.color,
            votes: constituency.votes[p.id] || 0
          })).filter(v => v.votes > 0);
          
          return calculateElection(votes, constituency.seats, m.value, threshold);
        });
      });
      setComparisonResults(comparison);
    }
  }, [parties, constituencies, method, threshold, showComparison]);

  // Càlcul en temps real
  useEffect(() => {
    if (isRealTime) {
      calculateResults();
    }
  }, [isRealTime, parties, constituencies, method, threshold, calculateResults]);

  // Gestió de partits
  const addParty = () => {
    const newId = (parties.length + 1).toString();
    setParties([...parties, {
      id: newId,
      name: `Nou Partit ${newId}`,
      shortName: `P${newId}`,
      color: PRESET_COLORS[parties.length % PRESET_COLORS.length],
      votes: 0
    }]);
  };

  const addPartiesFromLibrary = (newParties: any[]) => {
    const startingIndex = parties.length;
    const partiesWithNewIds: Party[] = newParties.map((p, i) => ({
      id: (startingIndex + i + 1).toString(),
      name: p.name || 'Sense nom',
      shortName: p.shortName || 'SN',
      color: p.color || '#3b82f6',
      votes: 0
    }));
    setParties([...parties, ...partiesWithNewIds]);
  };

  const updateParty = (id: string, updates: Partial<Party>) => {
    setParties(parties.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeParty = (id: string) => {
    if (parties.length > 2) {
      setParties(parties.filter(p => p.id !== id));
    }
  };

  // Gestió de circumscripcions
  const addConstituency = () => {
    const newId = (constituencies.length + 1).toString();
    setConstituencies([...constituencies, {
      id: newId,
      name: `Circumscripció ${newId}`,
      seats: 10,
      votes: {}
    }]);
  };

  const updateConstituency = (id: string, updates: Partial<Constituency>) => {
    setConstituencies(constituencies.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeConstituency = (id: string) => {
    if (constituencies.length > 1) {
      setConstituencies(constituencies.filter(c => c.id !== id));
    }
  };

  const updateVotes = (constituencyId: string, partyId: string, votes: number) => {
    setConstituencies(constituencies.map(c => 
      c.id === constituencyId 
        ? { ...c, votes: { ...c.votes, [partyId]: votes } }
        : c
    ));
  };

  // Aplicar plantilla
  const applyTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
    if (template) {
      setConstituencies(template.constituencies.map((c, i) => ({
        id: (i + 1).toString(),
        name: c.name,
        seats: c.seats,
        votes: {}
      })));
      setSelectedTemplate(templateKey);
    }
  };

  // Afegir escenari
  const addScenario = (name: string, scenarioResults: ConstituencyResult[]) => {
    setScenarios([...scenarios, { name, results: scenarioResults }]);
  };

  // Totals
  const totalSeats = results.reduce((sum, r) => sum + r.totalSeats, 0);
  const aggregatedResults = results.reduce((acc, constituency) => {
    constituency.parties.forEach(p => {
      if (!acc[p.partyId]) {
        acc[p.partyId] = { ...p, seats: 0 };
      }
      acc[p.partyId].seats += p.seats;
    });
    return acc;
  }, {} as Record<string, PartyResult>);

  const sortedResults = Object.values(aggregatedResults).sort((a, b) => b.seats - a.seats);

  const tabs = TAB_CONFIG;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <span className="text-2xl">←</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Simulador</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Anàlisi electoral interactiva avançada</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-400">{currentUser.name}</span>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Tancar sessió"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Iniciar sessió</span>
              </button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRealTime(!isRealTime)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isRealTime 
                  ? 'bg-green-500 text-white' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isRealTime ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="hidden sm:inline">{isRealTime ? 'Temps real ON' : 'Temps real'}</span>
            </motion.button>

            {results.length > 0 && (
              <button
                onClick={() => setPresentationMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Presentació</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Users className="w-4 h-4" />
                    </span>
                    Partits
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPartyLibrary(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Biblioteca
                    </button>
                    <button
                      onClick={addParty}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nou
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {parties.map((party, index) => (
                    <motion.div
                      key={party.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <input
                        type="color"
                        value={party.color}
                        onChange={(e) => updateParty(party.id, { color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={party.name}
                        onChange={(e) => updateParty(party.id, { name: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="Nom del partit"
                      />
                      <input
                        type="text"
                        value={party.shortName}
                        onChange={(e) => updateParty(party.id, { shortName: e.target.value })}
                        className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-center text-slate-900 dark:text-white"
                        placeholder="Sigles"
                      />
                      {parties.length > 2 && (
                        <button
                          onClick={() => removeParty(party.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    Circumscripcions
                  </h2>
                  <div className="flex gap-2">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                    >
                      <option value="">Plantilles...</option>
                      <option value="spain">Espanya (Congrés)</option>
                      <option value="catalonia">Catalunya (Parlament)</option>
                    </select>
                    <button
                      onClick={addConstituency}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Afegir
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {constituencies.map((constituency) => (
                    <motion.div
                      key={constituency.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <input
                          type="text"
                          value={constituency.name}
                          onChange={(e) => updateConstituency(constituency.id, { name: e.target.value })}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-900 dark:text-white"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">Escons:</span>
                          <input
                            type="number"
                            value={constituency.seats}
                            onChange={(e) => updateConstituency(constituency.id, { seats: parseInt(e.target.value) || 1 })}
                            className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-center"
                            min="1"
                          />
                        </div>
                        {constituencies.length > 1 && (
                          <button
                            onClick={() => removeConstituency(constituency.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {parties.map(party => (
                          <div key={party.id} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: party.color }}
                            />
                            <input
                              type="number"
                              value={constituency.votes[party.id] || ''}
                              onChange={(e) => updateVotes(constituency.id, party.id, parseInt(e.target.value) || 0)}
                              placeholder={party.shortName}
                              className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
                    <Calculator className="w-4 h-4" />
                  </span>
                  Mètode Electoral
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMethod(m.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        method === m.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-white mb-1">{m.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{m.description}</div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Llindar electoral: {threshold}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <button
                    onClick={calculateResults}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transform hover:scale-105 transition-all"
                  >
                    🗳️ Calcular
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && results.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
                  Distribució Parlamentària
                </h2>
                <Hemicycle
                  seats={sortedResults.map(r => ({
                    partyId: r.partyId,
                    partyName: r.partyName,
                    color: r.color,
                    count: r.seats
                  }))}
                  totalSeats={totalSeats}
                  majorityThreshold={Math.floor(totalSeats / 2) + 1}
                />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Partit</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">Vots totals</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">%</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">Escons</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">% escons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedResults.map((party) => {
                      const totalVotes = results.reduce((sum, r) => sum + r.totalVotes, 0);
                      const votePercent = totalVotes > 0 ? (party.votes / totalVotes) * 100 : 0;
                      const seatPercent = totalSeats > 0 ? (party.seats / totalSeats) * 100 : 0;
                      
                      return (
                        <tr key={party.partyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: party.color }}
                              />
                              <span className="font-medium text-slate-900 dark:text-white">{party.partyName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                            {party.votes.toLocaleString('ca-ES')}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                            {votePercent.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-bold rounded-full text-lg">
                              {party.seats}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                            {seatPercent.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'whatif' && (
            <motion.div
              key="whatif"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <WhatIfSimulator
                baseParties={parties}
                baseConstituencies={constituencies}
                method={method}
                threshold={threshold}
                onSaveScenario={({ name, results }) => addScenario(name, results)}
                onApplyChanges={(newParties, newConstituencies) => {
                  setParties(newParties);
                  setConstituencies(newConstituencies);
                  setActiveTab('setup');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'heatmap' && results.length > 0 && (
            <motion.div
              key="heatmap"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-orange-500" />
                  Mapa de calor de circumscripcions
                </h2>
                <ConstituencyHeatmap results={results} constituencies={constituencies} />
              </div>
            </motion.div>
          )}


          {activeTab === 'prediction' && (
            <motion.div
              key="prediction"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-gradient-to-br from-white to-indigo-50 dark:from-slate-900 dark:to-slate-900 rounded-2xl p-8 border border-indigo-100 dark:border-slate-800 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Predicció de resultats</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Ajusta enquestes i incertesa per visualitzar escenaris probables.</p>
                <PredictionPanel
                  parties={parties}
                  constituencies={constituencies}
                  method={method}
                  threshold={threshold}
                />
              </div>
            </motion.div>
          )}


          {activeTab === 'stepbystep' && results.length > 0 && (
            <motion.div
              key="stepbystep"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-blue-500" />
                  Repartiment pas a pas
                </h2>
                {results.map((result, idx) => (
                  <div key={idx} className="mb-8">
                    {results.length > 1 && (
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">
                        {result.name || `Circumscripció ${idx + 1}`} ({result.totalSeats} escons)
                      </h3>
                    )}
                    <StepByStep result={result} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'export' && results.length > 0 && (
            <motion.div
              key="export"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Download className="w-6 h-6 text-green-500" />
                  Exportar resultats
                </h2>
                <ExportPanel results={results} method={method} threshold={threshold} />
              </div>
            </motion.div>
          )}

          {activeTab === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  Comparador de Mètodes
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Compara com canviaria el resultat amb diferents mètodes electorals.
                </p>
                
                <button
                  onClick={() => {
                    setShowComparison(true);
                    calculateResults();
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Generar comparació
                </button>

                {showComparison && Object.keys(comparisonResults).length > 0 && (
                  <>
                    <div className="mt-8"> 
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Comparador d'escenaris (base / optimista / pessimista)</h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sortedResults.map((p) => ({
                              party: p.partyName,
                              Base: p.seats,
                              Optimista: Math.max(0, Math.round(p.seats * 1.1)),
                              Pessimista: Math.max(0, Math.round(p.seats * 0.9))
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="party" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="Base" fill="#2563eb" />
                            <Bar dataKey="Optimista" fill="#16a34a" />
                            <Bar dataKey="Pessimista" fill="#dc2626" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {METHODS.map(m => {
                      const methodResults = comparisonResults[m.value];
                      if (!methodResults) return null;
                      
                      const totalSeatsMethod = methodResults.reduce((sum, r) => sum + r.totalSeats, 0);
                      const agg = methodResults.reduce((acc, constituency) => {
                        constituency.parties.forEach(p => {
                          if (!acc[p.partyId]) acc[p.partyId] = { ...p, seats: 0 };
                          acc[p.partyId].seats += p.seats;
                        });
                        return acc;
                      }, {} as Record<string, PartyResult>);
                      
                      const sorted = Object.values(agg).sort((a, b) => b.seats - a.seats);

                      return (
                        <div key={m.value} className={`p-4 rounded-xl border-2 ${method === m.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                          <h3 className="font-bold text-slate-900 dark:text-white mb-3">{m.label}</h3>
                          <div className="space-y-2">
                            {sorted.map(p => (
                              <div key={p.partyId} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                  <span className="text-slate-700 dark:text-slate-300">{p.partyName}</span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">{p.seats}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {showPartyLibrary && (
        <PartyLibrary
          onSelect={addPartiesFromLibrary}
          onClose={() => setShowPartyLibrary(false)}
          currentParties={parties}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={setCurrentUser}
      />

      <PresentationMode
        results={results}
        scenarios={scenarios}
        isActive={presentationMode}
        onClose={() => setPresentationMode(false)}
      />
    </div>
  );
}
