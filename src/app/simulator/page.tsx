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
  History
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

// --- Configuració tabs ---
const TAB_CONFIG = [
  { id: 'setup', label: 'Configuració', icon: Settings },
  { id: 'results', label: 'Resultats', icon: Calculator },
  { id: 'whatif', label: 'Què passaria si', icon: Zap },
  { id: 'heatmap', label: 'Mapa de calor', icon: MapPin },
  { id: 'prediction', label: 'Predicció', icon: TrendingUp },
  { id: 'history', label: 'Històric', icon: History },
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
  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Record<ElectoralMethod, ConstituencyResult[]>>({} as any);
  const [isRealTime, setIsRealTime] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [showPartyLibrary, setShowPartyLibrary] = useState(false);
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

  // --- Render Tabs ---
  const renderActiveTab = () => {
    switch(activeTab) {
      case 'setup':
        return <div className="p-6 text-gray-700 dark:text-gray-200">⚙️ Configuració de partits i circumscripcions</div>;

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
        });

        return (
          <Hemicycle
            seats={seatsData}
            totalSeats={seatsData.reduce((s, p) => s + p.count, 0)}
          />
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
        return <ConstituencyHeatmap results={results} constituencies={constituencies} />;

      case 'prediction':
        return <PredictionPanel parties={parties} constituencies={constituencies} method={method} threshold={threshold} />;

      case 'history':
        return <ElectionHistory currentResults={results} />;

      case 'stepbystep':
        return <StepByStep result={results[0] ?? { name: '', totalSeats: 0, totalVotes: 0, parties: [], distribution: [] }} />;

      case 'compare':
        return <div className="p-6 text-gray-700 dark:text-gray-200">Comparador de mètodes electorals</div>;

      case 'export':
        return <ExportPanel results={results} method={method} threshold={threshold} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header amb tabs */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo o títol */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                BigElecto
              </h1>
            </div>

            {/* Tabs de navegació */}
            <nav className="flex space-x-1 overflow-x-auto">
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
            </nav>

            {/* Botons d'acció (Theme, Login) */}
            <div className="flex items-center space-x-3">
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

      {/* Contingut principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[600px]">
          {renderActiveTab()}
        </div>
      </main>

      {/* Modals */}
      {showPartyLibrary && (
        <PartyLibrary
          currentParties={parties}
          onSelect={(selectedParties) => setParties(prev => [...prev, ...selectedParties.map(p => ({ ...p, votes: 0 }))])}
          onClose={() => setShowPartyLibrary(false)}
        />
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
