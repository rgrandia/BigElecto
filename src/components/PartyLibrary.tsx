'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Users, Check } from 'lucide-react';

interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  ideology?: string;
  tags?: string[];
}

interface PartyLibraryProps {
  onSelect: (parties: Party[]) => void;
  onClose: () => void;
  currentParties: Party[];
}

const DEFAULT_PARTIES: Party[] = [
  { id: 'psoe', name: 'Partit Socialista Obrer Espanyol', shortName: 'PSOE', color: '#ef4444', ideology: 'Centreesquerra', tags: ['espanya', 'històric'] },
  { id: 'pp', name: 'Partit Popular', shortName: 'PP', color: '#3b82f6', ideology: 'Centredreta', tags: ['espanya', 'històric'] },
  { id: 'vox', name: 'Vox', shortName: 'Vox', color: '#10b981', ideology: 'Dreta', tags: ['espanya'] },
  { id: 'sumar', name: 'Sumar', shortName: 'Sumar', color: '#f59e0b', ideology: 'Esquerra', tags: ['espanya'] },
  { id: 'erc', name: 'Esquerra Republicana de Catalunya', shortName: 'ERC', color: '#f97316', ideology: 'Esquerra', tags: ['catalunya', 'nacionalista'] },
  { id: 'junts', name: 'Junts per Catalunya', shortName: 'Junts', color: '#06b6d4', ideology: 'Centredreta', tags: ['catalunya', 'nacionalista'] },
  { id: 'psc', name: 'Partit dels Socialistes de Catalunya', shortName: 'PSC', color: '#ef4444', ideology: 'Centreesquerra', tags: ['catalunya'] },
  { id: 'cup', name: 'Candidatura d\'Unitat Popular', shortName: 'CUP', color: '#fbbf24', ideology: 'Esquerra', tags: ['catalunya', 'nacionalista'] },
  { id: 'cs', name: 'Ciutadans', shortName: 'Cs', color: '#f97316', ideology: 'Centre', tags: ['espanya'] },
  { id: 'podemos', name: 'Podemos', shortName: 'Podemos', color: '#8b5cf6', ideology: 'Esquerra', tags: ['espanya'] },
];

export default function PartyLibrary({ onSelect, onClose, currentParties }: PartyLibraryProps) {
  const [savedParties, setSavedParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'default' | 'saved'>('default');

  useEffect(() => {
    const saved = localStorage.getItem('bigelecto-parties');
    if (saved) {
      setSavedParties(JSON.parse(saved));
    }
  }, []);

  const parties = activeTab === 'default' ? DEFAULT_PARTIES : savedParties;

  const filteredParties = parties.filter(party => {
    const matchesSearch = party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         party.tags?.some(t => t.includes(searchTerm.toLowerCase()));
    const notAlreadyAdded = !currentParties.some(cp => cp.id === party.id);
    return matchesSearch && notAlreadyAdded;
  });

  const toggleSelection = (partyId: string) => {
    setSelectedParties(prev => 
      prev.includes(partyId) 
        ? prev.filter(id => id !== partyId)
        : [...prev, partyId]
    );
  };

  const handleImport = () => {
    const toImport = parties.filter(p => selectedParties.includes(p.id));
    onSelect(toImport.map(p => ({ ...p, id: Date.now().toString() + Math.random() }))); // Nou ID per evitar conflictes
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-500" />
              Biblioteca de Partits
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('default')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'default'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Predefinits
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'saved'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Meus partits
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cercar partits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Party list */}
        <div className="overflow-y-auto max-h-96 p-6 space-y-3">
          {filteredParties.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No s'han trobat partits</p>
            </div>
          ) : (
            filteredParties.map((party) => (
              <motion.button
                key={party.id}
                onClick={() => toggleSelection(party.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  selectedParties.includes(party.id)
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-xl shadow-md flex-shrink-0"
                  style={{ backgroundColor: party.color }}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {party.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>{party.shortName}</span>
                    {party.ideology && (
                      <>
                        <span>•</span>
                        <span>{party.ideology}</span>
                      </>
                    )}
                  </div>
                  {party.tags && (
                    <div className="flex gap-1 mt-1">
                      {party.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs rounded text-slate-600 dark:text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {selectedParties.includes(party.id) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </motion.button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white">{selectedParties.length}</span> partits seleccionats
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleImport}
                disabled={selectedParties.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Afegir {selectedParties.length > 0 && `(${selectedParties.length})`}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
