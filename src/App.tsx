import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  UserPlus,
  School,
  ClipboardList,
  Upload
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
      <span className="text-sm font-black text-white">{score}% מרוצים</span>
    </div>
  </div>
);

// --- Helper Components ---

const DeskCell = ({ 
  idx, 
  studentId, 
  student, 
  isHidden, 
  editMode, 
  colPos, 
  rowPos, 
  showDeskNumbers,
  draggedStudentId,
  onDrop,
  updateCurrentConfig,
  currentConfig,
  onShowHistory
}: any) => {
  const [isOver, setIsOver] = useState(false);
  const draggingS = currentConfig.students.find((s: any) => s.id === draggedStudentId);
  const isCompatible = draggingS && draggingS.height === 'short' ? Math.floor(idx / currentConfig.cols) < 2 : true;
  const compatibilityClass = isOver ? (isCompatible ? "bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100" : "bg-rose-50 border-rose-300 ring-4 ring-rose-100") : "";

  if (isHidden && editMode === 'normal') return <div style={{ gridColumn: colPos, gridRow: rowPos }} className="aspect-square bg-transparent" />;

  return (
    <motion.div 
      layoutId={`desk-${idx}`}
      style={{ gridColumn: colPos, gridRow: rowPos }}
      onDragOver={(e) => { e.preventDefault(); !isHidden && setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => { 
        setIsOver(false); 
        if (!isHidden) onDrop(idx); 
      }}
      onClick={() => {
        if (editMode === 'structure') {
           updateCurrentConfig((prev: any) => ({
             ...prev,
             hiddenDesks: prev.hiddenDesks.includes(idx) ? prev.hiddenDesks.filter((i: number) => i !== idx) : [...prev.hiddenDesks, idx]
           }));
        } else if (!isHidden) {
          onShowHistory(idx);
        }
      }}
      className={cn(
        "aspect-square rounded-[2rem] border transition-all flex flex-col items-center justify-center cursor-pointer relative group",
        isHidden ? "border-dashed border-slate-100 bg-slate-50/50 opacity-30 shrink-0" :
        !student ? "bg-slate-50/30 border-slate-100 hover:bg-slate-50" : "bg-white border-brand-100 shadow-sm ring-2 ring-brand-50",
        compatibilityClass
      )}
    >
      {/* Desk Surface Visualization */}
      {!isHidden && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      )}
      
      {showDeskNumbers && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-black text-slate-400">#{idx + 1}</span>}
      
      {student ? (
        <div className="flex flex-col items-center gap-1">
           {/* Chair Backrest Icon */}
           <div className="w-8 h-6 bg-slate-100 rounded-t-lg -mb-2 z-0 border border-slate-200 shadow-inner flex items-center justify-center">
             <div className="w-4 h-1 bg-slate-200 rounded-full" />
           </div>
           
           <div className="z-10 flex flex-col items-center bg-white px-4 py-1.5 rounded-full border-2 border-brand-100 shadow-md relative">
             <span className="text-base font-bold text-slate-900">{student.name}</span>
             {student.height === 'short' && <Badge className="bg-amber-100 text-amber-800 font-black scale-[0.85] -my-1">קדמי</Badge>}
             
             {/* Group Dot Indicators */}
             {student.groups && student.groups.length > 0 && (
               <div className="absolute -top-1 -right-1 flex gap-0.5">
                 {student.groups.map((g: string, i: number) => (
                   <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500 border border-white" title={`קבוצה ${g}`} />
                 ))}
               </div>
             )}
           </div>
           
           {/* Desk Shadow Area */}
           <div className="w-10 h-1 bg-slate-200/50 rounded-full blur-[1px] mt-1" />
           
           <button 
              onClick={(e) => {
                e.stopPropagation();
                updateCurrentConfig((prev: any) => {
                  const newGrid = [...prev.grid];
                  newGrid[idx] = null;
                  return { ...prev, grid: newGrid };
                });
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm z-30"
            >
              <X className="w-3 h-3" />
            </button>
            
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-xl z-50">
              לחץ לצפייה בהיסטוריה
            </div>
        </div>
      ) : !isHidden && (
        <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-50 transition-opacity">
           <LayoutGrid className="w-6 h-6 text-slate-400" />
           <Plus className="w-3 h-3 text-slate-400" />
        </div>
      )}

      {isOver && isHidden && (
         <div className="absolute inset-0 bg-rose-500/10 rounded-2xl flex items-center justify-center">
            <Ban className="w-6 h-6 text-rose-500 opacity-40" />
         </div>
      )}
    </motion.div>
  );
};

// --- Content Handlers & Views ---

const AttendanceView = ({ students }: { students: any[] }) => (
  <div className="p-8 space-y-8 h-full overflow-y-auto">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-black text-slate-700">נוכחות יומית</h2>
      <Badge className="bg-emerald-50 text-emerald-600">יום שלישי, 28 באפריל</Badge>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((s, idx) => (
        <div key={`${s.id}-${idx}`} className="glass-card p-5 rounded-3xl flex items-center justify-between hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
              {s.name[0]}
            </div>
            <span className="text-xl font-bold text-slate-800">{s.name}</span>
          </div>
          <div className="flex items-center gap-2">
             <button className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-black uppercase">נוכח</button>
             <button className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-black uppercase">נעדר</button>
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
    <h2 className="text-2xl font-black text-slate-700">ניהול ציונים</h2>
    <p className="max-w-md text-slate-500 font-medium">כאן תוכלו לראות ולנהל את הישגי התלמידים. מודול הציונים בבנייה ויעלה בקרוב בגרסה 3.1.</p>
  </div>
);

const ProgressView = () => (
  <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-4">
    <div className="p-6 bg-indigo-50 rounded-full">
      <LineChart className="w-12 h-12 text-indigo-600" />
    </div>
    <h2 className="text-2xl font-black text-slate-700">גרף התקדמות</h2>
    <p className="max-w-md text-slate-500 font-medium">מעקב אחר יעדים פדגוגיים ושינויי התנהגות לאורך זמן. מודול זה בבנייה בקרוב.</p>
  </div>
);

const DashboardView = ({ stats }: any) => (
  <div className="p-8 space-y-8 h-full overflow-y-auto">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-black text-slate-700">סיכום מערכת</h2>
      <Badge className="bg-brand-100 text-brand-700 border-brand-200">דוא"ט ניהולי</Badge>
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
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">תלמידים רשומים</h3>
          <p className="text-3xl font-black text-slate-800">{stats.studentCount || 0}</p>
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
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">שביעות רצון</h3>
          <p className="text-3xl font-black text-slate-800">84%</p>
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
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">שיבוץ נוכחי</h3>
          <p className="text-3xl font-black text-slate-800">{stats.placedCount || 0} / {stats.studentCount || 0}</p>
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
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">אילוצים לא פתורים</h3>
          <p className="text-3xl font-black text-slate-800">3</p>
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
      { id: '1', name: 'יוני לוי', preferred: [], forbidden: [], separateFrom: ['2'], height: 'short', groups: ['א'] },
      { id: '2', name: 'ענבר כהן', preferred: ['1'], forbidden: [], keepDistantFrom: ['1'], height: 'tall', groups: ['ב'] },
      { id: '3', name: 'גיל שרון', preferred: [], forbidden: [], height: 'medium', groups: ['א'] }
    ],
    hiddenDesks: [] as number[],
    rowGaps: [] as number[],
    columnGaps: [] as number[],
    groups: [] as any[]
  });

  const [viewType, setViewType] = useState<'grid' | 'table' | 'history' | 'dashboard' | 'attendance' | 'grades' | 'progress' | 'settings'>('grid');
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
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [deskHistory, setDeskHistory] = useState<Record<number, string[]>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiWeights, setAiWeights] = useState({ preferred: 8, forbidden: 10, separateFrom: 6 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeDeskIdx, setActiveDeskIdx] = useState<number | null>(null);

  const studentsInPool = currentConfig.students.filter(s => {
    const isPlaced = currentConfig.grid.includes(s.id);
    const matchesFilter = selectedGroups.length === 0 || (s.groups && s.groups.some((g: string) => selectedGroups.includes(g)));
    return !isPlaced && matchesFilter;
  });

  const handleDrop = (deskIdx: number) => {
    if (!draggedStudentId) return;
    
    const student = currentConfig.students.find(s => s.id === draggedStudentId);
    if (student) {
      setDeskHistory(prev => ({
        ...prev,
        [deskIdx]: [student.name, ...(prev[deskIdx] || [])].slice(0, 5)
      }));
    }

    updateCurrentConfig((prev: any) => {
      const newGrid = [...prev.grid];
      // If student was already on another desk, clear it
      const oldIdx = newGrid.indexOf(draggedStudentId);
      if (oldIdx !== -1) newGrid[oldIdx] = null;
      
      // Replace whatever is there
      newGrid[deskIdx] = draggedStudentId;
      return { ...prev, grid: newGrid };
    });
    setDraggedStudentId(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (!content) return;

      try {
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content.toString());
          
          if (Array.isArray(json)) {
            // Format 3: Array of students with constraints
            const mapped = json.map((s, idx) => ({
              id: (s.student_id || s.id || `json-${idx}-${Date.now()}`).toString(),
              name: s.name,
              preferred: (s.preferred || []).map((id: any) => id?.toString()).filter(Boolean),
              forbidden: (s.not_preferred || s.forbidden || []).map((id: any) => id?.toString()).filter(Boolean),
              height: s.height || 'medium',
              groups: s.groups || []
            }));
            updateCurrentConfig((prev: any) => ({ ...prev, students: [...prev.students, ...mapped] }));
          } else if (json.grid && json.students) {
            // Format 2: Full configuration - Replace entirely to avoid conflicts
            updateCurrentConfig({
              ...json,
              students: json.students.map((s: any) => ({
                ...s,
                id: s.id.toString(),
                preferred: (s.preferred || []).map((p: any) => p?.toString()).filter(Boolean),
                forbidden: (s.forbidden || []).map((f: any) => f?.toString()).filter(Boolean),
              })),
              grid: json.grid.map((g: any) => g?.toString() || null)
            });
          } else if (json.students) {
            // Format 1: Teacher + students list
            const mapped = json.students.map((s: any, idx: number) => ({
              id: (s.id || `s-${idx}-${Date.now()}`).toString(),
              name: s.name,
              preferred: [],
              forbidden: [],
              height: 'medium',
              groups: []
            }));
            updateCurrentConfig((prev: any) => ({ ...prev, students: [...prev.students, ...mapped] }));
          }
        } else {
          // Excel logic
          const bstr = content;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          const newStudents = data.slice(1).map((row, idx) => ({
            id: `imported-${idx}-${Date.now()}`,
            name: row[0] || 'ללא שם',
            preferred: row[1] ? row[1].toString().split(',').map((s: string) => s.trim()) : [],
            forbidden: row[2] ? row[2].toString().split(',').map((s: string) => s.trim()) : [],
            height: row[3] === 'קצר' || row[3] === 'front' ? 'short' : 'medium',
            groups: []
          })).filter(s => s.name !== 'ללא שם');

          if (newStudents.length > 0) {
            updateCurrentConfig((prev: any) => ({
              ...prev,
              students: [...prev.students, ...newStudents]
            }));
          }
        }
        setNotifications(prev => [...prev, { id: Date.now(), text: `הנתונים יובאו בהצלחה!` }]);
      } catch (err) {
        setNotifications(prev => [...prev, { id: Date.now(), text: "שגיאה בטעינת הקובץ.", type: 'error' }]);
      }
    };
    if (file.name.endsWith('.json')) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  const SettingsView = () => {
    const fileRef = useRef<HTMLInputElement>(null);
    
    return (
      <div className="p-8 space-y-10 h-full overflow-y-auto max-w-5xl mx-auto custom-scrollbar">
        <input type="file" ref={fileRef} className="hidden" accept=".xlsx, .xls, .json" onChange={handleFileImport} />
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-slate-800">הגדרות מערכת</h2>
          <Badge className="bg-brand-50 text-brand-600 border-brand-200 p-2">v3.1.0</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Parameters */}
          <div className="glass-card p-8 rounded-[3rem] space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              <h3 className="text-lg font-black text-slate-800">פרמטרים AI</h3>
            </div>
            <div className="space-y-6">
              {Object.entries(aiWeights).map(([key, val]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-xs font-black text-slate-500 uppercase">
                    <span>{key === 'preferred' ? 'עדיפות חברים' : key === 'forbidden' ? 'מניעת חיכוך' : 'מרחק פיזי'}</span>
                    <span className="text-brand-600">{val}/10</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" value={val} 
                    onChange={(e) => setAiWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Accessibility & Theme */}
          <div className="glass-card p-8 rounded-[3rem] space-y-6">
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-brand-500" />
              <h3 className="text-lg font-black text-slate-800">נגישות ומראה</h3>
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => setAccessibility(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center justify-between transition-all font-black text-sm",
                  accessibility.highContrast ? "bg-slate-900 text-white shadow-xl" : "bg-slate-50 text-slate-600 border border-slate-100"
                )}
              >
                ניגודיות גבוהה
                {accessibility.highContrast ? <CheckCircle2 className="w-5 h-5 text-brand-400" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
              </button>
              <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                 {(['small', 'medium', 'large'] as const).map(size => (
                   <button 
                     key={size}
                     onClick={() => setAccessibility(prev => ({ ...prev, fontSize: size }))}
                     className={cn(
                       "flex-1 py-4 rounded-xl text-sm font-black transition-all",
                       accessibility.fontSize === size ? "bg-white text-brand-600 shadow-sm border border-slate-100" : "text-slate-500"
                     )}
                   >
                     {size === 'small' ? 'קטן' : size === 'medium' ? 'בינוני' : 'גדול'}
                   </button>
                 ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 glass-card p-10 rounded-[3rem] space-y-8 bg-white/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 rounded-[1.5rem] shadow-sm">
                  <Users className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">ניהול נתוני כיתה</h3>
                  <p className="text-base font-bold text-slate-500 mt-1">נהלו שמות, אילוצי הפרדה והעדפות חברתיות במרוכז</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 items-center">
                <button 
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-3 px-8 py-4 bg-white text-slate-800 rounded-3xl text-base font-black shadow-lg border-2 border-brand-100 hover:bg-brand-50 hover:border-brand-300 transition-all active:scale-95"
                >
                  <Upload className="w-6 h-6 text-brand-600" />
                  יבוא רשימה ונתונים
                </button>

                <div className="w-px h-10 bg-slate-200 mx-2 hidden md:block" />

                <button 
                  onClick={() => {
                    const name = prompt("שם התלמיד החדש:");
                    if (name) {
                      updateCurrentConfig((prev: any) => ({
                        ...prev,
                        students: [...prev.students, { id: Date.now().toString(), name, preferred: [], forbidden: [], height: 'medium', groups: [] }]
                      }));
                    }
                  }}
                  className="flex items-center gap-3 px-10 py-5 bg-brand-600 text-white rounded-3xl text-base font-bold shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-1 active:translate-y-0"
                >
                  <UserPlus className="w-6 h-6" />
                  הוספת תלמיד
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentConfig.students.map((student, idx) => (
                <div key={`${student.id}-${idx}`} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-5 hover:border-brand-200 transition-all group">
                  <div className="flex items-center justify-between">
                    <input 
                      value={student.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        updateCurrentConfig((prev: any) => ({
                          ...prev,
                          students: prev.students.map((s: any) => s.id === student.id ? { ...s, name: newName } : s)
                        }));
                      }}
                      className="bg-transparent font-black text-slate-700 focus:ring-0 border-0 p-0 w-32 text-sm"
                    />
                    <button 
                      onClick={() => {
                        if (confirm(`האם למחוק את ${student.name}?`)) {
                          updateCurrentConfig((prev: any) => ({ ...prev, students: prev.students.filter((s:any) => s.id !== student.id) }));
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                       <button 
                         onClick={() => updateCurrentConfig((prev: any) => ({
                            ...prev,
                            students: prev.students.map((s:any) => s.id === student.id ? { ...s, height: s.height === 'short' ? 'medium' : 'short' } : s)
                         }))}
                         className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap", student.height === 'short' ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500")}
                       >
                         {student.height === 'short' ? 'חייב קדימה' : 'גובה רגיל'}
                       </button>
                       <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-2 py-1 shadow-sm">
                          <Heart className="w-3 h-3 text-rose-400" />
                          <span className="text-xs font-black text-slate-500">{student.preferred.length} חברים</span>
                       </div>
                       <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl px-2 py-1 shadow-sm">
                          <Ban className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-black text-slate-500">{student.forbidden.length} הפרדות</span>
                       </div>
                    </div>

                    <div className="p-3 bg-white/50 rounded-2xl border border-slate-100/50 space-y-2">
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">עריכת אילוצים (IDs)</h4>
                       <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center gap-2">
                             <Heart className="w-3 h-3 text-rose-500 shrink-0" />
                             <input 
                                placeholder="מזהי חברים (מופרדים בפסיק)"
                                value={student.preferred.join(', ')}
                                onChange={(e) => {
                                  const val = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                  updateCurrentConfig((prev: any) => ({
                                    ...prev,
                                    students: prev.students.map((s: any) => s.id === student.id ? { ...s, preferred: val } : s)
                                  }));
                                }}
                                className="w-full bg-transparent border-0 p-0 text-xs font-bold text-slate-800 focus:ring-0 placeholder:text-slate-300"
                             />
                          </div>
                          <div className="flex items-center gap-2">
                             <Ban className="w-4 h-4 text-slate-500 shrink-0" />
                             <input 
                                placeholder="מזהי הפרדות (מופרדים בפסיק)"
                                value={student.forbidden.join(', ')}
                                onChange={(e) => {
                                  const val = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                  updateCurrentConfig((prev: any) => ({
                                    ...prev,
                                    students: prev.students.map((s: any) => s.id === student.id ? { ...s, forbidden: val } : s)
                                  }));
                                }}
                                className="w-full bg-transparent border-0 p-0 text-xs font-bold text-slate-800 focus:ring-0 placeholder:text-slate-300"
                             />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const checkViolations = useCallback(() => {
    const grid = currentConfig.grid;
    const students = currentConfig.students;
    const newNotifications: any[] = [];
    const cols = currentConfig.cols;

    grid.forEach((sid, idx) => {
      if (!sid) return;
      const student = students.find(s => s.id === sid);
      if (!student) return;

      const r = Math.floor(idx / cols);
      const c = idx % cols;

      // Check adjacent
      const neighbors = [
        [r, c-1], [r, c+1], [r-1, c], [r+1, c]
      ];

      neighbors.forEach(([nr, nc]) => {
        if (nr < 0 || nr >= currentConfig.rows || nc < 0 || nc >= currentConfig.cols) return;
        const nIdx = nr * cols + nc;
        const nSid = grid[nIdx];
        if (!nSid) return;
        const neighbor = students.find(s => s.id === nSid);
        if (!neighbor) return;

        const isForbidden = 
          (student.forbidden && student.forbidden.includes(nSid)) || 
          (student.separateFrom && student.separateFrom.includes(nSid)) ||
          (student.keepDistantFrom && student.keepDistantFrom.includes(nSid));

        if (isForbidden) {
          newNotifications.push({ 
            id: `v-${sid}-${nSid}`, 
            text: `אזהרה: ${student.name} ו-${neighbor.name} קרובים מדי!`,
            type: 'error'
          });
        }
      });
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const existingTexts = prev.map(n => n.text);
        const filtered = newNotifications.filter(n => !existingTexts.includes(n.text));
        return [...prev, ...filtered].slice(-3);
      });
    }
  }, [currentConfig]);

  useEffect(() => {
    const timer = setTimeout(checkViolations, 1000);
    return () => clearTimeout(timer);
  }, [currentConfig.grid, checkViolations]);

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
      case 'settings': return <SettingsView />;
      default: return null;
    }
  };

  const exportToExcel = () => console.log("Exporting to Excel...");
  const exportToPDF = () => console.log("Exporting to PDF...");

  const Header = () => (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-200">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-brand-700 leading-none tracking-tight">ClassManager</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Smart Learning Spaces</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
           {(['grid', 'dashboard', 'attendance', 'grades', 'progress', 'settings'] as const).map(nav => (
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
               {nav === 'settings' && 'הגדרות'}
             </button>
           ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setViewType('settings')}
          className={cn(
            "p-3 rounded-2xl transition-all relative overflow-hidden",
            viewType === 'settings' ? "bg-brand-50 text-brand-600" : "bg-slate-50 hover:bg-slate-100 text-slate-500"
          )}
        >
          <Settings className="w-5 h-5" />
          {viewType === 'settings' && <motion.div layoutId="nav-active" className="absolute inset-0 bg-brand-200/20" />}
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
            className="fixed inset-0 bg-brand-900/5 backdrop-blur-sm z-30 lg:hidden"
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
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">כיתה פעילה</h3>
                    <Badge className="bg-brand-50 text-brand-600">v3.0</Badge>
                  </div>
                  <input
                    value={currentConfig.name}
                    onChange={(e) => updateCurrentConfig((prev: any) => ({ ...prev, name: e.target.value }))}
            className="text-lg font-black text-slate-700 bg-transparent border-0 p-0 focus:ring-0 w-full"
                  />
                </div>
              </div>

              {/* Student Pool */}
              <div className="flex flex-col gap-3 min-h-[200px]">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">ממתינים לשיבוץ ({studentsInPool.length})</h3>
                  <button className="p-1 hover:bg-slate-100 rounded-lg"><Plus className="w-4 h-4 text-slate-400" /></button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {studentsInPool.map((student, idx) => (
                    <motion.div
                      key={`${student.id}-${idx}`}
                      draggable
                      onDragStart={() => setDraggedStudentId(student.id)}
                      onDragEnd={() => setDraggedStudentId(null)}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-brand-200 hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400">
                          {student.name[0]}
                        </div>
                        <span className="text-xs font-black text-slate-700">{student.name}</span>
                      </div>
                      <MoreVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                  {studentsInPool.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">כל התלמידים משובצים</p>
                    </div>
                  )}
                </div>
              </div>

              {/* View Satisfaction Indicator */}
              <div className="glass-card p-5 rounded-3xl border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">ממוצע שביעות רצון</h3>
                  <div className="flex items-center gap-1 text-xs font-black text-emerald-500">
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
                  className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black shadow-xl shadow-brand-200 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white font-black animate-pulse">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats / Metadata */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-xs font-black text-slate-400 uppercase">תלמידים</span>
                  <span className="text-lg font-black text-slate-800">{currentConfig.students.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-xs font-black text-slate-400 uppercase">מידות</span>
                  <span className="text-lg font-black text-slate-800">{currentConfig.cols}x{currentConfig.rows}</span>
                </div>
              </div>

              {/* Quick Exports */}
              <div className="mt-auto space-y-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">ייצוא מהיר</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={exportToExcel} className="flex items-center justify-center gap-3 px-2 py-4 bg-brand-50 text-brand-700 rounded-2xl text-xs font-bold hover:bg-brand-100 border border-brand-100">
                      <Download className="w-5 h-5" />
                      Excel
                    </button>
                    <button onClick={exportToPDF} className="flex items-center justify-center gap-3 px-2 py-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold hover:bg-rose-100 border border-rose-100">
                      <FileDown className="w-5 h-5" />
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
        "flex flex-col h-screen overflow-hidden bg-transparent font-sans rtl selection:bg-brand-100",
        accessibility.highContrast && "high-contrast grayscale"
      )} 
      style={{ 
        '--app-font-size': accessibility.fontSize === 'small' ? '16px' : accessibility.fontSize === 'large' ? '26px' : '19px' 
      } as React.CSSProperties}
      dir="rtl"
    >
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          <AnimatePresence mode="wait">
             <motion.div
               key={viewType}
               initial={{ opacity: 0, x: 15 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -15 }}
               transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
               className="flex-1 flex flex-col overflow-hidden"
             >
               {viewType === 'grid' ? (
                 <div className="flex-1 overflow-auto bg-slate-50 p-6 flex flex-col items-center shadow-inner">
                   {/* Grid Toolbar */}
                   <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 mb-10 z-30 shadow-bento shrink-0">
                     <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl">
                       <button onClick={() => setEditMode('normal')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", editMode === 'normal' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}>עריכה</button>
                       <button onClick={() => setEditMode('structure')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", editMode === 'structure' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}>מבנה</button>
                     </div>
                     
                     <div className="w-px h-6 bg-slate-200/50 mx-1" />

                     {/* Group Filter */}
                     <div className="flex items-center gap-2">
                       <Filter className="w-4 h-4 text-slate-400" />
                       <div className="flex gap-1 overflow-x-auto max-w-[200px] scrollbar-hide py-1">
                          {['א', 'ב', 'ג'].map(g => (
                            <button
                               key={g}
                               onClick={() => setSelectedGroups(prev => prev.includes(g) ? prev.filter(pg => pg !== g) : [...prev, g])}
                               className={cn(
                                 "px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap",
                                 selectedGroups.includes(g) ? "bg-brand-600 text-white shadow-md shadow-brand-100" : "bg-slate-50 text-slate-500 border border-slate-100"
                               )}
                            >
                              קבוצה {g}
                            </button>
                          ))}
                       </div>
                     </div>

                     <div className="w-px h-6 bg-slate-200/50 mx-1" />

                     {editMode === 'structure' ? (
                       <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                           <span className="text-xs font-black text-slate-500 uppercase px-2">שורות</span>
                           <button onClick={() => handleGridResize('rows', -1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Minus className="w-3 h-3" /></button>
                           <span className="w-6 text-center font-black text-xs">{currentConfig.rows}</span>
                           <button onClick={() => handleGridResize('rows', 1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Plus className="w-3 h-3" /></button>
                         </div>
                         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                           <span className="text-xs font-black text-slate-500 uppercase px-2">טורים</span>
                           <button onClick={() => handleGridResize('cols', -1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Minus className="w-3 h-3" /></button>
                           <span className="w-6 text-center font-black text-xs">{currentConfig.cols}</span>
                           <button onClick={() => handleGridResize('cols', 1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Plus className="w-3 h-3" /></button>
                         </div>
                         <button 
                            onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, hiddenDesks: [] }))}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black hover:bg-rose-100 transition-colors"
                         >
                           איפוס שולחנות
                         </button>
                       </div>
                     ) : (
                       <button onClick={() => setShowDeskNumbers(!showDeskNumbers)} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2", showDeskNumbers ? "bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "text-slate-500")}>
                          <Eye className="w-4 h-4" />
                          מספרים
                       </button>
                     )}
                   </div>

                   {/* Grid Content */}
                   <div className="relative w-full max-w-6xl flex flex-col items-center" id="classroom-grid-container">
                      {/* Teacher Table */}
                      <div className="w-64 h-12 bg-white rounded-2xl border-b-8 border-slate-200 flex items-center justify-center shadow-xl mb-12">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">שולחן מורה</span>
                      </div>

                  <div 
                    className="grid p-10 bg-white/40 rounded-[4rem] border border-white shadow-bento backdrop-blur-sm relative" 
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: Array.from({ length: currentConfig.cols }).map((_, i) => 
                        `${currentConfig.columnGaps.includes(i) ? '70px 32px' : '70px'}`
                      ).join(' '),
                      gridTemplateRows: Array.from({ length: currentConfig.rows }).map((_, i) => 
                        `${currentConfig.rowGaps.includes(i) ? '48px 32px' : '48px'}`
                      ).join(' '),
                      perspective: '1000px',
                    }}
                  >
                    {/* Gap Handles (Structure Mode Only) */}
                    {editMode === 'structure' && (
                      <>
                        {/* Column Gap Handles */}
                        {Array.from({ length: currentConfig.cols - 1 }).map((_, i) => {
                          const colPos = (i + 1) + currentConfig.columnGaps.filter(g => g <= i).length;
                          const hasGap = currentConfig.columnGaps.includes(i);
                          return (
                            <div 
                              key={`col-gap-${i}`}
                              onClick={() => updateCurrentConfig((prev: any) => ({
                                ...prev,
                                columnGaps: prev.columnGaps.includes(i) ? prev.columnGaps.filter((g: number) => g !== i) : [...prev.columnGaps, i]
                              }))}
                              style={{ 
                                gridColumn: hasGap ? colPos + 1 : colPos, 
                                gridRow: `1 / span ${currentConfig.rows + currentConfig.rowGaps.length}`,
                                width: hasGap ? '32px' : '12px',
                                marginRight: hasGap ? '-16px' : '-6px',
                                marginLeft: hasGap ? '-16px' : '-6px',
                                justifySelf: 'center'
                              }}
                              className={cn(
                                "h-full cursor-pointer hover:bg-brand-400/20 transition-all rounded-full z-20 flex items-center justify-center group",
                                hasGap ? "bg-brand-500/10" : "bg-transparent"
                              )}
                              title="רווח טור"
                            >
                               <div className={cn("w-1 h-8 rounded-full transition-all group-hover:scale-y-150", hasGap ? "bg-brand-400" : "bg-slate-200 opacity-0 group-hover:opacity-100")} />
                            </div>
                          );
                        })}

                        {/* Row Gap Handles */}
                        {Array.from({ length: currentConfig.rows - 1 }).map((_, i) => {
                          const rowPos = (i + 1) + currentConfig.rowGaps.filter(g => g <= i).length;
                          const hasGap = currentConfig.rowGaps.includes(i);
                          return (
                            <div 
                              key={`row-gap-${i}`}
                              onClick={() => updateCurrentConfig((prev: any) => ({
                                ...prev,
                                rowGaps: prev.rowGaps.includes(i) ? prev.rowGaps.filter((g: number) => g !== i) : [...prev.rowGaps, i]
                              }))}
                              style={{ 
                                gridRow: hasGap ? rowPos + 1 : rowPos, 
                                gridColumn: `1 / span ${currentConfig.cols + currentConfig.columnGaps.length}`,
                                height: hasGap ? '32px' : '12px',
                                marginTop: hasGap ? '-16px' : '-6px',
                                marginBottom: hasGap ? '-16px' : '-6px',
                                alignSelf: 'center'
                              }}
                              className={cn(
                                "w-full cursor-pointer hover:bg-brand-400/20 transition-all rounded-full z-20 flex items-center justify-center group",
                                hasGap ? "bg-brand-500/10" : "bg-transparent"
                              )}
                              title="רווח שורה"
                            >
                               <div className={cn("h-1 w-8 rounded-full transition-all group-hover:scale-x-150", hasGap ? "bg-brand-400" : "bg-slate-200 opacity-0 group-hover:opacity-100")} />
                            </div>
                          );
                        })}
                      </>
                    )}

                    {Array.from({ length: currentConfig.rows }).map((_, r) => (
                      Array.from({ length: currentConfig.cols }).map((_, c) => {
                        const idx = r * currentConfig.cols + c;
                        const studentId = currentConfig.grid[idx];
                        const student = currentConfig.students.find(s => s.id === studentId);
                        const isHidden = currentConfig.hiddenDesks.includes(idx);
                        
                        // Calculate grid position accounting for gaps
                        const colPos = c + 1 + currentConfig.columnGaps.filter(g => g < c).length;
                        const rowPos = r + 1 + currentConfig.rowGaps.filter(g => g < r).length;

                        return (
                          <DeskCell
                            key={idx}
                            idx={idx}
                            studentId={studentId}
                            student={student}
                            isHidden={isHidden}
                            editMode={editMode}
                            colPos={colPos}
                            rowPos={rowPos}
                            showDeskNumbers={showDeskNumbers}
                            draggedStudentId={draggedStudentId}
                            onDrop={handleDrop}
                            updateCurrentConfig={updateCurrentConfig}
                            currentConfig={currentConfig}
                            onShowHistory={(i: number) => {
                              setActiveDeskIdx(i);
                              setIsHistoryModalOpen(true);
                            }}
                          />
                        );
                      })
                    ))}
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
        {isHistoryModalOpen && activeDeskIdx !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-900/10 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] shadow-2xl p-8 max-w-md w-full flex flex-col gap-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <History className="w-8 h-8 text-brand-600" />
                      <h2 className="text-2xl font-black text-slate-800">היסטוריית שולחן #{activeDeskIdx + 1}</h2>
                   </div>
                   <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="space-y-4">
                  {deskHistory[activeDeskIdx] && deskHistory[activeDeskIdx].length > 0 ? (
                    deskHistory[activeDeskIdx].map((name, i) => (
                      <div key={`${name}-${i}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="font-black text-slate-700">{name}</span>
                        <span className="text-xs font-black text-slate-500">לפני {i + 1} שינויים</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      <p className="text-sm font-bold text-slate-300">אין היסטוריה לשולחן זה</p>
                    </div>
                  )}
                </div>

                <button onClick={() => setIsHistoryModalOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">סגור</button>
            </motion.div>
          </div>
        )}

        {isAIPanelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-900/10 backdrop-blur-md">
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
                          <div className="flex justify-between text-xs font-black text-slate-500 uppercase">
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

      {/* Floating Notifications */}
      <div className="fixed bottom-14 left-6 z-[110] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 10, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                "p-4 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto border-l-4 min-w-[280px]",
                n.type === 'error' ? "bg-rose-50 border-rose-500 text-rose-800 shadow-rose-200" : "bg-white border-brand-500 text-slate-700 shadow-slate-200"
              )}
            >
              {n.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-brand-500" />}
              <div className="flex-1">
                <p className="text-xs font-black">{n.text}</p>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <footer className="h-12 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">
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
