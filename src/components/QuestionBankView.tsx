import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, Search, Filter, BookOpen, Download, 
  Printer, ChevronRight, CheckCircle2 
} from 'lucide-react';

export const QuestionBankView = ({ onBack, currentConfig }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Use Worksheets from Library or just mock for now
  const savedWorksheets = currentConfig.libraryItems?.filter((i: any) => i.type === 'worksheet' || i.source_type === 'worksheet') || [
    { id: '1', title: 'שברים פשוטים ועשרוניים', subject: 'מתמטיקה', difficulty: 'בינוני', numQuestions: 10, type: 'worksheet' },
    { id: '2', title: 'מלכים א פרק יא', subject: 'תנ״ך', difficulty: 'קשה', numQuestions: 5, type: 'worksheet' },
    { id: '3', title: 'כוח הכבידה', subject: 'מדעים', difficulty: 'קל', numQuestions: 8, type: 'worksheet' },
  ];

  const filtered = savedWorksheets.filter((w: any) => w.title.includes(searchTerm) || w.subject.includes(searchTerm));

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-6 h-full overflow-y-auto no-scrollbar pb-32">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm hover:bg-slate-100 transition-all hover:scale-105 active:scale-90 cursor-pointer">
          <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" />
            בנק שאלות
          </h2>
          <p className="text-slate-500 font-medium mt-1">רשימת דפי העבודה והשאלות השמורים.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-border flex items-center gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="חפש דפי עבודה לפי נושא או מקצוע..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-primary hover:bg-primary/10 transition-all hover:scale-105 active:scale-95 cursor-pointer">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((item: any) => {
          const isSelected = selectedId === item.id;
          return (
            <div 
              key={item.id} 
              onClick={() => setSelectedId(isSelected ? null : item.id)}
              className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 shadow-sm transition-all duration-200 group flex flex-col h-full cursor-pointer ${
                isSelected 
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/5 scale-[1.015] shadow-md'
                  : 'border-border hover:border-slate-300 dark:hover:border-slate-700 hover:scale-[1.01]'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 inner-shadow transition-colors ${
                isSelected ? 'bg-primary text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'
              }`}>
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-2 mb-6">
                <h3 className="font-bold text-xl text-slate-800 dark:text-white line-clamp-2 flex items-center gap-2">
                  <span>{item.title}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />}
                </h3>
                <p className="text-slate-500 font-medium text-sm">מקצוע: {item.subject}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-xs font-bold">
                    {item.numQuestions} שאלות
                  </span>
                  <span className="px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-xs font-bold">
                    קושי: {item.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-4 border-t border-border mt-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => window.print()} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer">
                  <Printer className="w-4 h-4" /> הדפס
                </button>
                <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center p-12 text-slate-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">לא נמצאו דפי עבודה תואמים לחיפוש.</p>
        </div>
      )}
    </div>
  );
};
