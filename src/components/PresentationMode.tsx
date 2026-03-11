'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { ConstituencyResult } from '@/lib/calculations/electoralMethods';
import Hemicycle from './Hemicycle';

interface PresentationModeProps {
  results: ConstituencyResult[];
  scenarios: { name: string; results: ConstituencyResult[] }[];
  isActive: boolean;
  onClose: () => void;
}

export default function PresentationMode({ results, scenarios, isActive, onClose }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides = [
    { type: 'title', title: 'Resultats Electorals' },
    { type: 'hemicycle', data: results },
    ...scenarios.map(s => ({ type: 'scenario', ...s })),
    { type: 'summary', data: results }
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, slides.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentSlide(p => Math.min(slides.length - 1, p + 1));
      if (e.key === 'ArrowLeft') setCurrentSlide(p => Math.max(0, p - 1));
      if (e.key === ' ') setIsPlaying(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, slides.length, onClose]);

  if (!isActive) return null;

  const current = slides[currentSlide];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
    >
      {/* Barra de controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentSlide(p => Math.max(0, p - 1))}
            disabled={currentSlide === 0}
            className="p-2 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <span className="text-white/70 font-medium">
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrentSlide(p => Math.min(slides.length - 1, p + 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-2 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Sortir
          </button>
        </div>
      </div>

      {/* Contingut */}
      <div className="flex-1 flex items-center justify-center p-12">
        <AnimatePresence mode="wait">
          {current.type === 'title' && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="text-center"
            >
              <h1 className="text-7xl font-bold text-white mb-6">{current.title}</h1>
              <p className="text-2xl text-white/60">Simulació Electoral</p>
            </motion.div>
          )}

          {current.type === 'hemicycle' && current.data && (
            <motion.div
              key="hemicycle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="w-full max-w-6xl"
            >
              <Hemicycle
                seats={current.data.reduce((acc: any[], r: ConstituencyResult) => {
                  r.parties.forEach((p: any) => {
                    const existing = acc.find(a => a.partyId === p.partyId);
                    if (existing) existing.count += p.seats;
                    else acc.push({ partyId: p.partyId, partyName: p.partyName, color: p.color, count: p.seats });
                  });
                  return acc;
                }, [])}
                totalSeats={current.data.reduce((sum: number, r: ConstituencyResult) => sum + r.totalSeats, 0)}
              />
            </motion.div>
          )}

          {current.type === 'scenario' && (
            <motion.div
              key={current.name}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="text-center"
            >
              <h2 className="text-5xl font-bold text-white mb-8">{current.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {current.results && current.results.reduce((acc: any[], r: ConstituencyResult) => {
                  r.parties.forEach((p: any) => {
                    const existing = acc.find(a => a.partyId === p.partyId);
                    if (existing) existing.seats += p.seats;
                    else acc.push({ ...p, seats: p.seats });
                  });
                  return acc;
                }, []).sort((a: any, b: any) => b.seats - a.seats).map((party: any, idx: number) => (
                  <motion.div
                    key={party.partyId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/10 backdrop-blur rounded-2xl p-6"
                  >
                    <div 
                      className="w-16 h-16 rounded-full mx-auto mb-4"
                      style={{ backgroundColor: party.color }}
                    />
                    <h3 className="text-xl font-bold text-white mb-2">{party.partyName}</h3>
                    <p className="text-4xl font-bold text-white">{party.seats} escons</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Barra de progrés */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <motion.div
          className="h-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
