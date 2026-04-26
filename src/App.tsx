import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Settings, 
  Undo2, 
  Redo2, 
  Wand2, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  MoreVertical,
  Minus,
  Maximize2,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Square,
  Columns,
  Rows
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { ClassroomState, Student, EditMode, ClassroomConfig } from './types';
import { cn } from './lib/utils';

// --- Components ---

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}>
    {children}
  </span>
);

export default function App() {
  const [state, setState] = useState<ClassroomState>(() => {
    const saved = localStorage.getItem('cm_state_multi');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved multi-state", e);
      }
    }
    const initialConfig: ClassroomConfig = {
      id: 'default',
      name: 'כיתה א׳',
      cols: 8,
      rows: 6,
      students: [],
      grid: Array(48).fill(null),
      locked: [],
      hiddenDesks: [],
      columnGaps: [],
      rowGaps: [],
      updatedAt: Date.now(),
    };
    return {
      currentConfigId: 'default',
      configs: [initialConfig],
    };
  });

  const currentConfig = useMemo(() => 
    state.configs.find(c => c.id === state.currentConfigId) || state.configs[0],
  [state]);

  const [history, setHistory] = useState<ClassroomConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editMode, setEditMode] = useState<EditMode>('normal');
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [aiWeights, setAiWeights] = useState({ preferred: 8, forbidden: 10, separateFrom: 7 });
  const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  // --- Persistence & History ---
  
  useEffect(() => {
    localStorage.setItem('cm_state_multi', JSON.stringify(state));
  }, [state]);

  const pushHistory = useCallback((newConfig: ClassroomConfig) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newConfig].slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevConfig = history[historyIndex - 1];
      setState(prev => ({
        ...prev,
        configs: prev.configs.map(c => c.id === prev.currentConfigId ? prevConfig : c)
      }));
      setHistoryIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextConfig = history[historyIndex + 1];
      setState(prev => ({
        ...prev,
        configs: prev.configs.map(c => c.id === prev.currentConfigId ? nextConfig : c)
      }));
      setHistoryIndex(prev => prev + 1);
    }
  };

  const updateCurrentConfig = (updater: (prev: ClassroomConfig) => ClassroomConfig) => {
    setState(prev => {
      const current = prev.configs.find(c => c.id === prev.currentConfigId) || prev.configs[0];
      const nextConfig = { ...updater(current), updatedAt: Date.now() };
      pushHistory(nextConfig);
      return {
        ...prev,
        configs: prev.configs.map(c => c.id === prev.currentConfigId ? nextConfig : c)
      };
    });
  };

  // --- Logic Helpers ---

  const totalCells = currentConfig.cols * currentConfig.rows;
  const idxToColRow = (idx: number) => ({ col: idx % currentConfig.cols, row: Math.floor(idx / currentConfig.cols) });

  const getNeighborIds = (idx: number, grid: (string | number | null)[]) => {
    const { col, row } = idxToColRow(idx);
    const neighbors: (string | number)[] = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dc, dr]) => {
      const nc = col + dc, nr = row + dr;
      if (nc >= 0 && nc < currentConfig.cols && nr >= 0 && nr < currentConfig.rows) {
        const nId = grid[nr * currentConfig.cols + nc];
        if (nId !== null) neighbors.push(nId);
      }
    });
    return neighbors;
  };

  const satisfaction = useMemo(() => {
    let total = 0, satisfied = 0, violated = 0, partial = 0;
    const seatOf: Record<string | number, number> = {};
    currentConfig.grid.forEach((id, idx) => {
      if (id !== null && !currentConfig.hiddenDesks.includes(idx)) seatOf[id] = idx;
    });

    currentConfig.students.forEach(student => {
      const idx = seatOf[student.id];
      if (idx === undefined) return;
      const { col, row } = idxToColRow(idx);

      // Preferred
      student.preferred.forEach(pid => {
        if (seatOf[pid] === undefined) return;
        total++;
        const { col: pc, row: pr } = idxToColRow(seatOf[pid]);
        const d = Math.abs(col - pc) + Math.abs(row - pr);
        if (d <= 1) satisfied++; else if (d <= 2) partial++; else violated++;
      });

      // Forbidden
      student.forbidden.forEach(fid => {
        if (seatOf[fid] === undefined) return;
        total++;
        const { col: fc, row: fr } = idxToColRow(seatOf[fid]);
        const d = Math.abs(col - fc) + Math.abs(row - fr);
        if (d > 2) satisfied++; else if (d === 2) partial++; else violated++;
      });

      // Separate From
      student.separateFrom.forEach(sid => {
        if (seatOf[sid] === undefined) return;
        total++;
        const { col: sc, row: sr } = idxToColRow(seatOf[sid]);
        const d = Math.abs(col - sc) + Math.abs(row - sr);
        const maxDist = currentConfig.cols + currentConfig.rows;
        if (d >= maxDist / 3) satisfied++; else if (d >= maxDist / 6) partial++; else violated++;
      });

      // Corner Prefer
      if (student.cornerPrefer) {
        total++;
        const isCorner = (col === 0 || col === currentConfig.cols - 1) && (row === 0 || row === currentConfig.rows - 1);
        if (isCorner) satisfied++; else partial++;
      }

      if (student.frontPrefer) {
        total++;
        if (row <= 1) satisfied++; else if (row <= 2) partial++; else violated++;
      }
      if (student.backPrefer || student.tall) {
        total++;
        if (row >= currentConfig.rows - 2) satisfied++; else if (row >= currentConfig.rows - 3) partial++; else violated++;
      }
    });

    if (total === 0) return 100;
    return Math.round(((satisfied + partial * 0.5) / total) * 100);
  }, [currentConfig]);

  const handleGridResize = (type: 'cols' | 'rows', val: number) => {
    updateCurrentConfig(prev => {
      const newCols = type === 'cols' ? Math.max(1, Math.min(16, prev.cols + val)) : prev.cols;
      const newRows = type === 'rows' ? Math.max(1, Math.min(20, prev.rows + val)) : prev.rows;
      
      if (newCols === prev.cols && newRows === prev.rows) return prev;

      let newGrid = [...prev.grid];
      if (type === 'cols') {
        newGrid = [];
        for (let r = 0; r < prev.rows; r++) {
          for (let c = 0; c < newCols; c++) {
            newGrid.push(c < prev.cols ? (prev.grid[r * prev.cols + c] ?? null) : null);
          }
        }
      } else {
        const targetSize = newCols * newRows;
        while (newGrid.length < targetSize) newGrid.push(null);
        if (newGrid.length > targetSize) newGrid = newGrid.slice(0, targetSize);
      }

      return {
        ...prev,
        cols: newCols,
        rows: newRows,
        grid: newGrid,
        locked: prev.locked.filter(i => i < newCols * newRows),
        hiddenDesks: prev.hiddenDesks.filter(i => i < newCols * newRows)
      };
    });
  };

  // --- Drag & Drop ---

  const onDragStart = (e: React.DragEvent, id: string | number) => {
    e.dataTransfer.setData("studentId", id.toString());
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData("studentId");
    if (!studentId) return;

    updateCurrentConfig(prev => {
      const newGrid = [...prev.grid];
      // Remove from previous slot if exists
      const prevIdx = newGrid.findIndex(id => id?.toString() === studentId);
      if (prevIdx !== -1) newGrid[prevIdx] = null;
      
      newGrid[idx] = isNaN(Number(studentId)) ? studentId : Number(studentId);
      return { ...prev, grid: newGrid };
    });
  };

  // --- Handlers ---

  const handleDeskClick = (idx: number) => {
    if (editMode === 'structure') {
      updateCurrentConfig(prev => ({
        ...prev,
        hiddenDesks: prev.hiddenDesks.includes(idx) 
          ? prev.hiddenDesks.filter(i => i !== idx) 
          : [...prev.hiddenDesks, idx],
        grid: prev.hiddenDesks.includes(idx) ? prev.grid : prev.grid.map((id, i) => i === idx ? null : id)
      }));
      return;
    }

    if (editMode === 'gapCol') {
      const col = idx % currentConfig.cols;
      updateCurrentConfig(prev => ({
        ...prev,
        columnGaps: prev.columnGaps.includes(col) 
          ? prev.columnGaps.filter(c => c !== col) 
          : [...prev.columnGaps, col]
      }));
      return;
    }

    if (editMode === 'gapRow') {
      const row = Math.floor(idx / currentConfig.cols);
      updateCurrentConfig(prev => ({
        ...prev,
        rowGaps: prev.rowGaps.includes(row) 
          ? prev.rowGaps.filter(r => r !== row) 
          : [...prev.rowGaps, row]
      }));
      return;
    }

    const currentId = currentConfig.grid[idx];
    if (currentId !== null) {
      setEditingStudent(currentConfig.students.find(s => s.id === currentId) || null);
    } else if (selectedStudentId !== null) {
      updateCurrentConfig(prev => {
        const newGrid = [...prev.grid];
        newGrid[idx] = selectedStudentId;
        return { ...prev, grid: newGrid };
      });
      setSelectedStudentId(null);
    }
  };

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    const newId = Date.now();
    updateCurrentConfig(prev => ({
      ...prev,
      students: [...prev.students, {
        id: newId,
        name: newStudentName.trim(),
        preferred: [],
        forbidden: [],
        separateFrom: []
      }]
    }));
    setNewStudentName("");
  };

  const runSmartSort = () => {
    const unplaced = currentConfig.students.filter(s => !currentConfig.grid.includes(s.id));
    const availableDesks = Array.from({ length: totalCells }, (_, i) => i)
      .filter(i => !currentConfig.hiddenDesks.includes(i) && currentConfig.grid[i] === null);
    
    if (unplaced.length === 0 || availableDesks.length === 0) return;

    updateCurrentConfig(prev => {
      const newGrid = [...prev.grid];
      const desks = [...availableDesks].sort(() => Math.random() - 0.5);
      unplaced.forEach((student, i) => {
        if (desks[i] !== undefined) newGrid[desks[i]] = student.id;
      });
      return { ...prev, grid: newGrid };
    });
  };

  const exportData = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom_seating_multi_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const exportToExcel = () => {
    const studentData = currentConfig.students.map(s => {
      const idx = currentConfig.grid.indexOf(s.id);
      const { col, row } = idx !== -1 ? idxToColRow(idx) : { col: -1, row: -1 };
      return {
        'שם': s.name,
        'כינוי': s.nickname || '',
        'שורה': idx !== -1 ? row + 1 : 'לא משובץ',
        'טור': idx !== -1 ? col + 1 : 'לא משובץ',
        'העדפות': s.preferred.map(id => currentConfig.students.find(st => st.id === id)?.name).join(', '),
        'דחייה': s.forbidden.map(id => currentConfig.students.find(st => st.id === id)?.name).join(', '),
        'הפרדה': s.separateFrom.map(id => currentConfig.students.find(st => st.id === id)?.name).join(', ')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(studentData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "תלמידים");
    XLSX.writeFile(workbook, `${currentConfig.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.configs && data.currentConfigId) {
          setState(data);
        } else {
          // Legacy support or single config import
          const newId = Date.now().toString();
          const newConfig: ClassroomConfig = {
            ...data,
            id: newId,
            name: data.name || 'ייבוא חדש',
            updatedAt: Date.now()
          };
          setState(prev => ({
            ...prev,
            currentConfigId: newId,
            configs: [...prev.configs, newConfig]
          }));
        }
      } catch (err) {
        alert("תקלה בטעינת הקובץ. וודא שהפורמט תקין.");
      }
    };
    reader.readAsText(file);
  };

  const callAIArrangement = async () => {
    setIsAIPanelOpen(true);
    setIsLoadingAI(true);
    try {
      const context = `Classroom: ${currentConfig.name}, ${currentConfig.rows} rows, ${currentConfig.cols} columns. Students: ${currentConfig.students.map(s => `${s.name} (ID: ${s.id}, prefs: ${s.preferred.length}, forbs: ${s.forbidden.length})`).join('; ')}. Currently seated: ${currentConfig.grid.filter(id => id).length}. Satisfaction: ${satisfaction}%.`;
      const response = await fetch('/api/ai/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          context, 
          prompt: "Suggest a better arrangement based on social dynamics and provide a full grid JSON at the end.",
          weights: aiWeights
        })
      });
      const data = await response.json();
      setAiResponse(data.text);
    } catch (error) {
      setAiResponse("תקלה בשירות הבינה המלאכותית.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  // --- Multi-Config Management ---

  const addNewConfig = () => {
    const id = Date.now().toString();
    const newConfig: ClassroomConfig = {
      ...currentConfig,
      id,
      name: `העתק ${currentConfig.name}`,
      updatedAt: Date.now()
    };
    setState(prev => ({
      ...prev,
      currentConfigId: id,
      configs: [...prev.configs, newConfig]
    }));
  };

  const switchConfig = (id: string) => {
    setState(prev => ({ ...prev, currentConfigId: id }));
    setHistory([]);
    setHistoryIndex(-1);
  };

  const deleteConfig = (id: string) => {
    if (state.configs.length <= 1) return;
    setState(prev => {
      const newConfigs = prev.configs.filter(c => c.id !== id);
      return {
        ...prev,
        configs: newConfigs,
        currentConfigId: prev.currentConfigId === id ? newConfigs[0].id : prev.currentConfigId
      };
    });
  };

  const renameConfig = (id: string, newName: string) => {
    setState(prev => ({
      ...prev,
      configs: prev.configs.map(c => c.id === id ? { ...c, name: newName } : c)
    }));
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ title, message, onConfirm });
  };

  // --- Sub-components (Nested for access to state) ---

  const Desk = ({ idx }: { idx: number }) => {
    const id = currentConfig.grid[idx];
    const isHidden = currentConfig.hiddenDesks.includes(idx);
    const isLocked = currentConfig.locked.includes(idx);
    const student = currentConfig.students.find(s => s.id === id);
    const isSelected = id !== null && id === selectedStudentId;
    const isConflict = id !== null && getNeighborIds(idx, currentConfig.grid).some(nid => student?.forbidden.includes(nid));
    const isPreferred = id !== null && getNeighborIds(idx, currentConfig.grid).some(nid => student?.preferred.includes(nid));

    return (
      <motion.button
        layoutId={student ? `student-${student.id}` : `desk-${idx}`}
        whileHover={!isHidden ? { y: -3, scale: 1.03 } : {}}
        whileTap={!isHidden ? { scale: 0.95 } : {}}
        onClick={() => handleDeskClick(idx)}
        onDragOver={(e) => !isHidden && e.preventDefault()}
        onDrop={(e) => !isHidden && onDrop(e, idx)}
        draggable={!!student && !isLocked}
        onDragStart={(e) => student && onDragStart(e, student.id)}
        className={cn(
          "relative w-24 h-18 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2",
          isHidden ? "opacity-20 border-dashed border-slate-300 bg-slate-100/50" : "bg-white border-slate-200 desk-shadow overflow-hidden",
          id !== null && !isLocked && "hover:border-brand-400 hover:desk-shadow-hover cursor-grab active:cursor-grabbing",
          isSelected && "border-brand-600 ring-4 ring-brand-100 z-10 scale-105",
          isLocked && "border-brand-500 bg-brand-50",
          isConflict && "border-red-500 bg-red-50 shadow-red-100 ring-2 ring-red-100",
          isPreferred && "border-green-500 bg-green-50 shadow-green-100 ring-2 ring-green-100",
          selectedStudentId !== null && !id && !isHidden && "border-brand-400 bg-brand-50/50 border-dashed animate-pulse ring-4 ring-brand-100"
        )}
      >
        {!isHidden && (
          <>
            <AnimatePresence mode="wait">
              {student ? (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-[12px] font-black text-slate-800 leading-tight text-center break-words">
                    {student.name}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-1.5 justify-center">
                    {student.tall && <Badge className="bg-blue-100 text-blue-700">גבוה</Badge>}
                    {student.frontPrefer && <Badge className="bg-emerald-100 text-emerald-700">קדמה</Badge>}
                    {student.backPrefer && <Badge className="bg-amber-100 text-amber-700">אחורה</Badge>}
                    {student.cornerPrefer && <Badge className="bg-purple-100 text-purple-700">פינה</Badge>}
                  </div>
                </motion.div>
              ) : (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] text-slate-300 font-bold"
                >
                  {idx + 1}
                </motion.span>
              )}
            </AnimatePresence>
            {isLocked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-brand-600" />}
          </>
        )}
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans rtl" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200 z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-brand-600 tracking-tight">ClassManager <span className="font-light text-slate-400">Pro</span></h1>
          </div>

          <div className="hidden lg:flex items-center gap-2 mr-6">
            <select 
              value={state.currentConfigId}
              onChange={(e) => switchConfig(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none"
            >
              {state.configs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={addNewConfig}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600"
              title="הוסף כיתה חדשה"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600 mr-4">
            <div className="w-2 h-2 rounded-full bg-green-500 ml-2 animate-pulse" />
            סינכרון פעיל
          </div>
          
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30">
            <Undo2 className="w-5 h-5" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30">
            <Redo2 className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-2" />
          
          <button 
            onClick={() => setViewType(viewType === 'grid' ? 'table' : 'grid')}
            className={cn("p-2 rounded-lg transition-all", viewType === 'table' ? "bg-brand-100 text-brand-700" : "hover:bg-slate-100 text-slate-600")}
            title={viewType === 'grid' ? 'תצוגת טבלה' : 'תצוגת גריד'}
          >
            {viewType === 'grid' ? <Rows className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>

          <div className="w-px h-6 bg-slate-200 mx-2" />
          
          <button 
            onClick={callAIArrangement}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline">עוזר AI</span>
          </button>
          
          <button 
            onClick={runSmartSort}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-brand-500 text-brand-600 rounded-xl text-sm font-bold hover:bg-brand-50 transition-all active:scale-95"
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden md:inline">סידור חכם</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 lg:hidden"
              />
              <motion.aside
                initial={{ x: 300 }}
                animate={{ x: 0 }}
                exit={{ x: 300 }}
                className="absolute lg:relative z-20 w-[300px] h-full bg-white border-l border-slate-200 overflow-y-auto flex flex-col shadow-2xl lg:shadow-none"
              >
              <div className="p-6 flex flex-col gap-8">
                {/* Classroom Header */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">כיתה נוכחית</h3>
                    <div className="flex gap-1">
                      <button onClick={addNewConfig} className="p-1 hover:bg-slate-100 rounded text-brand-600"><Plus className="w-3 h-3" /></button>
                      <button onClick={() => confirmAction('מחיקת כיתה', `בטוח שברצונך למחוק את ${currentConfig.name}?`, () => deleteConfig(currentConfig.id))} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    value={currentConfig.name}
                    onChange={(e) => renameConfig(currentConfig.id, e.target.value)}
                    className="text-lg font-black text-slate-800 bg-transparent border-b border-transparent focus:border-brand-500 outline-none w-full"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">שביעות רצון:</span>
                    <span className={cn(
                      "text-[10px] font-black",
                      satisfaction >= 80 ? "text-green-600" : satisfaction >= 50 ? "text-amber-600" : "text-red-600"
                    )}>{satisfaction}%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${satisfaction}%` }}
                      className={cn(
                        "h-full transition-all duration-1000",
                        satisfaction >= 80 ? "bg-green-500" : satisfaction >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                    />
                  </div>
                </div>

                {/* Grid Config */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">מימדים</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400">טורים</span>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-brand-600">{currentConfig.cols}</span>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleGridResize('cols', 1)} className="p-0.5 hover:text-brand-600"><Plus className="w-3 h-3" /></button>
                          <button onClick={() => handleGridResize('cols', -1)} className="p-0.5 hover:text-brand-600"><Minus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400">שורות</span>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-brand-600">{currentConfig.rows}</span>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleGridResize('rows', 1)} className="p-0.5 hover:text-brand-600"><Plus className="w-3 h-3" /></button>
                          <button onClick={() => handleGridResize('rows', -1)} className="p-0.5 hover:text-brand-600"><Minus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unplaced Students */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">תלמידים להושבה</h3>
                      <Badge className="bg-slate-100 text-slate-600">{currentConfig.students.filter(s => !currentConfig.grid.includes(s.id)).length}</Badge>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="חיפוש..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-3 flex flex-wrap gap-2 content-start transition-colors hover:border-brand-300">
                    {currentConfig.students
                      .filter(s => !currentConfig.grid.includes(s.id))
                      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(student => (
                      <motion.button
                        key={student.id}
                        layoutId={`student-${student.id}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, student.id)}
                        onClick={() => setSelectedStudentId(selectedStudentId === student.id ? null : student.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm cursor-grab active:cursor-grabbing",
                          selectedStudentId === student.id ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"
                        )}
                      >
                        {student.name}
                      </motion.button>
                    ))}
                    {currentConfig.students.filter(s => !currentConfig.grid.includes(s.id)).length === 0 && (
                      <div className="w-full text-center py-4 text-xs font-medium text-slate-400">כל התלמידים משובצים 🎉</div>
                    )}
                  </div>
                </div>

                {/* Add Student */}
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">הוספת תלמיד</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newStudentName}
                      onChange={e => setNewStudentName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                      placeholder="שם התלמיד..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    />
                    <button 
                      onClick={handleAddStudent}
                      className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 gap-2 mt-auto pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={exportData} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">
                      <Download className="w-3 h-3" />
                      JSON
                    </button>
                    <button onClick={exportToExcel} className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 border border-emerald-100">
                      <Download className="w-3 h-3" />
                      Excel
                    </button>
                  </div>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer">
                    <Upload className="w-3 h-3" />
                    ייבוא קובץ
                    <input type="file" hidden onChange={handleFileUpload} accept=".json" />
                  </label>
                </div>
              </div>
            </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Classroom Display */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6 flex flex-col items-center">
          {/* Toolbar */}
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 mb-8 z-10">
            <button 
              onClick={() => setEditMode('normal')}
              className={cn("px-4 py-1.5 rounded-xl text-xs font-black transition-all", editMode === 'normal' ? "bg-brand-600 text-white" : "text-slate-500 hover:text-brand-600")}
            >
              עריכה רגילה
            </button>
            <button 
              onClick={() => setEditMode('structure')}
              className={cn("px-4 py-1.5 rounded-xl text-xs font-black transition-all", editMode === 'structure' ? "bg-brand-600 text-white" : "text-slate-500 hover:text-brand-600")}
            >
              הסתרת שולחן
            </button>
            <button 
              onClick={() => setEditMode('gapCol')}
              className={cn("px-4 py-1.5 rounded-xl text-xs font-black transition-all", editMode === 'gapCol' ? "bg-brand-600 text-white" : "text-slate-500 hover:text-brand-600")}
            >
              רווח טור
            </button>
            <button 
              onClick={() => setEditMode('gapRow')}
              className={cn("px-4 py-1.5 rounded-xl text-xs font-black transition-all", editMode === 'gapRow' ? "bg-brand-600 text-white" : "text-slate-500 hover:text-brand-600")}
            >
              רווח שורה
            </button>
            <div className="w-px h-4 bg-slate-200 mx-2" />
            <button 
              onClick={() => {
                confirmAction('ניקוי כיתה', 'בטוח שברצונך לנקות את כל השיבוצים?', () => {
                  updateCurrentConfig(prev => ({ ...prev, grid: Array(totalCells).fill(null) }));
                });
              }}
              className="text-xs font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl"
            >
              ניקוי כיתה
            </button>
          </div>

          <div className="relative w-full max-w-5xl flex flex-col items-center">
            {viewType === 'grid' ? (
              <>
                {/* Teacher Desk */}
                <div className="w-48 h-10 mx-auto mb-16 bg-gradient-to-b from-slate-200 to-slate-300 rounded-b-3xl flex items-center justify-center shadow-inner">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-80">שולחן מורה</span>
                </div>

                {/* The Grid */}
                <div 
                  className="grid gap-2 p-6 bg-white/60 rounded-[3rem] border border-white/80 backdrop-blur-md shadow-2xl shadow-slate-200/50"
                  style={{ 
                    gridTemplateColumns: `repeat(${currentConfig.cols}, minmax(0, 1fr))`,
                    columnGap: '1.25rem',
                    rowGap: '1.25rem'
                  }}
                >
                  {Array.from({ length: totalCells }).map((_, i) => {
                    const row = Math.floor(i / currentConfig.cols);
                    const col = i % currentConfig.cols;
                    return (
                      <React.Fragment key={i}>
                        {/* Row Gap */}
                        {col === 0 && row > 0 && currentConfig.rowGaps.includes(row) && (
                          <div 
                            className="col-span-full h-8 bg-slate-100/40 border-y border-slate-200/50 rounded-full my-1 flex items-center justify-center"
                            style={{ gridColumn: `1 / span ${currentConfig.cols}` }}
                          >
                            <div className="w-12 h-1 bg-slate-200 rounded-full opacity-50" />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-5">
                          {/* Column Gap */}
                          {col > 0 && currentConfig.columnGaps.includes(col) && (
                            <div className="w-6 h-full bg-slate-100/40 border-x border-slate-200/50 rounded-full mx-1 flex flex-col items-center justify-center shrink-0">
                               <div className="w-1 h-12 bg-slate-200 rounded-full opacity-50" />
                            </div>
                          )}
                          <Desk idx={i} />
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">שם התלמיד</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">מקום ישיבה</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentConfig.students
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(student => {
                        const seatIdx = currentConfig.grid.indexOf(student.id);
                        const { col, row } = idxToColRow(seatIdx);
                        return (
                          <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-black text-slate-700">{student.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              {seatIdx !== -1 ? (
                                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">
                                  שורה {row + 1}, טור {col + 1}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-400">לא משובץ</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => setEditingStudent(student)}
                                className="p-2 hover:bg-brand-50 rounded-lg text-brand-600"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* AI Overlay Panel */}
        <AnimatePresence>
          {isAIPanelOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <div>
                      <h2 className="text-lg font-black leading-tight">עוזר ה-AI הפדגוגי</h2>
                      <p className="text-xs text-indigo-100 opacity-80">תובנות סידור מבוססות על Gemini 1.5</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAIPanelOpen(false)} className="p-2 hover:bg-white/20 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* AI Weights Config */}
                  {!isLoadingAI && !aiResponse && (
                    <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">העדפות משקל AI</h3>
                      <div className="space-y-3">
                        {Object.entries(aiWeights).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                              <span>{key === 'preferred' ? 'חברים קרובים' : key === 'forbidden' ? 'הפרדות קריטיות' : 'פיזור כללי'}</span>
                              <span>{val}</span>
                            </div>
                            <input 
                              type="range" min="1" max="10" 
                              value={val}
                              onChange={(e) => setAiWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={callAIArrangement}
                        className="w-full py-3 mt-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"
                      >
                        <Sparkles className="w-4 h-4" />
                        הפעל ניתוח בינה מלאכותית
                      </button>
                    </div>
                  )}

                  {isLoadingAI ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-slate-500">ה-AI מנתח את מבנה הכיתה שלך...</p>
                    </div>
                  ) : (
                      <div className="prose prose-slate prose-sm rtl">
                          <div className="bg-indigo-50 border-r-4 border-indigo-500 p-4 rounded-lg mb-4">
                          <p className="text-sm text-indigo-900 leading-relaxed m-0 whitespace-pre-wrap">{aiResponse.replace(/\{"action":"arrange","grid":\[[^\]]*\]\}/g, '').trim()}</p>
                          {aiResponse.match(/\{"action":"arrange","grid":\[[^\]]*\]\}/) && (
                            <div className="flex flex-col gap-2 mt-4">
                              <button 
                                onClick={() => {
                                  const match = aiResponse.match(/\{"action":"arrange","grid":\[[^\]]*\]\}/);
                                  if (match) {
                                    try {
                                      const parsed = JSON.parse(match[0]);
                                      if (parsed.grid && Array.isArray(parsed.grid)) {
                                        updateCurrentConfig(prev => ({
                                          ...prev,
                                          grid: parsed.grid.map((id: any, i: number) => prev.hiddenDesks.includes(i) ? null : id)
                                        }));
                                        setIsAIPanelOpen(false);
                                        setAiResponse("");
                                      }
                                    } catch (e) {
                                      console.error("AI JSON parse error", e);
                                    }
                                  }
                                }}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-100"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                החל סידור מוצע
                              </button>
                              
                              <div className="flex items-center gap-2 mt-4 justify-center">
                                <span className="text-[10px] font-bold text-slate-400">האם ההצעה הייתה מועילה?</span>
                                <button className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-green-600 transition-colors">👍</button>
                                <button className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-red-600 transition-colors">👎</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200">
                  <button 
                    onClick={() => setIsAIPanelOpen(false)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    הבנתי, תודה
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student Edit Modal */}
        <AnimatePresence>
          {editingStudent && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={editingStudent.name}
                        onChange={e => {
                          const newName = e.target.value;
                          setEditingStudent(prev => prev ? { ...prev, name: newName } : null);
                        }}
                        placeholder="שם מלא"
                        className="text-2xl font-black text-slate-900 bg-transparent border-b-2 border-transparent focus:border-brand-500 outline-none w-full"
                      />
                      <input 
                        type="text" 
                        value={editingStudent.nickname || ""}
                        onChange={e => {
                          const newNickname = e.target.value;
                          setEditingStudent(prev => prev ? { ...prev, nickname: newNickname } : null);
                        }}
                        placeholder="שם קיצור (אופציונלי)"
                        className="text-xs font-bold text-slate-400 mt-1 bg-transparent border-b border-transparent focus:border-brand-300 outline-none w-full"
                      />
                    </div>
                    <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-slate-100 rounded-full">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Position Preferences */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">העדפות מיקום</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setEditingStudent(prev => prev ? { ...prev, frontPrefer: !prev.frontPrefer, backPrefer: false, tall: false, cornerPrefer: false } : null)}
                          className={cn("px-4 py-3 rounded-2xl text-sm font-bold border-2 transition-all text-center", editingStudent.frontPrefer ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500")}
                        >
                          ⬆️ קדמה
                        </button>
                        <button 
                          onClick={() => setEditingStudent(prev => prev ? { ...prev, backPrefer: !prev.backPrefer, frontPrefer: false, cornerPrefer: false } : null)}
                          className={cn("px-4 py-3 rounded-2xl text-sm font-bold border-2 transition-all text-center", editingStudent.backPrefer ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-100 text-slate-500")}
                        >
                          ⬇️ אחורה
                        </button>
                        <button 
                          onClick={() => setEditingStudent(prev => prev ? { ...prev, cornerPrefer: !prev.cornerPrefer, frontPrefer: false, backPrefer: false } : null)}
                          className={cn("px-4 py-3 rounded-2xl text-sm font-bold border-2 transition-all text-center", editingStudent.cornerPrefer ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-100 text-slate-500")}
                        >
                          📐 פינה
                        </button>
                        <button 
                          onClick={() => {
                            const seatIdx = currentConfig.grid.indexOf(editingStudent.id);
                            if (seatIdx !== -1) {
                              updateCurrentConfig(prev => ({
                                ...prev,
                                hiddenDesks: [...prev.hiddenDesks, seatIdx],
                                grid: prev.grid.map(id => id === editingStudent.id ? null : id)
                              }));
                              setEditingStudent(null);
                            }
                          }}
                          className="px-4 py-3 rounded-2xl text-sm font-bold border-2 border-dashed border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-all text-center"
                        >
                          🚫 הסתר מושב
                        </button>
                        <button 
                          onClick={() => setEditingStudent(prev => prev ? { ...prev, tall: !prev.tall, frontPrefer: false } : null)}
                          className={cn("px-4 py-3 rounded-2xl text-sm font-bold border-2 transition-all text-center", editingStudent.tall ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 text-slate-500")}
                        >
                          📏 גבוה
                        </button>
                      </div>
                    </div>

                    {/* Social Constraints */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">אילוצים חברתיים</h4>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 text-right" dir="rtl">
                        <div>
                          <p className="text-[11px] font-bold text-slate-600 mb-2">💚 ישבו ליד:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {currentConfig.students.filter(s => s.id !== editingStudent.id).map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setEditingStudent(prev => {
                                    if (!prev) return null;
                                    const preferred = prev.preferred.includes(s.id) 
                                      ? prev.preferred.filter(id => id !== s.id)
                                      : [...prev.preferred, s.id];
                                    return { 
                                      ...prev, 
                                      preferred, 
                                      forbidden: prev.forbidden.filter(id => id !== s.id),
                                      separateFrom: prev.separateFrom.filter(id => id !== s.id)
                                    };
                                  });
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all",
                                  editingStudent.preferred.includes(s.id) ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-500 border-slate-200"
                                )}
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-slate-600 mb-2">🔴 לא ישבו ליד:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {currentConfig.students.filter(s => s.id !== editingStudent.id).map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setEditingStudent(prev => {
                                    if (!prev) return null;
                                    const forbidden = prev.forbidden.includes(s.id) 
                                      ? prev.forbidden.filter(id => id !== s.id)
                                      : [...prev.forbidden, s.id];
                                    return { 
                                      ...prev, 
                                      forbidden, 
                                      preferred: prev.preferred.filter(id => id !== s.id),
                                      separateFrom: prev.separateFrom.filter(id => id !== s.id)
                                    };
                                  });
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all",
                                  editingStudent.forbidden.includes(s.id) ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-500 border-slate-200"
                                )}
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-slate-600 mb-2">↔️ הפרדה מקסימלית:</p>
                          <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                            {currentConfig.students.filter(s => s.id !== editingStudent.id).map(s => {
                              const isActive = editingStudent.separateFrom.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setEditingStudent(prev => {
                                      if (!prev) return null;
                                      const ids = prev.separateFrom.includes(s.id)
                                        ? prev.separateFrom.filter(id => id !== s.id)
                                        : [...prev.separateFrom, s.id];
                                      return { 
                                        ...prev, 
                                        separateFrom: ids,
                                        preferred: prev.preferred.filter(id => id !== s.id),
                                        forbidden: prev.forbidden.filter(id => id !== s.id)
                                      };
                                    });
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border-2 transition-all text-right",
                                    isActive ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-100 bg-white text-slate-400"
                                  )}
                                >
                                  <div className={cn(
                                    "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                                    isActive ? "bg-amber-500 border-amber-500 text-white" : "border-slate-300"
                                  )}>
                                    {isActive && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <span className="truncate">{s.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                  <button 
                    onClick={() => {
                      updateCurrentConfig(prev => ({
                        ...prev,
                        students: prev.students.map(s => s.id === editingStudent.id ? editingStudent : s)
                      }));
                      setEditingStudent(null);
                    }}
                    className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-xl shadow-brand-100 hover:bg-brand-700 active:scale-95 transition-all"
                  >
                    שמור שינויים
                  </button>
                  <button 
                    onClick={() => {
                      confirmAction('החזרה למאגר', 'להחזיר את התלמיד למאגר?', () => {
                        updateCurrentConfig(prev => ({ ...prev, grid: prev.grid.map(id => id === editingStudent.id ? null : id) }));
                        setEditingStudent(null);
                      });
                    }}
                    className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-50"
                  >
                    חזרה למאגר
                  </button>
                  <button 
                    onClick={() => {
                      confirmAction('מחיקת תלמיד', 'למחוק את התלמיד מהרשימה?', () => {
                        updateCurrentConfig(prev => ({
                          ...prev,
                          students: prev.students.filter(s => s.id !== editingStudent.id),
                          grid: prev.grid.map(id => id === editingStudent.id ? null : id)
                        }));
                        setEditingStudent(null);
                      });
                    }}
                    className="p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {confirmModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
              >
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{confirmModal.title}</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                  >
                    ביטול
                  </button>
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-100"
                  >
                    אישור
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Status Bar */}
      <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
        <div>ClassManager Pro v3.0 // Ready</div>
        <div className="flex gap-4">
          <span>{state.students.length} תלמידים</span>
          <span>•</span>
          <span>{state.grid.filter(id => id).length} משובצים</span>
        </div>
      </footer>
    </div>
  );
}
