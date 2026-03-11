'use client';

import { useState, useEffect } from 'react';
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
  TrendingUp,
  History,
  Check,
  X
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
import ElectionHistory from '@/components/ElectionHistory';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

// --- Tipus ---
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

interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

// --- Configuració tabs (ELIMINAT 'history') ---
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

// ✅ Tip derivat de TAB_CONFIG
type TabId = (typeof TAB_CONFIG)[number]['id'];

// --- Templates d'exemple ---
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

// --- Mètodes electorals ---
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

// --- Component principal ---
export default function SimulatorPage() {
  // Estat principal - vots inicials a 0, s'han d'introduir per circumscripció
  const [parties, setParties] = useState<Party[]>([
    { id: '1', name: 'Partit A', shortName: 'A', color: '#3b82f6', votes: 0 },
    { id: '2', name: 'Partit B', shortName: 'B', color: '#ef4444', votes: 0 },
    { id: '3', name: 'Partit C', shortName: 'C', color: '#10b981', votes: 0 },
    { id: '4', name: 'Partit D', shortName: 'D', color: '#f59e0b', votes: 0 },
  ]);

  const [constituencies, setConstituencies] = useState<Constituency[]>([
    { id: '1', name: 'Circumscripció 1', seats: 10, votes: { '1': 0, '2': 0, '3': 0, '4': 0 } }
  ]);

  const [method, setMethod] = useState<ElectoralMethod>('dhondt');
  const [threshold, setThreshold] = useState(3);
  const [results, setResults] = useState<ConstituencyResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Record<ElectoralMethod, ConstituencyResult[]>>({} as any);
  const [isRealTime, setIsRealTime] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [showPartyLibrary, setShowPartyLibrary] = useState(false);
  const [selectedLibraryParties, setSelectedLibraryParties] = useState<Array<{ id: string; name: string; shortName: string; color: string; votes: number }>>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [scenarios, setScenarios] = useState<{ name: string; results: ConstituencyResult[] }[]>([]);
  const [presentationMode, setPresentationMode] = useState(false);

  // Carregar usuari
  useEffect(() => {
    const saved = localStorage.getItem('bigelecto-current-user');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); } 
      catch (e) { console.error('Error carregant usuari:', e); }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('bigelecto-current-user');
    setCurrentUser(null);
  };

  // Funció per calcular totes les circumscripcions AMB vots específics
  const calculateAllConstituencies = (): ConstituencyResult[] => {
    return constituencies.map(constituency => {
      // Preparar els vots per aquesta circumscripció
      const partiesForCalc = parties.map(party => {
        // Usar vots específics de la circumscripció (mínim 0)
        const votes = constituency.votes[party.id] || 0;
        
        return {
          partyId: party.id,
          partyName: party.name,
          color: party.color,
          votes: votes
        };
      }).filter(p => p.votes > 0); // Només partits amb vots

      // Si no hi ha partits amb vots, retornar resultat buit
      if (partiesForCalc.length === 0) {
        return {
          name: constituency.name,
          totalSeats: constituency.seats,
          totalVotes: 0,
          parties: [],
          distribution: []
        };
      }

      const result = calculateElection(
        partiesForCalc,
        constituency.seats,
        method,
        threshold
      );
      
      // Afegir el nom de la circumscripció al resultat
      return {
        ...result,
        name: constituency.name
      };
    });
  };

  // Funció per afegir un nou partit amb vots inicialitzats a 0 a totes les circumscripcions
  const addParty = () => {
    const newId = (Math.max(...parties.map(p => parseInt(p.id)), 0) + 1).toString();
    const newParty: Party = {
      id: newId,
      name: `Partit ${String.fromCharCode(65 + parties.length)}`,
      shortName: String.fromCharCode(65 + parties.length),
      color: PRESET_COLORS[parties.length % PRESET_COLORS.length],
      votes: 0
    };
    
    setParties([...parties, newParty]);
    
    // Inicialitzar vots a 0 per aquest partit a totes les circumscripcions
    setConstituencies(prev => prev.map(c => ({
      ...c,
      votes: { ...c.votes, [newId]: 0 }
    })));
  };

  // Funció per eliminar un partit
  const removeParty = (index: number) => {
    const partyId = parties[index].id;
    setParties(parties.filter((_, i) => i !== index));
    
    // Eliminar vots d'aquest partit de totes les circumscripcions
    setConstituencies(prev => prev.map(c => {
      const { [partyId]: _, ...restVotes } = c.votes;
      return { ...c, votes: restVotes };
    }));
  };

  // Funció per afegir una nova circumscripció amb vots inicialitzats a 0 per tots els partits
  const addConstituency = () => {
    const newId = (Math.max(...constituencies.map(c => parseInt(c.id)), 0) + 1).toString();
    const votes: Record<string, number> = {};
    parties.forEach(p => {
      votes[p.id] = 0;
    });
    
    setConstituencies([
      ...constituencies,
      {
        id: newId,
        name: `Circumscripció ${constituencies.length + 1}`,
        seats: 10,
        votes
      }
    ]);
  };

  // Funció per importar partits de la biblioteca
  const importSelectedParties = () => {
    if (selectedLibraryParties.length === 0) return;
    
    // Afegir els partits seleccionats
    const newParties = [...parties];
    const newConstituencies = [...constituencies];
    
    selectedLibraryParties.forEach(libraryParty => {
      // Comprovar si ja existeix
      if (!parties.find(p => p.name === libraryParty.name)) {
        const newId = (Math.max(...newParties.map(p => parseInt(p.id)), 0) + 1).toString();
        const newParty: Party = {
          id: newId,
          name: libraryParty.name,
          shortName: libraryParty.shortName,
          color: libraryParty.color,
          votes: 0
        };
        newParties.push(newParty);
        
        // Afegir vots a 0 a totes les circumscripcions
        newConstituencies.forEach(c => {
          c.votes[newId] = 0;
        });
      }
    });
    
    setParties(newParties);
    setConstituencies(newConstituencies);
    setSelectedLibraryParties([]);
    setShowPartyLibrary(false);
  };

  // --- Render Tabs ---
  const renderActiveTab = () => {
    switch(activeTab) {
      case 'setup':
        return (
          <div className="p-6 space-y-8">
            {/* Secció: Configuració General */}
            <section className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-600" />
                Configuració General
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selector de mètode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mètode Electoral
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as ElectoralMethod)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {METHODS.find(m => m.value === method)?.description}
                  </p>
                </div>

                {/* Umbral electoral */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Umbral Electoral (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Percentatge mínim per obtenir representació
                  </p>
                </div>
              </div>

              {/* Templates */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Carregar Template
                </label>
                <div className="flex space-x-3">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      const templateKey = e.target.value as keyof typeof TEMPLATES;
                      setSelectedTemplate(templateKey);
                      if (templateKey && TEMPLATES[templateKey]) {
                        const template = TEMPLATES[templateKey];
                        // Crear circumscripcions amb vots inicialitzats a 0 per tots els partits
                        setConstituencies(
                          template.constituencies.map((c, idx) => {
                            const votes: Record<string, number> = {};
                            parties.forEach(p => {
                              votes[p.id] = 0;
                            });
                            return {
                              id: `const-${idx}`,
                              name: c.name,
                              seats: c.seats,
                              votes
                            };
                          })
                        );
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Selecciona un template --</option>
                    <option value="spain">{TEMPLATES.spain.name}</option>
                    <option value="catalonia">{TEMPLATES.catalonia.name}</option>
                  </select>
                  <button
                    onClick={() => {
                      setSelectedTemplate('');
                      const votes: Record<string, number> = {};
                      parties.forEach(p => {
                        votes[p.id] = 0;
                      });
                      setConstituencies([{ id: '1', name: 'Circumscripció 1', seats: 10, votes }]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </section>

            {/* Secció: Partits (SENSE input de vots) */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Partits ({parties.length})
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPartyLibrary(true)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Biblioteca
                  </button>
                  <button
                    onClick={addParty}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Afegir
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {parties.map((party, index) => (
                  <div key={party.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={party.color}
                        onChange={(e) => {
                          const updated = [...parties];
                          updated[index].color = e.target.value;
                          setParties(updated);
                        }}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                      />
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={party.name}
                          onChange={(e) => {
                            const updated = [...parties];
                            updated[index].name = e.target.value;
                            setParties(updated);
                          }}
                          placeholder="Nom del partit"
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={party.shortName}
                          onChange={(e) => {
                            const updated = [...parties];
                            updated[index].shortName = e.target.value;
                            setParties(updated);
                          }}
                          placeholder="Sigles"
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => removeParty(index)}
                        disabled={parties.length <= 1}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECCIÓ: Vots per Circumscripció (OBLIGATORI) */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  Vots per Circumscripció <span className="ml-2 text-sm font-normal text-red-500">*</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Introdueix els vots que rep cada partit a cada circumscripció. És obligatori introduir almenys 1 vot per circumscripció.
                </p>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {constituencies.map((constituency, constIndex) => (
                  <div key={constituency.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        <input
                          type="text"
                          value={constituency.name}
                          onChange={(e) => {
                            const updated = [...constituencies];
                            updated[constIndex].name = e.target.value;
                            setConstituencies(updated);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <input
                          type="number"
                          min="1"
                          value={constituency.seats}
                          onChange={(e) => {
                            const updated = [...constituencies];
                            updated[constIndex].seats = parseInt(e.target.value) || 1;
                            setConstituencies(updated);
                          }}
                          placeholder="Escons"
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => setConstituencies(constituencies.filter((_, i) => i !== constIndex))}
                          disabled={constituencies.length <= 1}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Vots per partit en aquesta circumscripció - OBLIGATORI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pl-4 border-l-4 border-green-200 dark:border-green-800">
                      {parties.map((party) => (
                        <div key={party.id} className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: party.color }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate w-20">
                            {party.shortName}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={constituency.votes[party.id] || ''}
                            onChange={(e) => {
                              const updated = [...constituencies];
                              const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                              updated[constIndex].votes[party.id] = value;
                              setConstituencies(updated);
                            }}
                            placeholder="0"
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Botó per afegir circumscripció */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button
                  onClick={addConstituency}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Afegir Circumscripció
                </button>
              </div>
            </section>

            {/* Botons d'acció */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  // Calcular resultats per totes les circumscripcions
                  const calcResults = calculateAllConstituencies();
                  setResults(calcResults);
                  setActiveTab('results');
                }}
                className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Calcular Resultats
              </button>
              
              <button
                onClick={() => setIsRealTime(!isRealTime)}
                className={`inline-flex items-center px-4 py-3 text-base font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors shadow-sm ${
                  isRealTime 
                    ? 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500' 
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200 focus:ring-gray-500'
                }`}
              >
                {isRealTime ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                Càlcul en temps real {isRealTime ? 'ON' : 'OFF'}
              </button>

              <div className="flex-1"></div>

              <button
                onClick={() => {
                  // Guardar escenari
                  const scenarioName = prompt('Nom de l\'escenari:');
                  if (scenarioName) {
                    const calcResults = calculateAllConstituencies();
                    setScenarios(prev => [...prev, { name: scenarioName, results: calcResults }]);
                  }
                }}
                className="inline-flex items-center px-4 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Save className="w-5 h-5 mr-2" />
                Guardar Escenari
              </button>
            </div>

            {/* Resum */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Resum de la configuració</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{parties.length}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">partits</span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{constituencies.length}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">circumscripcions</span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {constituencies.reduce((sum, c) => sum + c.seats, 0)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">escons totals</span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{threshold}%</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">umbral</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'results':
        // ✅ Calcula seients totals correctament
        const seatsData = parties.map(party => {
          const count = results.reduce((sum, constituency) => {
            const partyRes = constituency.parties.find(pr => pr.partyId === party.id);
            return sum + (partyRes?.seats || 0);
          }, 0);
          return {
            partyId: party.id,
            partyName: party.name,
            color: party.color,
            count
          };
        }).filter(p => p.count > 0);

        const totalSeats = seatsData.reduce((s, p) => s + p.count, 0);

        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Resultats Electorals</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Mètode: <span className="font-medium text-gray-900 dark:text-white">{METHODS.find(m => m.value === method)?.label}</span> | 
                Umbral: <span className="font-medium text-gray-900 dark:text-white">{threshold}%</span> | 
                Escons totals: <span className="font-medium text-gray-900 dark:text-white">{totalSeats}</span>
              </p>
            </div>
            
            {totalSeats > 0 ? (
              <>
                <Hemicycle
                  seats={seatsData}
                  totalSeats={totalSeats}
                />
                
                {/* Taula de resultats detallats */}
                <div className="mt-8 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Escons</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">% Escons</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {seatsData
                        .sort((a, b) => b.count - a.count)
                        .map((party) => {
                          const percentage = totalSeats > 0 ? ((party.count / totalSeats) * 100).toFixed(1) : '0.0';
                          
                          return (
                            <tr key={party.partyId}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div 
                                    className="w-4 h-4 rounded-full mr-3" 
                                    style={{ backgroundColor: party.color }}
                                  />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {party.partyName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-bold">
                                {party.count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {percentage}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Resultats per circumscripció */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resultats per Circumscripció</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((constituency, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">{constituency.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Escons: {constituency.totalSeats} | Vots totals: {constituency.totalVotes.toLocaleString()}
                        </p>
                        <div className="space-y-1">
                          {constituency.parties
                            .sort((a, b) => b.seats - a.seats)
                            .map(party => (
                              <div key={party.partyId} className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: party.color }}
                                  />
                                  <span className="text-gray-700 dark:text-gray-300">{party.partyName}</span>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{party.seats} escons</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                <Calculator className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg text-gray-900 dark:text-white">Encara no hi ha resultats</p>
                <p className="text-sm">Ves a "Configuració" i prem "Calcular Resultats"</p>
              </div>
            )}
          </div>
        );

      case 'whatif':
        return (
          <WhatIfSimulator
            baseParties={parties}
            baseConstituencies={constituencies}
            method={method}
            threshold={threshold}
            onApplyChanges={(updatedParties, updatedConstituencies) => {
              setParties(updatedParties);
              setConstituencies(updatedConstituencies);
            }}
            onSaveScenario={(scenario) => {
              setScenarios(prev => [...prev, scenario]);
            }}
          />
        );

      case 'heatmap':
        // NOU MAPA DE CALOR AMB ÚLTIM ESCÓ I SEGON
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mapa de Calor Electoral</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Visualització de l'últim escó assignat a cada circumscripció i la diferència amb el segon classificat.
            </p>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.map((constituency, idx) => {
                  // Trobar l'últim escó (l'últim a la distribució)
                  const lastSeat = constituency.distribution[constituency.distribution.length - 1];
                  const lastSeatParty = constituency.parties.find(p => p.partyId === lastSeat?.partyId);
                  
                  // Trobar el segon classificat per l'últim escó
                  const sortedParties = [...constituency.parties].sort((a, b) => {
                    // Ordenar per quocient de l'últim escó assignat
                    const aQuotient = a.quotients?.[a.quotients.length - 1] || 0;
                    const bQuotient = b.quotients?.[b.quotients.length - 1] || 0;
                    return bQuotient - aQuotient;
                  });
                  
                  const winner = sortedParties[0];
                  const second = sortedParties[1];
                  
                  // Calcular diferència de vots necessaris per canviar l'escó
                  const winnerQuotient = winner?.quotients?.[winner.quotients.length - 1] || 0;
                  const secondQuotient = second?.quotients?.[second.quotients.length - 1] || 0;
                  const voteDiff = secondQuotient > 0 ? Math.ceil((winnerQuotient - secondQuotient) * (winner?.seats || 1)) : 0;
                  const percentageDiff = winnerQuotient > 0 ? ((winnerQuotient - secondQuotient) / winnerQuotient * 100) : 0;

                  return (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Header amb nom i escons */}
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{constituency.name}</h3>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                          {constituency.totalSeats} escons
                        </span>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Guanyador de l'últim escó */}
                        {winner && (
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Últim escó assignat a</span>
                              <span className="text-xs text-gray-500 dark:text-gray-500">Escó #{constituency.totalSeats}</span>
                            </div>
                            
                            <div className="flex items-center space-x-4 p-4 rounded-lg" style={{ 
                              background: `linear-gradient(135deg, ${winner.color}20 0%, ${winner.color}05 100%)`,
                              borderLeft: `4px solid ${winner.color}`
                            }}>
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                style={{ backgroundColor: winner.color }}
                              >
                                {winner.partyName.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{winner.partyName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {winner.seats} escons totals • Quocient: {winner.quotients?.[winner.quotients.length - 1]?.toFixed(0)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold" style={{ color: winner.color }}>{winner.seats}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">escons</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Segon classificat i diferència */}
                        {second && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Segon classificat</span>
                              <span className="text-xs text-red-500 font-medium">A {voteDiff.toLocaleString()} vots</span>
                            </div>

                            <div className="relative">
                              {/* Barra de progrés amb degradat */}
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                                {/* Part guanyadora */}
                                <div 
                                  className="h-full absolute left-0 top-0 transition-all duration-500"
                                  style={{ 
                                    width: `${100 - percentageDiff}%`,
                                    background: `linear-gradient(90deg, ${winner.color} 0%, ${winner.color}dd 100%)`
                                  }}
                                />
                                {/* Part segon */}
                                <div 
                                  className="h-full absolute right-0 top-0 transition-all duration-500"
                                  style={{ 
                                    width: `${percentageDiff}%`,
                                    background: `linear-gradient(90deg, ${second.color}aa 0%, ${second.color} 100%)`
                                  }}
                                />
                                
                                {/* Marcador de la diferència */}
                                <div 
                                  className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-gray-900 z-10"
                                  style={{ left: `${100 - percentageDiff}%` }}
                                />
                              </div>

                              {/* Labels sota la barra */}
                              <div className="flex justify-between mt-2 text-xs">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: winner.color }} />
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">{winner.partyName}</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-red-500 font-bold">{percentageDiff.toFixed(1)}%</span>
                                  <span className="text-gray-500 dark:text-gray-400 ml-1">de diferència</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">{second.partyName}</span>
                                  <div className="w-2 h-2 rounded-full ml-1" style={{ backgroundColor: second.color }} />
                                </div>
                              </div>
                            </div>

                            {/* Info del segon */}
                            <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: second.color }}
                                >
                                  {second.partyName.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">{second.partyName}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{second.seats} escons • Quocient: {second.quotients?.[second.quotients.length - 1]?.toFixed(0)}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-red-500">-{voteDiff.toLocaleString()}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">vots necessaris</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Resum de tots els partits */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Distribució completa</div>
                          <div className="space-y-2">
                            {constituency.parties
                              .sort((a, b) => b.seats - a.seats)
                              .map((party, pIdx) => (
                                <div key={party.partyId} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: party.color }} />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{party.partyName}</span>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${(party.seats / constituency.totalSeats) * 100}%`,
                                          backgroundColor: party.color
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">{party.seats}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                <MapPin className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg text-gray-900 dark:text-white">Encara no hi ha resultats per mostrar</p>
                <p className="text-sm">Ves a "Configuració", introdueix els vots i prem "Calcular Resultats"</p>
              </div>
            )}
          </div>
        );

      case 'prediction':
        return <PredictionPanel parties={parties} constituencies={constituencies} method={method} threshold={threshold} />;

      case 'stepbystep':
        return <StepByStep result={results[0] ?? { name: '', totalSeats: 0, totalVotes: 0, parties: [], distribution: [] }} />;

      case 'compare':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Comparador de Mètodes Electorals</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Compara com canviarien els resultats amb diferents mètodes electorals aplicats als mateixos vots.
            </p>
            
            {!showComparison ? (
              <button
                onClick={() => {
                  const methods: ElectoralMethod[] = ['dhondt', 'saintelague', 'hare', 'droop', 'imperiali'];
                  const comparisons: Record<ElectoralMethod, ConstituencyResult[]> = {} as any;
                  
                  methods.forEach(m => {
                    // Calcular per totes les circumscripcions amb cada mètode
                    comparisons[m] = constituencies.map(constituency => {
                      const partiesForCalc = parties.map(party => ({
                        partyId: party.id,
                        partyName: party.name,
                        color: party.color,
                        votes: constituency.votes[party.id] || 0
                      })).filter(p => p.votes > 0);

                      if (partiesForCalc.length === 0) {
                        return {
                          name: constituency.name,
                          totalSeats: constituency.seats,
                          totalVotes: 0,
                          parties: [],
                          distribution: []
                        };
                      }

                      const result = calculateElection(
                        partiesForCalc,
                        constituency.seats,
                        m,
                        threshold
                      );
                      
                      return {
                        ...result,
                        name: constituency.name
                      };
                    });
                  });
                  
                  setComparisonResults(comparisons);
                  setShowComparison(true);
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <GitCompare className="w-5 h-5 mr-2" />
                Comparar Mètodes
              </button>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  ← Tornar a comparar
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(comparisonResults).map(([methodKey, methodResults]) => {
                    const methodLabel = METHODS.find(m => m.value === methodKey)?.label || methodKey;
                    const methodDesc = METHODS.find(m => m.value === methodKey)?.description || '';
                    
                    // Calcular totals per partit
                    const partyTotals: Record<string, number> = {};
                    let totalSeats = 0;
                    methodResults.forEach(constituency => {
                      totalSeats += constituency.totalSeats;
                      constituency.parties.forEach(party => {
                        partyTotals[party.partyId] = (partyTotals[party.partyId] || 0) + party.seats;
                      });
                    });
                    
                    return (
                      <div key={methodKey} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{methodLabel}</h3>
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                            {totalSeats} escons
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{methodDesc}</p>
                        
                        {/* Distribució per partit */}
                        <div className="space-y-2">
                          {Object.entries(partyTotals)
                            .sort(([,a], [,b]) => b - a)
                            .map(([partyId, seats]) => {
                              const party = parties.find(p => p.id === partyId);
                              if (!party || seats === 0) return null;
                              const percentage = totalSeats > 0 ? ((seats / totalSeats) * 100).toFixed(1) : '0.0';
                              
                              return (
                                <div key={partyId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                                  <div className="flex items-center">
                                    <div 
                                      className="w-3 h-3 rounded-full mr-2" 
                                      style={{ backgroundColor: party.color }}
                                    />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{party.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{seats}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({percentage}%)</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'export':
        return <ExportPanel results={results} method={method} threshold={threshold} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header amb tabs - FIXAT I MILLORAT */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo o títol */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                BigElecto
              </h1>
            </div>

            {/* Tabs de navegació - SCROLLABLE */}
            <nav className="flex-1 mx-4 overflow-x-auto scrollbar-hide">
              <div className="flex space-x-1 min-w-max">
                {TAB_CONFIG.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 whitespace-nowrap
                        ${isActive 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Botons d'acció (Theme, Login) */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <ThemeToggle />
              {currentUser ? (
                <button 
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <User className="w-4 h-4 mr-2" />
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Espaiador per compensar el header fixe */}
      <div className="h-16"></div>

      {/* Contingut principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[calc(100vh-8rem)]">
          {renderActiveTab()}
        </div>
      </main>

      {/* Modal de Biblioteca de Partits MILLORAT */}
      {showPartyLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Biblioteca de Partits</h2>
              <button 
                onClick={() => {
                  setShowPartyLibrary(false);
                  setSelectedLibraryParties([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <PartyLibrary
                currentParties={parties}
                onSelect={(selectedParties: Array<{ id: string; name: string; shortName: string; color: string; votes: number }>) => setSelectedLibraryParties(selectedParties)}
                onClose={() => {}}
              />
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedLibraryParties.length} partit{selectedLibraryParties.length !== 1 ? 's' : ''} seleccionat{selectedLibraryParties.length !== 1 ? 's' : ''}
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPartyLibrary(false);
                    setSelectedLibraryParties([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel·lar
                </button>
                <button
                  onClick={importSelectedParties}
                  disabled={selectedLibraryParties.length === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Importar seleccionats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={(user) => setCurrentUser(user)}
        />
      )}
      
      {presentationMode && (
        <PresentationMode
          results={results}
          scenarios={scenarios}
          isActive={presentationMode}
          onClose={() => setPresentationMode(false)}
        />
      )}
    </div>
  );
}
