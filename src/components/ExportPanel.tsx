'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  FileText, 
  Share2,
  Copy,
  Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ConstituencyResult } from '@/lib/calculations/electoralMethods';

interface ExportPanelProps {
  results: ConstituencyResult[];
  method: string;
  threshold: number;
}

export default function ExportPanel({ results, method, threshold }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);

  const totalSeats = results.reduce((sum, r) => sum + r.totalSeats, 0);
  const aggregatedResults = results.reduce((acc, constituency) => {
    constituency.parties.forEach(p => {
      if (!acc[p.partyId]) {
        acc[p.partyId] = { ...p, seats: 0 };
      }
      acc[p.partyId].seats += p.seats;
    });
    return acc;
  }, {} as Record<string, any>);

  const sortedResults = Object.values(aggregatedResults).sort((a: any, b: any) => b.seats - a.seats);

  const exportJSON = () => {
    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        method,
        threshold,
        totalSeats,
        totalVotes: results.reduce((sum, r) => sum + r.totalVotes, 0)
      },
      constituencies: results,
      summary: sortedResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bigelecto-resultats-${Date.now()}.json`;
    a.click();
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Fulla de resum
    const summaryData = sortedResults.map((p: any) => ({
      Partit: p.partyName,
      Vots: p.votes,
      'Percentatge Vots': `${((p.votes / results.reduce((sum, r) => sum + r.totalVotes, 0)) * 100).toFixed(2)}%`,
      Escons: p.seats,
      'Percentatge Escons': `${((p.seats / totalSeats) * 100).toFixed(2)}%`
    }));
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resum');
    
    // Fulla per circumscripció
    results.forEach((constituency, idx) => {
      const consData = constituency.parties.map(p => ({
        Partit: p.partyName,
        Vots: p.votes,
        Escons: p.seats,
        Quocient: p.quotients?.[0] || 0
      }));
      
      const wsCons = XLSX.utils.json_to_sheet(consData);
      XLSX.utils.book_append_sheet(wb, wsCons, constituency.name || `Circumscripció ${idx + 1}`);
    });
    
    XLSX.writeFile(wb, `bigelecto-resultats-${Date.now()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Títol
    doc.setFontSize(20);
    doc.text('BigElecto - Resultats Electorals', 14, 20);
    
    // Metadata
    doc.setFontSize(12);
    doc.text(`Mètode: ${method}`, 14, 35);
    doc.text(`Llindar: ${threshold}%`, 14, 42);
    doc.text(`Data: ${new Date().toLocaleDateString('ca-ES')}`, 14, 49);
    
    // Taula de resultats
    const tableData = sortedResults.map((p: any) => [
      p.partyName,
      p.votes.toLocaleString('ca-ES'),
      `${((p.votes / results.reduce((sum, r) => sum + r.totalVotes, 0)) * 100).toFixed(2)}%`,
      p.seats,
      `${((p.seats / totalSeats) * 100).toFixed(2)}%`
    ]);
    
    autoTable(doc, {
      head: [['Partit', 'Vots', '% Vots', 'Escons', '% Escons']],
      body: tableData,
      startY: 60,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`bigelecto-resultats-${Date.now()}.pdf`);
  };

  const copyShareLink = () => {
    // En una app real, generaríem un ID únic i guardaríem a la BD
    const data = btoa(JSON.stringify({ results, method, threshold }));
    const url = `${window.location.origin}/shared?data=${data}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportOptions = [
    {
      id: 'json',
      label: 'JSON',
      description: 'Dades completes per importar',
      icon: FileJson,
      color: 'bg-blue-500',
      action: exportJSON
    },
    {
      id: 'excel',
      label: 'Excel',
      description: 'Full de càlcul amb taules',
      icon: FileSpreadsheet,
      color: 'bg-green-500',
      action: exportExcel
    },
    {
      id: 'pdf',
      label: 'PDF',
      description: 'Informe professional',
      icon: FileText,
      color: 'bg-red-500',
      action: exportPDF
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exportOptions.map((option) => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={option.action}
            className="flex items-center gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all text-left"
          >
            <div className={`w-14 h-14 ${option.color} rounded-xl flex items-center justify-center shadow-lg`}>
              <option.icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{option.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Compartir */}
      <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-3">
          <Share2 className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-purple-900 dark:text-purple-100">Compartir escenari</h3>
        </div>
        <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
          Copia un enllaç per compartir aquest escenari amb altres persones.
        </p>
        <button
          onClick={copyShareLink}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiat!' : 'Copiar enllaç'}
        </button>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Vista prèvia</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2 text-left">Partit</th>
                <th className="px-4 py-2 text-right">Vots</th>
                <th className="px-4 py-2 text-right">Escons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {(sortedResults as any[]).slice(0, 5).map(party => (
                <tr key={party.partyId}>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: party.color }}
                    />
                    <span className="text-slate-700 dark:text-slate-300">{party.partyName}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                    {party.votes.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white">
                    {party.seats}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
