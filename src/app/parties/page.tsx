'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Trash2, 
  Copy, 
  Edit2, 
  Save, 
  X,
  Search,
  Filter,
  Download,
  Upload,
  Palette
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  description?: string;
  ideology?: string;
  founded?: string;
  logo?: string;
  isDefault?: boolean;
  tags: string[];
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#0ea5e9', '#eab308'
];

const IDEOLOGIES = [
  'Esquerra', 'Centreesquerra', 'Centre', 'Centredreta', 'Dreta',
  'Nacionalista', 'Regionalista', 'Ecologista', 'Liberal', 'Conservador'
];

const DEFAULT_PARTIES: Party[] = [
  { id: 'psoe', name: 'Partit Socialista Obrer Espanyol', shortName: 'PSOE', color: '#ef4444', ideology: 'Centreesquerra', tags: ['espanya', 'històric'] },
  { id: 'pp', name: 'Partit Popular', shortName: 'PP', color: '#3b82f6', ideology: 'Centredreta', tags: ['espanya', 'històric'] },
  { id: 'vox', name: 'Vox', shortName: 'Vox', color: '#10b981', ideology: 'Dreta', tags: ['espanya'] },
  { id: 'sumar', name: 'Sumar', shortName: 'Sumar', color: '#f59e0b', ideology: 'Esquerra', tags: ['espanya'] },
  { id: 'erc', name: 'Esquerra Republicana de Catalunya', shortName: 'ERC', color: '#f97316', ideology: 'Esquerra', tags: ['catalunya', 'nacionalista'] },
  { id: 'junts', name: 'Junts per Catalunya', shortName: 'Junts', color: '#06b6d4', ideology: 'Centredreta', tags: ['catalunya', 'nacionalista'] },
  { id: 'psc', name: 'Partit dels Socialistes de Catalunya', shortName: 'PSC', color: '#ef4444', ideology: 'Centreesquerra', tags: ['catalunya'] },
];

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIdeology, setFilterIdeology] = useState('');
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);

  // Carregar partits del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bigelecto-parties');
    if (saved) {
      setParties(JSON.parse(saved));
    } else {
      setParties(DEFAULT_PARTIES);
    }
  }, []);

  // Guardar canvis
  useEffect(() => {
    if (parties.length > 0) {
      localStorage.setItem('bigelecto-parties', JSON.stringify(parties));
    }
  }, [parties]);

  const saveParty = (party: Party) => {
    if (party.id) {
      // Actualitzar existent
      setParties(parties.map(p => p.id === party.id ? party : p));
    } else {
      // Crear nou
      const newParty = { ...party, id: Date.now().toString() };
      setParties([...parties, newParty]);
    }
    setEditingParty(null);
    setIsCreating(false);
  };

  const deleteParty = (id: string) => {
    setParties(parties.filter(p => p.id !== id));
  };

  const duplicateParty = (party: Party) => {
    const newParty = {
      ...party,
      id: Date.now().toString(),
      name: `${party.name} (còpia)`,
      shortName: `${party.shortName}2`
    };
    setParties([...parties, newParty]);
  };

  const exportParties = () => {
    const data = JSON.stringify(parties, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bigelecto-parties.json';
    a.click();
  };

  const importParties = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setParties([...parties, ...imported]);
        } catch (error) {
          alert('Error al importar el fitxer');
        }
      };
      reader.readAsText(file);
    }
  };

  const filteredParties = parties.filter(party => {
    const matchesSearch = party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.shortName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIdeology = !filterIdeology || party.ideology === filterIdeology;
    return matchesSearch && matchesIdeology;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <span className="text-2xl">←</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Biblioteca de Partits</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cercar partits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterIdeology}
            onChange={(e) => setFilterIdeology(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          >
            <option value="">Totes les ideologies</option>
            {IDEOLOGIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>

          <div className="flex gap-2">
            <button
              onClick={exportParties}
              className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            
            <label className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              <span className="hidden sm:inline">Importar</span>
              <input type="file" accept=".json" onChange={importParties} className="hidden" />
            </label>

            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" />
              Nou Partit
            </button>
          </div>
        </div>

        {/* Grid de partits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredParties.map((party, index) => (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                    style={{ backgroundColor: party.color }}
                  >
                    {party.shortName.slice(0, 2)}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingParty(party)}
                      className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateParty(party)}
                      className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteParty(party.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{party.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{party.shortName}</p>
                
                {party.ideology && (
                  <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-full mb-3">
                    {party.ideology}
                  </span>
                )}

                {party.tags && (
                  <div className="flex flex-wrap gap-1">
                    {party.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Modal d'edició/creació */}
        <AnimatePresence>
          {(editingParty || isCreating) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isCreating ? 'Nou Partit' : 'Editar Partit'}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingParty(null);
                      setIsCreating(false);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <PartyForm
                  party={editingParty || { id: '', name: '', shortName: '', color: PRESET_COLORS[0], tags: [] }}
                  onSave={saveParty}
                  onCancel={() => {
                    setEditingParty(null);
                    setIsCreating(false);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Formulari de partit
function PartyForm({ party, onSave, onCancel }: { party: Party; onSave: (p: Party) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState(party);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(formData);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom complet</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sigles</label>
        <input
          type="text"
          value={formData.shortName}
          onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ideologia</label>
        <select
          value={formData.ideology || ''}
          onChange={(e) => setFormData({ ...formData, ideology: e.target.value })}
          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
        >
          <option value="">Seleccionar...</option>
          {IDEOLOGIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tags (separats per coma)</label>
        <input
          type="text"
          value={formData.tags?.join(', ') || ''}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          placeholder="ex: catalunya, nacionalista, històric"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel·lar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <Save className="w-4 h-4 inline mr-2" />
          Guardar
        </button>
      </div>
    </form>
  );
}
