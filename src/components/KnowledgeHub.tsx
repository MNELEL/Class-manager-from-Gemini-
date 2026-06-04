import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Library, 
  Search, 
  Tag, 
  FileText, 
  Download, 
  Trash2, 
  Plus, 
  FolderOpen, 
  Filter, 
  BookOpen, 
  GraduationCap, 
  Presentation,
  Upload,
  X,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  date: string;
  category: string;
  topic?: string;
  tags?: string[];
  isGlobal?: boolean;
}

interface KnowledgeHubProps {
  documents: Document[];
  onAddDocument: (doc: any) => void;
  onDeleteDocument: (id: string) => void;
  onClose: () => void;
}

export const KnowledgeHub: React.FC<KnowledgeHubProps> = ({ 
  documents, 
  onAddDocument, 
  onDeleteDocument, 
  onClose 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'global' | 'student'>('all');

  const categories = [
    { id: 'all', label: 'הכל', icon: <Library className="w-4 h-4" /> },
    { id: 'pedagogy', label: 'פדגוגיה', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'diagnostics', label: 'אבחונים', icon: <Search className="w-4 h-4" /> },
    { id: 'lesson_plans', label: 'מערכי שיעור', icon: <Presentation className="w-4 h-4" /> },
    { id: 'worksheets', label: 'דפי עבודה', icon: <FileText className="w-4 h-4" /> },
    { id: 'social', label: 'חברתי', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           doc.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'global' && doc.isGlobal) || 
                        (activeTab === 'student' && !doc.isGlobal);
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [documents, searchQuery, activeCategory, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isGlobal: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: Math.round(file.size / 1024),
        date: new Date().toISOString(),
        category: activeCategory === 'all' ? 'pedagogy' : activeCategory,
        isGlobal: isGlobal,
        data: data
      };
      onAddDocument(newDoc);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl flex border border-slate-100 dark:border-slate-800"
      >
        {/* Sidebar Nav */}
        <div className="w-72 border-l border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-brand-600 rounded-[1.25rem] shadow-lg shadow-brand-100">
                <Library className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">מרכז ידע</h2>
            </div>

            <nav className="space-y-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all",
                    activeCategory === cat.id 
                      ? "bg-white dark:bg-slate-800 text-brand-600 shadow-sm border border-slate-100 dark:border-slate-700" 
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-6 space-y-4">
             <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-3xl border border-brand-100 dark:border-brand-800/50">
                <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1">טיפ דיגיטלי</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">ניתן לשייך מסמכים ישירות לתלמיד או לשתף אותם עם כלל הכתה כחומרי עזר כלליים.</p>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
          {/* Header Actions */}
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-8">
             <div className="flex flex-1 items-center gap-4">
                <div className="relative flex-1 max-w-md">
                   <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                   <input 
                      type="text" 
                      placeholder="חיפוש חומרים, סיכומים או קבצים..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-6 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-700 dark:text-slate-200 shadow-inner"
                   />
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1">
                   {[
                     { id: 'all', label: 'הכל' },
                     { id: 'global', label: 'כללי (כתתי)' },
                     { id: 'student', label: 'רלוונטי לתלמיד' },
                   ].map((tab) => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black transition-all",
                          activeTab === tab.id 
                            ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                     >
                       {tab.label}
                     </button>
                   ))}
                </div>
             </div>

             <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-brand-100 cursor-pointer hover:bg-brand-700 transition-all active:scale-95">
                   <Upload className="w-5 h-5" />
                   העלאת מסמך כתתי
                   <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, true)}
                   />
                </label>
                <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-all">
                   <X className="w-5 h-5" />
                </button>
             </div>
          </div>

          {/* Grid View */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             {filteredDocs.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 <AnimatePresence>
                   {filteredDocs.map((doc) => (
                     <motion.div 
                        key={doc.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-4 hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden"
                     >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-50 transition-opacity" />
                        
                        <div className="flex items-start justify-between relative">
                           <div className={cn(
                             "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                             doc.isGlobal ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"
                           )}>
                              {doc.isGlobal ? <FolderOpen className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                           </div>
                           <div className="flex gap-1">
                              {doc.isGlobal && (
                                <span className="bg-amber-100 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">כללי</span>
                              )}
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">{doc.type.split('/')[1] || 'DOC'}</span>
                           </div>
                        </div>

                        <div className="relative">
                           <h4 className="font-black text-slate-800 dark:text-white truncate mb-1" title={doc.name}>{doc.name}</h4>
                           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                              <Tag className="w-3 h-3" />
                              <span>{categories.find(c => c.id === doc.category)?.label || doc.category}</span>
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50 mt-auto relative">
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                 <Clock className="w-3 h-3 text-slate-400" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 tracking-tight">{new Date(doc.date).toLocaleDateString('he-IL')}</span>
                           </div>
                           
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all">
                                 <Download className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => onDeleteDocument(doc.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-200 dark:text-slate-700">
                     <FolderOpen className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-black text-slate-800 dark:text-white">לא נמצאו מסמכים</h3>
                     <p className="text-slate-400 font-bold max-w-sm">נסו לשנות את החיפוש או להעלות מסמך חדש למרכז הידע.</p>
                  </div>
                  <label className="px-8 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.25rem] font-bold text-sm cursor-pointer hover:bg-slate-800 transition-all">
                    העלה מסמך ראשון
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                  </label>
               </div>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
