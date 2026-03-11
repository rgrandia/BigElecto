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
        return <div>⚙️ Configuració de partits i circumscripcions</div>;

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
        return <WhatIfSimulator parties={parties} constituencies={constituencies} />;

      case 'heatmap':
        return <ConstituencyHeatmap results={results} />;

      case 'prediction':
        return <PredictionPanel results={results} />;

      case 'history':
        return <ElectionHistory scenarios={scenarios} />;

      case 'stepbystep':
        return <StepByStep results={results} />;

      case 'compare':
        return <div>Comparador de mètodes electorals</div>;

      case 'export':
        return <ExportPanel results={results} />;

      default:
        return null;
    }
  };

  return (
    <div className="simulator-page">
      <header className="tabs">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
        <ThemeToggle />
        {currentUser ? (
          <button onClick={logout}><LogOut size={16} /> Logout</button>
        ) : (
          <button onClick={() => setShowAuthModal(true)}><User size={16} /> Login</button>
        )}
      </header>

      <main className="tab-content">
        {renderActiveTab()}
      </main>

      {showPartyLibrary && <PartyLibrary onClose={() => setShowPartyLibrary(false)} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {presentationMode && <PresentationMode onClose={() => setPresentationMode(false)} />}
    </div>
  );
}
