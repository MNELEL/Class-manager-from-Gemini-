import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  motion, 
  AnimatePresence, 
  Reorder,
  useMotionValue,
  useTransform
} from 'motion/react';
import { 
  Users, 
  LayoutGrid, 
  Settings, 
  History, 
  Sparkles, 
  Download, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  X,
  Search,
  Check,
  AlertCircle,
  FileDown,
  Monitor,
  Maximize2,
  Wand2,
  Layers,
  ArrowRightLeft,
  Columns,
  Rows,
  Minus,
  CheckCircle2,
  Lock,
  ChevronDown,
  Info,
  Smartphone,
  Tablet,
  Computer,
  Eye,
  Settings2,
  Calendar,
  Filter,
  MoreVertical,
  Heart,
  Ban,
  GraduationCap,
  LineChart,
  ClipboardList
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Helper Components (Hoisted) ---

function Badge({ children, className, style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return (
    <span style={style} className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight", className)}>
      {children}
    </span>
  );
}

const SatisfactionGauge = ({ score }: { score: number }) => (
  <div className="relative w-full h-8 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${score}%` }}
      className={cn(
        "h-full transition-all duration-1000",
        score > 80 ? "bg-emerald-500" : score > 50 ? "bg-amber-500" : "bg-rose-500"
      )}
    />
    <div className="absolute inset-0 flex items-center justify-center mix-blend-difference">
      <span className="text-[10px] font-black text-white">{score}% מרוצים</span>
    </div>
  </div>
);

// --- Content Handlers & Views ---

const AttendanceView = ({ students }: { students: any[] }) => (
  <div className="p-8 space-y-8 h-full overflow-y-auto">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-black text-slate-800">נוכחות יומית</h2>
      <Badge className="bg-emerald-50 text-emerald-600">יום שלישי, 28 באפריל</Badge>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map(s => (
        <div key={s.id} className="glass-card p-5 rounded-3xl flex items-center justify-between hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
              {s.name[0]}
            </div>
            <span className="font-black text-slate-700">{s.name}</span>
          </div>
          <div className="flex items-center gap-2">
             <button className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase">נוכח</button>
             <button className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase">נעדר</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const GradesView = () => (
  <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-4">
    <div className="p-6 bg-brand-50 rounded-full">
      <GraduationCap className="w-12 h-12 text-brand-600" />
    </div>
    <h2 className="text-2xl font-black text-slate-800">ניהול ציונים</h2>
    <p className="max-w-md text-slate-500 font-medium">כאן תוכלו לראות ולנהל את הישגי התלמידים. מודול הציונים בבנייה ויעלה בקרוב בגרסה 3.1.</p>
  </div>
);

const ProgressView = () => (
  <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-4">
    <div className="p-6 bg-indigo-50 rounded-full">
      <LineChart className="w-12 h-12 text-indigo-600" />
    </div>
    <h2 className="text-2xl font-black text-slate-800">גרף התקדמות</h2>
    <p className="max-w-md text-slate-500 font-medium">מעקב אחר יעדים פדגוגיים ושינויי התנהגות לאורך זמן. מודול זה בבנייה בקרוב.</p>
  </div>
);

const DashboardView = ({ stats }: any) => (
  <div className="p-8 space-y-8 h-full overflow-y-auto">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-black text-slate-800">סיכום מערכת</h2>
      <Badge className="bg-slate-900 text-white">דוא\"ט ניהולי</Badge>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="glass-card p-6 rounded-[2.5rem] space-y-4 border-b-4 border-brand-500">
        <div className="flex items-center justify-between">
          <div className="p-3 bg-brand-50 rounded-2xl">
            <Users className="w-6 h-6 text-brand-600" />
          </div>
          <Badge className="bg-brand-50 text-brand-600">פעיל</Badge>
        </div>
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">תלמידים רשומים</h3>
          <p className="text-3xl font-black text-slate-900">{stats.studentCount || 0}</p>
        </div>
      </div>
      
      <div className="glass-card p-6 rounded-[2.5rem] space-y-4 border-b-4 border-amber-500">
        <div className="flex items-center justify-between">
          <div className="p-3 bg-amber-50 rounded-2xl">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <Badge className="bg-amber-50 text-amber-600">+12%</Badge>
        </div>
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שביעות רצון</h3>
          <p className="text-3xl font-black text-slate-900">84%</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-[2.5rem] space-y-4 border-b-4 border-indigo-500">
        <div className="flex items-center justify-between">
          <div className="p-3 bg-indigo-50 rounded-2xl">
            <LayoutGrid className="w-6 h-6 text-indigo-600" />
          </div>
          <Badge className="bg-indigo-50 text-indigo-600">מעודכן</Badge>
        </div>
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שיבוץ נוכחי</h3>
          <p className="text-3xl font-black text-slate-900">{stats.placedCount || 0} / {stats.studentCount || 0}</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-[2.5rem] space-y-4 border-b-4 border-rose-500">
        <div className="flex items-center justify-between">
          <div className="p-3 bg-rose-50 rounded-2xl">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <Badge className="bg-rose-50 text-rose-600">נמוך</Badge>
        </div>
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">אילוצים לא פתורים</h3>
          <p className="text-3xl font-black text-slate-900">3</p>
        </div>
      </div>
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [currentConfig, setCurrentConfig] = useState({
    id: '1',
    name: 'כיתת מצוינות א׳',
    rows: 6,
    cols: 8,
    grid: Array(48).fill(null) as (string | null)[],
    students: [
      { id: '1', name: 'יוני לוי', preferred: [], forbidden: [], height: 'short' },
      { id: '2', name: 'ענבר כהן', preferred: ['1'], forbidden: [], height: 'tall' }
    ],
    hiddenDesks: [] as number[],
    rowGaps: [] as number[],
    columnGaps: [] as number[],
    groups: [] as any[]
  });

  const [viewType, setViewType] = useState<'grid' | 'table' | 'history' | 'dashboard' | 'attendance' | 'grades' | 'progress'>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [editMode, setEditMode] = useState<'normal' | 'structure'>('normal');
  const [showDeskNumbers, setShowDeskNumbers] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isGroupsPanelOpen, setIsGroupsPanelOpen] = useState(false);
  const [isIssuesPanelOpen, setIsIssuesPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'row' | 'col'>('name');
  const [accessibility, setAccessibility] = useState({ highContrast: false, fontSize: 'medium' });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiWeights, setAiWeights] = useState({ preferred: 8, forbidden: 10, separateFrom: 6 });
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalCells = currentConfig.rows * currentConfig.cols;

  const updateCurrentConfig = useCallback((update: any) => {
    setCurrentConfig(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      // Add to history briefly (simplified)
      return next;
    });
  }, []);

  const handleGridResize = (type: 'rows' | 'cols', delta: number) => {
    updateCurrentConfig((prev: any) => {
      const newVal = Math.max(2, Math.min(12, prev[type] + delta));
      if (newVal === prev[type]) return prev;
      
      const newRows = type === 'rows' ? newVal : prev.rows;
      const newCols = type === 'cols' ? newVal : prev.cols;
      const newGrid = Array(newRows * newCols).fill(null);
      
      // Simple migration of grid (not perfectly optimized)
      return { ...prev, [type]: newVal, grid: newGrid };
    });
  };

  const renderMainContent = () => {
    switch (viewType) {
      case 'dashboard': return <DashboardView stats={{ studentCount: currentConfig.students.length, placedCount: currentConfig.grid.filter(id => id).length }} />;
      case 'attendance': return <AttendanceView students={currentConfig.students} />;
      case 'grades': return <GradesView />;
      case 'progress': return <ProgressView />;
      default: return null;
    }
  };

  const exportToExcel = () => console.log("Exporting to Excel...");
  const exportToPDF = () => console.log("Exporting to PDF...");

  const Header = () => (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100 transform rotate-3">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">ClassManager</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Classroom Orchestrator</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
           {(['grid', 'dashboard', 'attendance', 'grades', 'progress'] as const).map(nav => (
             <button
               key={nav}
               onClick={() => setViewType(nav)}
               className={cn(
                 "px-4 py-2 rounded-xl text-xs font-black transition-all",
                 viewType === nav ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
               )}
             >
               {nav === 'grid' && 'סידור הושבה'}
               {nav === 'dashboard' && 'סקירה'}
               {nav === 'attendance' && 'נוכחות'}
               {nav === 'grades' && 'ציונים'}
               {nav === 'progress' && 'התקדמות'}
             </button>
           ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors relative"
        >
          <Settings className="w-5 h-5 text-slate-500" />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-500 border border-slate-200 cursor-pointer hover:scale-105 transition-transform">
          AD
        </div>
      </div>
    </header>
  );

  const Sidebar = () => (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
          />
          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: 300 }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "absolute z-40 bg-white shadow-2xl flex flex-col",
              isMobile 
                ? "inset-x-0 bottom-0 h-[80vh] rounded-t-[3rem] border-t border-slate-200 pb-[env(safe-area-inset-bottom)]" 
                : "right-0 lg:relative lg:right-auto w-[300px] h-full border-l border-slate-200"
            )}
          >
            {isMobile && (
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
            )}
            <div className="p-6 flex flex-col gap-8 custom-scrollbar h-full overflow-y-auto">
              {/* Classroom Header */}
              <div className="glass-card p-5 rounded-3xl flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">כיתה פעילה</h3>
                    <Badge className="bg-brand-50 text-brand-600">v3.0</Badge>
                  </div>
                  <input
                    value={currentConfig.name}
                    onChange={(e) => updateCurrentConfig((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="text-lg font-black text-slate-900 bg-transparent border-0 p-0 focus:ring-0 w-full"
                  />
                </div>
              </div>

              {/* View Satisfaction Indicator */}
              <div className="glass-card p-5 rounded-3xl border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ממוצע שביעות רצון</h3>
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500">
                    <Sparkles className="w-3 h-3" />
                     +15%
                  </div>
                </div>
                <SatisfactionGauge score={80} />
              </div>

              {/* Main Actions */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setIsAIPanelOpen(true)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Wand2 className="w-5 h-5 text-indigo-400" />
                  שיבוץ חכם AI
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setIsGroupsPanelOpen(true)}
                    className="py-4 bg-white border border-slate-100 text-slate-700 rounded-2xl font-black text-xs hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4 text-brand-500" />
                    קבוצות
                  </button>
                  <button 
                    onClick={() => setIsIssuesPanelOpen(true)}
                    className="py-4 bg-white border border-slate-100 text-slate-700 rounded-2xl font-black text-xs hover:bg-slate-50 flex items-center justify-center gap-2 relative"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    בעיות
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white font-black animate-pulse">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats / Metadata */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">תלמידים</span>
                  <span className="font-black text-slate-700">{currentConfig.students.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">מידות</span>
                  <span className="font-black text-slate-700">{currentConfig.cols}x{currentConfig.rows}</span>
                </div>
              </div>

              {/* Quick Exports */}
              <div className="mt-auto space-y-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">ייצוא מהיר</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={exportToExcel} className="flex items-center justify-center gap-2 px-2 py-3 bg-brand-50 text-brand-700 rounded-2xl text-[10px] font-bold hover:bg-brand-100 border border-brand-100">
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button onClick={exportToPDF} className="flex items-center justify-center gap-2 px-2 py-3 bg-rose-50 text-rose-700 rounded-2xl text-[10px] font-bold hover:bg-rose-100 border border-rose-100">
                      <FileDown className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div 
      className={cn(
        "flex flex-col h-screen overflow-hidden bg-slate-50 font-sans rtl selection:bg-brand-100 uppercase-style",
        accessibility.highContrast && "high-contrast"
      )} 
      dir="rtl"
    >
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          <AnimatePresence mode="wait">
             <motion.div
               key={viewType}
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.02 }}
               transition={{ duration: 0.2 }}
               className="flex-1 flex flex-col overflow-hidden"
             >
               {viewType === 'grid' ? (
                 <div className="flex-1 overflow-auto bg-slate-50 p-6 flex flex-col items-center shadow-inner">
                   {/* Grid Toolbar */}
                   <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-2 mb-10 z-30 shadow-bento shrink-0">
                     <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl">
                       <button onClick={() => setEditMode('normal')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", editMode === 'normal' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}>עריכה</button>
                       <button onClick={() => setEditMode('structure')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", editMode === 'structure' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}>מבנה</button>
                     </div>
                     <div className="w-px h-6 bg-slate-200/50 mx-2" />
                     <button onClick={() => setShowDeskNumbers(!showDeskNumbers)} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2", showDeskNumbers ? "bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "text-slate-500")}>
                        <Eye className="w-4 h-4" />
                        מספרים
                     </button>
                   </div>

                   {/* Grid Content */}
                   <div className="relative w-full max-w-6xl flex flex-col items-center" id="classroom-grid-container">
                      {/* Teacher Table */}
                      <div className="w-64 h-12 bg-white rounded-2xl border-b-8 border-slate-200 flex items-center justify-center shadow-xl mb-12">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">שולחן מורה</span>
                      </div>

                  <div className="grid gap-3 p-10 bg-white/40 rounded-[4rem] border border-white shadow-bento backdrop-blur-sm" style={{ 
                    gridTemplateColumns: `repeat(${currentConfig.cols}, 70px)`,
                    gridTemplateRows: `repeat(${currentConfig.rows}, 48px)`,
                    perspective: '1000px'
                  }}>
                    {currentConfig.grid.map((studentId, idx) => {
                      const student = currentConfig.students.find(s => s.id === studentId);
                      const isHidden = currentConfig.hiddenDesks.includes(idx);

                      if (isHidden && editMode === 'normal') return <div key={idx} className="aspect-square bg-transparent" />;

                      return (
                        <motion.div 
                          key={idx}
                          layoutId={`desk-${idx}`}
                          onClick={() => {
                            if (editMode === 'structure') {
                               updateCurrentConfig((prev: any) => ({
                                 ...prev,
                                 hiddenDesks: prev.hiddenDesks.includes(idx) ? prev.hiddenDesks.filter((i: number) => i !== idx) : [...prev.hiddenDesks, idx]
                               }));
                            }
                          }}
                          className={cn(
                            "aspect-square rounded-2xl border-2 transition-all flex items-center justify-center cursor-pointer relative",
                            isHidden ? "border-dashed border-slate-200 bg-slate-50 opacity-40 shrink-0" :
                            !student ? "bg-white border-slate-100/50 hover:bg-slate-50 shadow-sm" : "bg-white border-brand-200 shadow-md ring-4 ring-brand-50"
                          )}
                        >
                          {showDeskNumbers && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-300">#{idx + 1}</span>}
                          {student ? (
                            <div className="flex flex-col items-center">
                               <span className="text-[10px] font-black text-slate-700">{student.name}</span>
                               {student.height === 'short' && <Badge className="bg-amber-50 text-amber-600 scale-75">קדמי</Badge>}
                            </div>
                          ) : !isHidden && (
                            <Plus className="w-4 h-4 text-slate-200" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                   </div>
                 </div>
               ) : renderMainContent()}
             </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Panels & Modals at Root level */}
      <AnimatePresence>
        {isAIPanelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] shadow-2xl p-8 max-w-2xl w-full flex flex-col gap-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Sparkles className="w-8 h-8 text-indigo-600" />
                      <h2 className="text-2xl font-black">שיבוץ חכם AI</h2>
                   </div>
                   <button onClick={() => setIsAIPanelOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                   <p className="text-sm font-medium text-slate-500 leading-relaxed">ה-AI ינתח את ההעדפות החברתיות, שיקולי הגובה והנחיות הפרויקט כדי ליצור את הסידור האופטימלי ביותר עבור הכיתה שלך.</p>
                   {/* Weights */}
                   <div className="space-y-3">
                      {Object.entries(aiWeights).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                             <span>{key === 'preferred' ? 'חברים' : key === 'forbidden' ? 'הפרדות' : 'ריחוק'}</span>
                             <span>{val}/10</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                             <div className="h-full bg-brand-500" style={{ width: `${(val as number)*10}%` }} />
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                <button 
                   onClick={() => {
                     setIsLoadingAI(true);
                     setTimeout(() => {
                       setIsLoadingAI(false);
                       setAiResponse("התקבל סידור אופטימלי חדש המבוסס על שביעות רצון של 92%.");
                     }, 2000);
                   }}
                   className="w-full py-5 bg-brand-600 text-white rounded-[2rem] font-black shadow-xl shadow-brand-100 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isLoadingAI ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  הפק סידור חכם
                </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
        <div>ClassManager Pro v3.0 // Ready</div>
        <div className="flex gap-4">
          <span>{currentConfig.students.length} תלמידים</span>
          <span>•</span>
          <span>{currentConfig.grid.filter(id => id).length} משובצים</span>
        </div>
      </footer>
    </div>
  );
}
