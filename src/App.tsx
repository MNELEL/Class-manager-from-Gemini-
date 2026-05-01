import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  motion, 
  AnimatePresence, 
  Reorder,
  useMotionValue,
  useTransform
} from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
  Clock,
  Filter,
  Ruler,
  ShieldAlert,
  MoreVertical,
  Menu,
  Heart,
  Ban,
  GraduationCap,
  LineChart,
  UserPlus,
  School,
  ClipboardList,
  Upload,
  RotateCcw,
  Share2,
  CloudLightning,
  Grid3X3,
  Smile,
  Box,
  Brain,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  MousePointer,
  FileText
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Helper Components (Hoisted) ---

function Badge({ children, className, style, ...props }: { children: React.ReactNode, className?: string, style?: React.CSSProperties, [key: string]: any }) {
  return (
    <span style={style} className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight", className)} {...props}>
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

const TeacherDesk = ({ index, width, height, colPos, rowPos, editMode, updateCurrentConfig }: any) => {
  return (
    <motion.div
      layoutId="teacher-desk"
      whileHover={{ scale: 1.02 }}
      style={{
        gridColumn: `${colPos} / span ${width}`,
        gridRow: `${rowPos} / span ${height}`,
      }}
      draggable={editMode === 'structure'}
      onDragStart={(e) => {
        if (editMode === 'structure') {
          e.dataTransfer.setData('type', 'teacher-desk');
          e.dataTransfer.setData('index', index.toString());
        }
      }}
      className={cn(
        "bg-brand-700 text-white rounded-3xl border-b-[12px] border-brand-900 shadow-2xl flex flex-col items-center justify-center gap-2 z-40 transition-all",
        editMode === 'structure' ? "ring-4 ring-amber-400 cursor-move" : "cursor-default"
      )}
    >
      <div className="w-12 h-1 bg-white/20 rounded-full" />
      <div className="flex items-center gap-3">
        <School className="w-8 h-8 text-brand-200" />
        <span className="text-xl font-black uppercase tracking-widest">שולחן מורה</span>
      </div>
      {editMode === 'structure' && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, index: -1 } }));
          }}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-lg border border-slate-100 hover:bg-rose-600 hover:text-white transition-all scale-75 hover:scale-100"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </motion.div>
  );
};

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
  selectedStudentId,
  onDrop,
  updateCurrentConfig,
  currentConfig,
  is3DView,
  activeDeskIdx,
  onShowHistory,
  onShowProfile,
  setNotifications
}: any) => {
  const [isOver, setIsOver] = useState(false);
  const draggingS = currentConfig.students.find((s: any) => s.id === draggedStudentId);
  const isCompatible = draggingS && draggingS.height === 'short' ? Math.floor(idx / currentConfig.cols) < 2 : true;
  const compatibilityClass = isOver ? (isCompatible ? "bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100" : "bg-rose-50 border-rose-300 ring-4 ring-rose-100") : "";

  const isSelected = studentId && selectedStudentId === studentId;
  const isObstruction = currentConfig.obstructions?.includes(idx);

  if ((isHidden || isObstruction) && editMode === 'normal') return <div style={{ gridColumn: colPos, gridRow: rowPos }} className="aspect-square bg-transparent flex items-center justify-center">
    {isObstruction && <ShieldAlert className="w-5 h-5 text-slate-200" />}
  </div>;

  const handleDeskDragStart = (e: React.DragEvent) => {
    if (editMode === 'structure' && !isHidden) {
      e.dataTransfer.setData('type', 'desk');
      e.dataTransfer.setData('fromIndex', idx.toString());
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDeskDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const type = e.dataTransfer.getData('type');
    
    if (type === 'desk' && editMode === 'structure') {
      const fromIdx = parseInt(e.dataTransfer.getData('fromIndex'));
      if (fromIdx === idx) return;

      updateCurrentConfig((prev: any) => {
        const newGrid = [...prev.grid];
        
        // Swap hidden state if target is hidden
        const isTargetHidden = prev.hiddenDesks.includes(idx);
        if (isTargetHidden) {
          const updatedHidden = prev.hiddenDesks.filter((i: number) => i !== idx).concat([fromIdx]);
          newGrid[idx] = prev.grid[fromIdx];
          newGrid[fromIdx] = null;
          return { ...prev, hiddenDesks: updatedHidden, grid: newGrid };
        } else {
          const tempStudent = newGrid[idx];
          newGrid[idx] = newGrid[fromIdx];
          newGrid[fromIdx] = tempStudent;
          return { ...prev, grid: newGrid };
        }
      });
    } else if (type === 'teacher-desk' && editMode === 'structure') {
      updateCurrentConfig((prev: any) => ({
        ...prev,
        hiddenDesks: prev.hiddenDesks.includes(idx) ? prev.hiddenDesks : [...prev.hiddenDesks, idx],
        teacherDesk: { ...prev.teacherDesk, index: idx }
      }));
    } else if (!type || type === 'student') {
      if (!isHidden) onDrop(idx);
    }
  };

  return (
    <motion.div 
      layoutId={`desk-${idx}`}
      data-student-id={studentId || undefined}
      draggable={editMode === 'structure' && !isHidden}
      onDragStart={handleDeskDragStart}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDeskDrop}
      onContextMenu={(e) => {
        if (editMode === 'structure') {
          e.preventDefault();
          if (!isHidden) {
            updateCurrentConfig((prev: any) => ({
              ...prev,
              hiddenDesks: [...prev.hiddenDesks, idx],
              grid: prev.grid.map((val: any, i: number) => i === idx ? null : val)
            }));
          }
        }
      }}
      whileHover={is3DView ? { scale: 1.02, y: -8, rotateX: 2, rotateY: -2 } : { scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={isSelected ? { scale: 1.1, y: -10, z: 50 } : { scale: 1, y: 0, z: 0 }}
      style={{ 
        gridColumn: colPos, 
        gridRow: rowPos,
        ...(is3DView && !isHidden ? {
          transform: `translateZ(${idx === activeDeskIdx ? '80px' : '40px'}) rotateX(0deg)`,
          boxShadow: idx === activeDeskIdx || isSelected
            ? '0 40px 80px rgba(0,0,0,0.3)' 
            : '0 20px 40px rgba(0,0,0,0.15)',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease'
        } : {})
      }}
      onClick={() => {
        if (editMode === 'structure') {
           if (isObstruction) {
            updateCurrentConfig((prev: any) => ({
              ...prev,
              obstructions: prev.obstructions.filter((i: number) => i !== idx),
              hiddenDesks: prev.hiddenDesks.filter((i: number) => i !== idx)
            }));
           } else if (isHidden) {
            updateCurrentConfig((prev: any) => ({
              ...prev,
              obstructions: [...(prev.obstructions || []), idx]
            }));
           } else {
            updateCurrentConfig((prev: any) => ({
              ...prev,
              hiddenDesks: [...prev.hiddenDesks, idx],
              grid: prev.grid.map((val: any, i: number) => i === idx ? null : val)
            }));
           }
        } else if (!isHidden && !isObstruction) {
          onShowHistory(idx);
        }
      }}
      className={cn(
        "aspect-square rounded-[2rem] transition-all flex flex-col items-center justify-center cursor-pointer relative group",
        isObstruction ? "bg-slate-100 border-2 border-slate-300 opacity-80" :
        isHidden ? "border-2 border-dashed border-slate-200 bg-slate-50/30 opacity-60 hover:opacity-100 hover:border-brand-400 hover:bg-brand-50" :
        !student ? "bg-slate-50/30 border border-slate-100 hover:bg-slate-50" : "bg-white border border-brand-100 shadow-sm ring-2 ring-brand-50",
        compatibilityClass,
        isSelected && "ring-4 ring-brand-400 border-brand-500 shadow-2xl z-50",
        editMode === 'structure' && !isHidden && !isObstruction && "cursor-move hover:ring-2 hover:ring-amber-300"
      )}
    >
      {editMode === 'structure' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-1"
        >
          {isObstruction ? (
            <>
              <ShieldAlert className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">הפרעה/עמוד</span>
            </>
          ) : isHidden ? (
            <>
              <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:scale-110 transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[8px] font-black text-slate-400 group-hover:text-brand-600 uppercase tracking-tighter">הוסף</span>
            </>
          ) : null}
        </motion.div>
      )}

      {/* Desk Surface Visualization */}
      {!isHidden && !isObstruction && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      )}
      
      {showDeskNumbers && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-black text-slate-400">#{idx + 1}</span>}
      
      {student ? (
        <div className="flex flex-col items-center gap-1 w-full">
           {/* Chair Backrest Icon */}
           <div className="w-10 h-7 bg-slate-200 rounded-t-lg -mb-2 z-0 border border-slate-300 shadow-inner flex items-center justify-center">
             <div className="w-5 h-1 bg-slate-300 rounded-full" />
           </div>
           
           <div className="z-10 flex flex-col items-center bg-white px-5 py-2.5 rounded-2xl border-2 border-slate-400 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] relative w-[90%]">
             <span className="text-lg font-black text-slate-900 leading-tight">{student.name}</span>
             {student.height === 'short' && <Badge className="bg-amber-100 text-amber-900 font-black scale-[0.9] mt-1 border border-amber-200">קדמי</Badge>}
             
             {/* Group Dot Indicators */}
             {student.groups && student.groups.length > 0 && (
               <div className="absolute -top-2 -right-2 flex gap-1">
                 {student.groups.map((g: string, i: number) => {
                   const gIdx = ['א', 'ב', 'ג'].indexOf(g);
                   const colors = ['bg-brand-500', 'bg-amber-500', 'bg-emerald-500'];
                   return (
                    <div key={i} className={cn("w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm", colors[gIdx % colors.length] || 'bg-slate-400')} title={`קבוצה ${g}`} />
                   );
                 })}
               </div>
             )}
           </div>
           
           {/* Desk Shadow Area */}
           <div className="w-12 h-1.5 bg-slate-300/40 rounded-full blur-[2px] mt-2" />
           
            <button 
              onClick={(e) => {
                e.stopPropagation();
                updateCurrentConfig((prev: any) => {
                  const newGrid = [...prev.grid];
                  newGrid[idx] = null;
                  return { ...prev, grid: newGrid };
                });
                setNotifications((prev: any) => [{ id: Date.now(), text: `השיבוץ בוטל: ${student.name} הוחזר למאגר`, type: 'info' }, ...prev]);
              }}
              title="ביטול שיבוץ"
              className="absolute -top-3 -right-3 w-10 h-10 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white hover:border-rose-700 transition-all shadow-xl z-30 scale-90 hover:scale-110 active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onShowProfile();
              }}
              title="צפייה בפרופיל"
              className="absolute -bottom-3 -left-3 w-10 h-10 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-brand-600 hover:text-white hover:border-brand-700 transition-all shadow-xl z-30 scale-90 hover:scale-110 active:scale-95"
            >
              <Eye className="w-5 h-5" />
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

// --- Views ---

const AttendanceView = ({ students, onBack }: { students: any[], onBack: () => void }) => (
  <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar">
    <div className="flex items-center gap-4">
      <button 
        onClick={onBack}
        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <div className="flex items-center justify-between flex-1">
        <h2 className="text-2xl font-black text-slate-700">נוכחות יומית</h2>
        <Badge className="bg-emerald-50 text-emerald-600">יום שלישי, 28 באפריל</Badge>
      </div>
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

const GradesView = ({ onBack }: { onBack: () => void }) => (
  <div className="p-8 space-y-8 h-full overflow-y-auto flex flex-col">
    <div className="flex items-center gap-4">
      <button 
        onClick={onBack}
        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <h2 className="text-2xl font-black text-slate-700">ניהול ציונים</h2>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
      <div className="p-6 bg-brand-50 rounded-full">
        <GraduationCap className="w-12 h-12 text-brand-600" />
      </div>
      <p className="max-w-md text-slate-500 font-medium">כאן תוכלו לראות ולנהל את הישגי התלמידים. מודול הציונים בבנייה ויעלה בקרוב בגרסה 3.1.</p>
    </div>
  </div>
);

const ProgressView = ({ onBack }: { onBack: () => void }) => (
  <div className="p-8 space-y-8 h-full overflow-y-auto flex flex-col">
    <div className="flex items-center gap-4">
      <button 
        onClick={onBack}
        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <h2 className="text-2xl font-black text-slate-700">גרף התקדמות</h2>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
      <div className="p-6 bg-indigo-50 rounded-full">
        <LineChart className="w-12 h-12 text-indigo-600" />
      </div>
      <p className="max-w-md text-slate-500 font-medium">מעקב אחר יעדים פדגוגיים ושינויי התנהגות לאורך זמן. מודול זה בבנייה בקרוב.</p>
    </div>
  </div>
);

const StudentDetailView = ({ student, onBack, updateCurrentConfig, students, onSelectStudent }: { student: any, onBack: () => void, updateCurrentConfig: (update: any) => void, students: any[], onSelectStudent: (id: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'behavior' | 'attendance' | 'ai'>('info');

  const currentIndex = students.findIndex(s => s.id === student.id);
  const prevStudent = students[currentIndex - 1];
  const nextStudent = students[currentIndex + 1];

  const updateStudent = (field: string, value: any) => {
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => s.id === student.id ? { ...s, [field]: value } : s)
    }));
  };

  const updateAreaPref = (field: string, value: any) => {
    const currentPref = student.areaPref || {};
    updateStudent('areaPref', { ...currentPref, [field]: value });
  };

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar bg-slate-50">
      <div className="flex items-center gap-6">
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="p-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="flex gap-1">
            <button 
              disabled={!prevStudent}
              onClick={() => onSelectStudent(prevStudent.id)}
              className="p-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95 disabled:opacity-30"
              title="תלמיד הקודם"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button 
              disabled={!nextStudent}
              onClick={() => onSelectStudent(nextStudent.id)}
              className="p-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95 disabled:opacity-30"
              title="תלמיד הבא"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[2rem] bg-brand-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
              {student.name[0]}
            </div>
            <div>
              <input 
                value={student.name}
                onChange={(e) => updateStudent('name', e.target.value)}
                className="text-3xl font-black text-slate-900 tracking-tight bg-transparent border-0 p-0 focus:ring-0"
              />
              <div className="flex gap-2 mt-1">
                <Badge className="bg-brand-50 text-brand-600 border border-brand-200">ID: {student.id}</Badge>
                <select 
                  value={student.height}
                  onChange={(e) => updateStudent('height', e.target.value)}
                  className="bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-3 py-0.5 text-xs font-black focus:ring-0"
                >
                  <option value="short">קדמי</option>
                  <option value="medium">בינוני</option>
                  <option value="tall">גבוה</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-[1.5rem] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
              <Download className="w-5 h-5" />
              ייצוא דוח
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-white border-2 border-slate-100 rounded-[2rem] w-fit shadow-sm">
        {(['info', 'ai', 'academic', 'behavior', 'attendance'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-8 py-3 rounded-[1.5rem] text-sm font-black transition-all",
              activeTab === tab ? "bg-brand-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            {tab === 'info' ? 'מידע כללי' : tab === 'ai' ? 'הגדרות AI' : tab === 'academic' ? 'הישגים' : tab === 'behavior' ? 'התנהגות' : 'נוכחות'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {activeTab === 'info' && (
          <>
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <Heart className="w-6 h-6 text-rose-500" />
                  העדפות חברתיות (חברים)
                </h3>
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 font-medium italic">הזן מזהי תלמידים ש {student.name} רוצה לשבת לידם (מופרדים בפסיק):</p>
                  <input 
                    value={student.preferred?.join(', ') || ''}
                    onChange={(e) => updateStudent('preferred', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="לדוגמה: 1, 5, 12"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-brand-500 outline-none transition-all"
                  />
                  <div className="flex flex-wrap gap-2">
                    {student.preferred?.map((id: string) => (
                      <Badge key={id} className="bg-rose-50 text-rose-600 border border-rose-100">{id}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <Ban className="w-6 h-6 text-slate-500" />
                  הפרדות מנדטוריות
                </h3>
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 font-medium italic">הזן מזהי תלמידים ש {student.name} לא צריך לשבת לידם:</p>
                  <input 
                    value={student.forbidden?.join(', ') || ''}
                    onChange={(e) => updateStudent('forbidden', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="לדוגמה: 2, 8"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-500" />
                  הערות פדגוגיות
                </h3>
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 font-medium italic">תיעוד חופשי על התלמיד, נקודות לשימור ושיפור:</p>
                  <textarea 
                    value={student.notes || ''}
                    rows={4}
                    onChange={(e) => updateStudent('notes', e.target.value)}
                    placeholder="הזן הערה..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-800 focus:border-brand-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] shadow-sm">
                 <h3 className="text-lg font-black text-slate-900 mb-4">קבוצות פדגוגיות</h3>
                 <div className="flex flex-wrap gap-2">
                    {['א', 'ב', 'ג', 'ד'].map(g => (
                      <button 
                         key={g}
                         onClick={() => {
                           const groups = student.groups || [];
                           updateStudent('groups', groups.includes(g) ? groups.filter((pg: string) => pg !== g) : [...groups, g]);
                         }}
                         className={cn(
                           "px-4 py-2 rounded-xl text-sm font-black transition-all",
                           student.groups?.includes(g) ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-500 border border-slate-100"
                         )}
                      >
                        קבוצה {g}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white border-2 border-slate-200 p-10 rounded-[4rem] shadow-sm space-y-10">
              <div className="flex items-center gap-4">
                 <Sparkles className="w-8 h-8 text-indigo-600" />
                 <div>
                    <h3 className="text-2xl font-black text-slate-900">אילוצי מיקום חכמים</h3>
                    <p className="text-slate-500 font-medium">הגדרות אלו משפיעות ישירות על האופטימיזציה של ה-AI</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-sm font-black text-slate-600 uppercase tracking-widest">משקולת חשיבות (0-300)</label>
                      <input 
                        type="range" min="0" max="300" step="10"
                        value={student.areaPref?.weight || 50}
                        onChange={(e) => updateAreaPref('weight', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-brand-500"
                      />
                      <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>נמוכה</span>
                        <span className="text-brand-600 font-black">{student.areaPref?.weight || 50}</span>
                        <span>קריטית</span>
                      </div>
                   </div>

                   <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                      <input 
                         type="checkbox"
                         checked={!!student.areaPref?.isolated}
                         onChange={(e) => updateAreaPref('isolated', e.target.checked)}
                         className="w-5 h-5 rounded-lg text-brand-600 border-slate-300 focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <span className="block font-black text-slate-800">בידוד (Isolated)</span>
                        <span className="text-xs font-bold text-slate-500">ה-AI ינסה להושיב את התלמיד ללא שכנים קרובים</span>
                      </div>
                   </label>

                   <div className="space-y-3">
                      <label className="text-sm font-black text-slate-600 uppercase tracking-widest">מיקום מועדף (Row/Col)</label>
                      <div className="flex gap-4">
                        <select 
                          value={student.areaPref?.row ?? ""}
                          onChange={(e) => updateAreaPref('row', e.target.value === "" ? undefined : parseInt(e.target.value))}
                          className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none"
                        >
                          <option value="">בחר שורה...</option>
                          {Array.from({ length: 10 }).map((_, i) => <option key={i} value={i}>שורה {i + 1}</option>)}
                        </select>
                        <select 
                          value={student.areaPref?.col ?? ""}
                          onChange={(e) => updateAreaPref('col', e.target.value === "" ? undefined : parseInt(e.target.value))}
                          className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none"
                        >
                          <option value="">בחר טור...</option>
                          {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i}>טור {i + 1}</option>)}
                        </select>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-sm font-black text-slate-600 uppercase tracking-widest text-indigo-600">אילוץ מיוחד</label>
                      <select 
                         value={student.areaPref?.special || ""}
                         onChange={(e) => updateAreaPref('special', e.target.value)}
                         className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-xl p-4 font-black text-indigo-700 outline-none"
                      >
                         <option value="">ללא אילוץ מיוחד</option>
                         <option value="window_or_microwave">ליד חלון או קצה כיתה (טור 1 או אחרון)</option>
                      </select>
                   </div>

                   <p className="p-4 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold rounded-2xl">
                     שים לב: ה-AI משקלל את כל האילוצים יחד. אילוצים סותרים עשויים להוביל לציון אופטימיזציה נמוך יותר.
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="lg:col-span-3 bg-white border-2 border-slate-200 p-10 rounded-[4rem] shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
            <div className="p-8 bg-brand-50 rounded-full">
              <GraduationCap className="w-16 h-16 text-brand-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 italic">"המסע אל הידע הוא אינסופי"</h3>
              <p className="mt-4 text-slate-500 max-w-md mx-auto font-medium">כאן תוצג היסטוריית הציונים, המבחנים והעבודות. מודול האנליטיקה הלימודית יהיה זמין החל מגרסה 3.3.</p>
            </div>
          </div>
        )}

        {activeTab === 'behavior' && (
          <div className="lg:col-span-3 bg-white border-2 border-slate-200 p-10 rounded-[4rem] shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
            <div className="p-8 bg-amber-50 rounded-full">
              <Smile className="w-16 h-16 text-amber-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">מעקב התנהגות רגשי</h3>
              <p className="mt-4 text-slate-500 max-w-md mx-auto font-medium">תיעוד נקודות חיוביות, דיווחים וציוני דרך חברתיים. המערכת תספק תובנות AI על דפוסי התנהגות.</p>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
           <div className="lg:col-span-3 bg-white border-2 border-slate-200 p-8 rounded-[3rem] shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-900">יומן נוכחות מפורט</h3>
               <div className="flex gap-4">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                   <span className="text-xs font-bold text-slate-500">נוכח</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-rose-500 rounded-full" />
                   <span className="text-xs font-bold text-slate-500">נעדר</span>
                 </div>
               </div>
             </div>
             <div className="grid grid-cols-7 gap-4">
               {Array.from({ length: 35 }).map((_, i) => {
                 const isWeekend = i % 7 >= 5;
                 const isAbsent = i === 14 || i === 22;
                 return (
                   <div 
                     key={i} 
                     className={cn(
                       "aspect-square rounded-2xl flex items-center justify-center text-xs font-black transition-all",
                       isWeekend ? "bg-slate-50 text-slate-300" :
                       isAbsent ? "bg-rose-50 text-rose-500 border-2 border-rose-100" : 
                       "bg-emerald-50 text-emerald-600 border-2 border-emerald-100"
                     )}
                   >
                     {i + 1}
                   </div>
                 );
               })}
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

const DashboardView = ({ stats, onBack }: any) => (
  <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50">
    <div className="flex items-center gap-6">
      <button 
        onClick={onBack}
        className="p-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>
      <div className="flex items-center justify-between flex-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">סיכום מערכת</h2>
        <Badge className="bg-brand-600 text-white border-brand-700 px-4 py-2 text-sm shadow-md">דוא"ט ניהולי</Badge>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] space-y-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <div className="relative flex items-center justify-between">
          <div className="p-4 bg-brand-100 rounded-2xl border border-brand-200 shadow-inner">
            <Users className="w-8 h-8 text-brand-700" />
          </div>
          <Badge className="bg-brand-50 text-brand-600 border border-brand-200">פעיל</Badge>
        </div>
        <div className="relative">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">תלמידים רשומים</h3>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.studentCount || 0}</p>
        </div>
      </div>
      
      <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] space-y-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <div className="relative flex items-center justify-between">
          <div className="p-4 bg-amber-100 rounded-2xl border border-amber-200 shadow-inner">
            <Sparkles className="w-8 h-8 text-amber-700" />
          </div>
          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200">98% נוכחות</Badge>
        </div>
        <div className="relative">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">שביעות רצון</h3>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.satisfaction || 0}%</p>
        </div>
      </div>
      
      <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] space-y-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <div className="relative flex items-center justify-between">
          <div className="p-4 bg-indigo-100 rounded-2xl border border-indigo-200 shadow-inner">
            <LayoutGrid className="w-8 h-8 text-indigo-700" />
          </div>
          <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-200">מעודכן</Badge>
        </div>
        <div className="relative">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">שיבוץ נוכחי</h3>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.placedCount || 0} / {stats.studentCount || 0}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] space-y-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <div className="relative flex items-center justify-between">
          <div className="p-4 bg-rose-100 rounded-2xl border border-rose-200 shadow-inner">
            <AlertCircle className="w-8 h-8 text-rose-700" />
          </div>
          <Badge className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase", stats.conflicts > 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100")}>
            {stats.conflicts > 0 ? "נדרש טיפול" : "תקין"}
          </Badge>
        </div>
        <div className="relative">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">אילוצים לא פתורים</h3>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.conflicts || 0}</p>
        </div>
      </div>
    </div>
  </div>
);

const StudentCard = ({ student, updateCurrentConfig, setNotifications, isSelected, onClick }: any) => {
  const [localName, setLocalName] = useState(student.name);

  useEffect(() => {
    setLocalName(student.name);
  }, [student.name]);

  const commitName = () => {
    if (localName === student.name) return;
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => s.id === student.id ? { ...s, name: localName } : s)
    }));
  };

  const updateStudent = (field: string, value: any) => {
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => s.id === student.id ? { ...s, [field]: value } : s)
    }));
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-5 hover:border-brand-200 transition-all group cursor-pointer",
        isSelected && "ring-4 ring-brand-200 border-brand-300 bg-brand-50/30"
      )}
    >
      <div className="flex items-center justify-between">
        <input 
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && commitName()}
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent font-black text-slate-700 focus:ring-0 border-0 p-0 w-32 text-sm"
        />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`האם למחוק את ${student.name}?`)) {
              updateCurrentConfig((prev: any) => ({ 
                ...prev, 
                students: prev.students.filter((s:any) => s.id !== student.id),
                grid: prev.grid.map((id: string | null) => id === student.id ? null : id)
              }));
              setNotifications((prev: any) => [{ id: Date.now(), text: `התלמיד ${student.name} נמחק`, type: 'info' }, ...prev]);
            }
          }}
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Height Selection (Radio-like) */}
        <div className="flex flex-col gap-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">גובה תלמיד</label>
           <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
             {(['short', 'medium', 'tall'] as const).map(h => (
               <button
                 key={h}
                 onClick={(e) => { e.stopPropagation(); updateStudent('height', h); }}
                 className={cn(
                   "flex-1 py-1 rounded-lg text-[9px] font-black transition-all",
                   student.height === h ? "bg-brand-600 text-white" : "text-slate-400 hover:bg-slate-50"
                 )}
               >
                 {h === 'short' ? 'קדמי' : h === 'medium' ? 'בינוני' : 'גבוה'}
               </button>
             ))}
           </div>
        </div>

        {/* Group Management */}
        <div className="flex flex-col gap-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">קבוצות</label>
           <div className="flex flex-wrap gap-1">
             {['א', 'ב', 'ג'].map(g => (
               <button
                 key={g}
                 onClick={(e) => {
                   e.stopPropagation();
                   const groups = student.groups || [];
                   updateStudent('groups', groups.includes(g) ? groups.filter((pg: string) => pg !== g) : [...groups, g]);
                 }}
                 className={cn(
                   "px-2 py-1 rounded-lg text-[9px] font-black border transition-all",
                   student.groups?.includes(g) ? "bg-brand-100 border-brand-200 text-brand-700" : "bg-white border-slate-100 text-slate-400"
                 )}
               >
                 {g}
               </button>
             ))}
           </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">הערות</label>
           <textarea 
             value={student.notes || ''}
             rows={1}
             onChange={(e) => updateStudent('notes', e.target.value)}
             onClick={(e) => e.stopPropagation()}
             placeholder="הערה פדגוגית..."
             className="w-full bg-white border border-slate-100 rounded-xl p-2 text-xs font-medium text-slate-600 focus:ring-1 focus:ring-brand-200 outline-none resize-none"
           />
        </div>

        <div className="p-3 bg-white/50 rounded-2xl border border-slate-100/50 space-y-2">
           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">עריכת אילוצים (IDs)</h4>
           <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                 <Heart className="w-3 h-3 text-rose-500 shrink-0" />
                 <input 
                    placeholder="מזהי חברים (מופרדים בפסיק)"
                    value={student.preferred.join(', ')}
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
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
  );
};

const SettingsView = ({ 
  onBack, 
  handleFileImport, 
  aiWeights, 
  setAiWeights, 
  accessibility, 
  setAccessibility, 
  currentConfig, 
  updateCurrentConfig, 
  setNotifications,
  selectedStudentId,
  setSelectedStudentId,
  setViewType,
  exportToPDF,
  exportToJSON
}: any) => {
  const fileRef = useRef<HTMLInputElement>(null);
  
  const loadExampleData = () => {
    if (confirm("פעולה זו תחליף את כל נתוני התלמידים והמבנה הנוכחיים בנתוני הדוגמה מהסימולציה. האם להמשיך?")) {
      const demoStudents = [
        "נתי אורדמן", "אוריאל אנסבכר", "חיים בן פורת", "דניאל גוטרמן",
        "חיים גולדמן", "ניסים דיין", "מוישי הריסון", "אברימי זיאת",
        "ציקי יורקוביץ", "מיכאל יעקובי", "אלחנן כהן", "כתריאל לוי",
        "מלאכי לינצר", "אליהו מויאל", "מאיר מיימון", "נדב מלול",
        "איתמר משולם", "אביתר עמר", "מנחם פודור", "גידי פולסקי",
        "יהונתן פז", "ישי כוחלני", "יוסף קמחי", "בן ציון קצב",
        "נדב רובין", "יהונתן רוזן", "אברהם ריין", "אריאל שטאובר",
        "איתי שלזינגר", "דניאל ששון", "אוריה תם", "יצחק וולק"
      ].map((name, i) => ({
        id: (i + 1).toString(),
        name,
        preferred: [] as string[],
        forbidden: [] as string[],
        height: 'medium' as any,
        groups: [] as string[],
        areaPref: {} as any
      }));

      const wants: Record<string, string[]> = {
        "נתי אורדמן": ["חיים גולדמן", "אוריאל אנסבכר", "ציקי יורקוביץ", "ישי כוחלני"],
        "אוריאל אנסבכר": ["ישי כוחלני", "מלאכי לינצר", "אריאל שטאובר"],
        "חיים בן פורת": ["נדב רובין", "מוישי הריסון", "מלאכי לינצר", "נתי אורדמן", "אליהו מויאל", "גידי פולסקי"],
        "דניאל גוטרמן": ["אברהם ריין", "נדב רובין", "מיכאל יעקובי", "כתריאל לוי"],
        "חיים גולדמן": ["נתי אורדמן", "מלאכי לינצר", "אליהו מויאל", "נדב רובין"],
        "מוישי הריסון": ["אליהו מויאל", "נתי אורדמן", "גידי פולסקי", "נדב רובין"],
        "ציקי יורקוביץ": ["נתי אורדמן", "אוריאל אנסבכר", "חיים גולדמן", "מיכאל יעקובי"],
        "מיכאל יעקובי": ["נדב רובין", "חיים גולדמן", "בן ציון קצב", "דניאל גוטרמן"],
        "אלחנן כהן": ["מיכאל יעקובי", "יהונתן רוזן", "יהונתן פז", "אביתר עמר"],
        "כתריאל לוי": ["יצחק וולק", "ישי כוחלני", "חיים גולדמן"],
        "מלאכי לינצר": ["חיים גולדמן", "נתי אורדמן", "נדב רובין"],
        "אליהו מויאל": ["חיים גולדמן", "ישי כוחלני", "ציקי יורקוביץ", "מלאכי לינצר", "נדב רובין", "מוישי הריסון", "איתמר משולם", "יצחק וולק", "מנחם פודור"],
        "נדב מלול": ["נדב רובין", "אביתר עמר"],
        "איתמר משולם": ["ישי כוחלני", "אליהו מויאל", "נתי אורדמן", "חיים גולדמן"],
        "יהונתן פז": ["אלחנן כהן", "נדב רובין", "ישי כוחלני", "מיכאל יעקובי"],
        "ישי כוחלני": ["איתמר משולם", "נתי אורדמן", "חיים גולדמן"],
        "יוסף קמחי": ["נתי אורדמן", "אוריאל אנסבכר", "נדב רובין", "מלאכי לינצר"],
        "בן ציון קצב": ["חיים גולדמן", "מיכאל יעקובי", "נתי אורדמן", "אליהו מויאל"],
        "נדב רובין": ["מיכאל יעקובי", "חיים גולדמן", "מלאכי לינצר", "נתי אורדמן"],
        "יהונתן רוזן": ["אביתר עמר", "אלחנן כהן", "מיכאל יעקובי", "דניאל גוטרמן"],
        "אברהם ריין": ["דניאל גוטרמן", "מלאכי לינצר", "מיכאל יעקובי"],
        "אריאל שטאובר": ["אוריאל אנסבכר", "אברימי זיאת", "ישי כוחלני", "אוריה תם"],
        "איתי שלזינגר": ["חיים גולדמן", "אליהו מויאל", "יצחק וולק", "גידי פולסקי", "מלאכי לינצר", "מוישי הריסון"],
        "דניאל ששון": ["אוריאל אנסבכר", "אליהו מויאל", "מיכאל יעקובי"],
        "אוריה תם": ["מלאכי לינצר", "יצחק וולק", "אליהו מויאל", "מוישי הריסון", "נדב רובין"],
        "יצחק וולק": ["אליהו מויאל", "חיים גולדמן", "מוישי הריסון", "אוריאל אנסבכר"],
      };

      const avoid: Record<string, string[]> = {
        "נתי אורדמן": ["איתי שלזינגר", "נדב מלול", "איתמר משולם", "יהונתן רוזן"],
        "אוריאל אנסבכר": ["יהונתן רוזן", "נדב מלול", "ניסים דיין", "אברהם ריין"],
        "חיים בן פורת": ["אלחנן כהן", "יהונתן רוזן", "נדב מלול", "אביתר עמר", "מאיר מיימון"],
        "דניאל גוטרמן": ["איתי שלזינגר", "יהונתן רוזן", "יהונתן פז", "יוסף קמחי", "אביתר עמר", "נדב מלול", "אריאל שטאובר", "אלחנן כהן"],
        "חיים גולדמן": ["אלחנן כהן", "נדב מלול", "יהונתן פז", "יהונתן רוזן", "חיים בן פורת", "אביתר עמר", "אברהם ריין", "איתמר משולם"],
        "מוישי הריסון": ["יהונתן רוזן", "אלחנן כהן", "מאיר מיימון", "נדב מלול"],
        "אברימי זיאת": ["יהונתן רוזן"],
        "ציקי יורקוביץ": ["יהונתן פז", "איתי שלזינגר", "נדב מלול", "אלחנן כהן", "אביתר עמר"],
        "מיכאל יעקובי": ["מאיר מיימון", "יוסף קמחי", "יהונתן רוזן", "נדב מלול"],
        "אלחנן כהן": ["חיים בן פורת", "מנחם פודור", "מוישי הריסון", "יוסף קמחי", "דניאל ששון"],
        "כתריאל לוי": ["מאיר מיימון", "נדב מלול", "אלחנן כהן"],
        "מלאכי לינצר": ["איתי שלזינגר", "יהונתן רוזן", "נדב מלול", "מאיר מיימון", "אלחנן כהן"],
        "אליהו מויאל": ["אלחנן כהן", "נדב מלול", "יהונתן רוזן", "אברהם ריין", "אביתר עמר"],
        "נדב מלול": ["יהונתן רוזן", "מלאכי לינצר"],
        "איתמר משולם": ["איתי שלזינגר", "יהונתן פז", "יהונתן רוזן", "אברהם ריין", "אלחנן כהן", "נדב מלול"],
        "מנחם פודור": ["אלחנן כהן", "אביתר עמר", "נדב מלול", "יהונתן רוזן", "יוסף קמחי"],
        "יהונתן פז": ["יוסף קמחי", "דניאל ששון", "אריאל שטאובר", "איתי שלזינגר", "מוישי הריסון"],
        "ישי כוחלני": ["נדב מלול", "אלחנן כהן"],
        "יוסף קמחי": ["אברימי זיאת", "מנחם פודור", "איתי שלזינגר", "אלחנן כהן", "דניאל ששון"],
        "בן ציון קצב": ["אלחנן כהן", "יהונתן רוזן", "אביתר עמר", "נדב מלול"],
        "נדב רובין": ["אלחנן כהן", "נדב מלול", "יהונתן רוזן", "איתי שלזינגר"],
        "יהונתן רוזן": ["מוישי הריסון", "איתי שלזינגר", "יוסף קמחי", "דניאל ששון"],
        "אברהם ריין": ["נתי אורדמן", "יהונתן פז", "גידי פולסקי", "מאיר מיימון"],
        "אריאל שטאובר": ["יהונתן רוזן", "אלחנן כהן", "יהונתן פז", "מאיר מיימון", "אברהם ריין"],
        "איתי שלזינגר": ["יוסף קמחי", "מאיר מיימון", "אלחנן כהן", "נדב מלול", "יהונתן רוזן", "אוריה תם", "אביתר עמר", "יהונתן פז", "ציקי יורקוביץ", "בן ציון קצב", "אוריאל אנסבכר", "איתמר משולם"],
        "דניאל ששון": ["יהונתן רוזן", "אלחנן כהן", "נדב מלול", "איתי שלזינגר"],
        "אוריה תם": ["יהונתן רוזן", "איתי שלזינגר", "מנחם פודור", "יוסף קמחי"],
      };

      const area_prefs: Record<string, any> = {
        "איתמר משולם": { "row": 0, "weight": 100 },
        "נתי אורדמן": { "row": 0, "col_range": [1, 2], "weight": 80 },
        "מלאכי לינצר": { "row": 1, "col": 4, "weight": 200 },
        "יהונתן רוזן": { "row": 1, "col": 7, "weight": 200 },
        "דניאל ששון": { "row": 0, "weight": 90 },
        "יוסף קמחי": { "row": 0, "weight": 80 },
        "נדב מלול": { "row": 0, "weight": 70 },
        "בן ציון קצב": { "col": 0, "weight": 50 },
        "חיים בן פורת": { "col": 9, "weight": 50 },
        "אריאל שטאובר": { "special": "window_or_microwave", "weight": 60 },
        "אברימי זיאת": { "row": 3, "col_range": [4, 5], "isolated": true, "weight": 300 },
        "אליהו מויאל": { "fixed_seat": [1, 5] },
        "ציקי יורקוביץ": { "row": 0, "weight": 60 },
        "ישי כוחלני": { "row": 0, "weight": 85 },
        "מוישי הריסון": { "row": 0, "weight": 50 },
        "נדב רובין": { "row": 0, "col_range": [2, 3], "weight": 70 },
        "אוריאל אנסבכר": { "row": 0, "col": 0, "weight": 40 },
        "אברהם ריין": { "row_range": [1, 2], "col_range": [4, 6], "weight": 40 },
      };

      const finalStudents = demoStudents.map(s => {
        const studentWants = wants[s.name] || [];
        const studentAvoid = avoid[s.name] || [];
        
        // Map names to IDs
        const preferredIds = studentWants.map(name => demoStudents.find(ds => ds.name === name)?.id).filter(Boolean) as string[];
        const forbiddenIds = studentAvoid.map(name => demoStudents.find(ds => ds.name === name)?.id).filter(Boolean) as string[];
        
        return {
          ...s,
          preferred: preferredIds,
          forbidden: forbiddenIds,
          areaPref: area_prefs[s.name] || {}
        };
      });

      // Layout specific to demo
      const hidden = [];
      for (let c = 4; c < 10; c++) hidden.push(c); // Row 0 has only col 0-3

      updateCurrentConfig({
        id: Date.now().toString(),
        name: "סימולציית דוגמה (Python)",
        rows: 4,
        cols: 10,
        grid: Array(40).fill(null),
        students: finalStudents,
        hiddenDesks: hidden,
        rowGaps: [],
        columnGaps: [4],
        groups: []
      });

      setNotifications((prev: any) => [{ id: Date.now(), text: "נתוני הסימולציה נטענו בהצלחה!", type: 'success' }, ...prev]);
    }
  };

  return (
    <div className="p-8 space-y-10 h-full overflow-y-auto max-w-5xl mx-auto custom-scrollbar">
      <input type="file" ref={fileRef} className="hidden" accept=".xlsx, .xls, .json" onChange={handleFileImport} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-black text-slate-800">הגדרות מערכת</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={loadExampleData}
            className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100"
          >
            טען נתוני דוגמה AI
          </button>
          <Badge className="bg-brand-50 text-brand-600 border-brand-200 p-2">v3.2.1</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Parameters */}
        <div className="glass-card p-8 rounded-[3rem] space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            <h3 className="text-lg font-black text-slate-800">פרמטרים AI</h3>
          </div>
          <div className="space-y-6">
            {Object.entries(aiWeights).map(([key, val]: [string, any]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-xs font-black text-slate-500 uppercase">
                  <span>{key === 'preferred' ? 'עדיפות חברים' : key === 'forbidden' ? 'מניעת חיכוך' : 'מרחק פיזי'}</span>
                  <span className="text-brand-600">{val}/10</span>
                </div>
                <input 
                  type="range" min="0" max="10" value={val} 
                  onChange={(e) => setAiWeights((prev: any) => ({ ...prev, [key]: parseInt(e.target.value) }))}
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
              onClick={() => setAccessibility((prev: any) => ({ ...prev, highContrast: !prev.highContrast }))}
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
                   onClick={() => setAccessibility((prev: any) => ({ ...prev, fontSize: size }))}
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
                {currentConfig.students.map((student: any, idx: number) => (
                  <StudentCard 
                    key={`${student.id}-${idx}`}
                    student={student}
                    updateCurrentConfig={updateCurrentConfig}
                    setNotifications={setNotifications}
                    isSelected={selectedStudentId === student.id}
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setViewType('studentDetail');
                    }}
                  />
                ))}
              </div>
        </div>

        {/* Export Apps Section */}
        <div className="md:col-span-2 glass-card p-10 rounded-[3rem] space-y-8 bg-indigo-600 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <Download className="w-10 h-10" />
                <h3 className="text-3xl font-black">ייצוא כאפליקציית מחשב ונייד</h3>
              </div>
              <p className="text-lg font-medium text-indigo-100 max-w-2xl">
                הכנו את הקוד עבורכם! כדי לקבל קובץ EXE (למחשב) או APK (לאנדרואיד), יש להוריד את קוד המקור ולהריץ פקודה אחת פשוטה.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                  <h4 className="text-xl font-black mb-2 flex items-center gap-2">
                    <Monitor className="w-6 h-6" />
                    קובץ EXE (מחשב)
                  </h4>
                  <p className="text-sm opacity-80 mb-4 font-bold">מתאים לשימוש לוקאלי ללא אינטרנט</p>
                  <code className="block bg-black/30 p-3 rounded-xl text-xs font-mono mb-2 text-emerald-400">
                    npm run app:exe
                  </code>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                  <h4 className="text-xl font-black mb-2 flex items-center gap-2">
                    <Smartphone className="w-6 h-6" />
                    קובץ APK (אנדרואיד)
                  </h4>
                  <p className="text-sm opacity-80 mb-4 font-bold">להתקנה ישירות על הטלפון</p>
                  <code className="block bg-black/30 p-3 rounded-xl text-xs font-mono mb-2 text-emerald-400">
                    npm run app:android
                  </code>
                </div>

                <button 
                  onClick={exportToPDF}
                  className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 hover:bg-white/20 transition-all text-right flex flex-col justify-between"
                >
                  <FileText className="w-8 h-8 mb-2" />
                  <div>
                    <h4 className="text-xl font-black mb-1">הדפסה (PDF)</h4>
                    <p className="text-xs opacity-70 font-bold">סידור הכיתה מוכן להדפסה</p>
                  </div>
                </button>

                <button 
                  onClick={exportToJSON}
                  className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 hover:bg-white/20 transition-all text-right flex flex-col justify-between"
                >
                  <Share2 className="w-8 h-8 mb-2" />
                  <div>
                    <h4 className="text-xl font-black mb-1">גיבוי (JSON)</h4>
                    <p className="text-xs opacity-70 font-bold">שמירת המבנה כקובץ להעברה</p>
                  </div>
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => {
                const instructions = "כדי ליצור את הקבצים:\n1. הורידו את הפרויקט (Download Project)\n2. פתחו טרמינל בתיקיית הפרויקט\n3. הריצו npm install\n4. הריצו את הפקודה המבוקשת (app:exe או app:android)";
                alert(instructions);
              }}
              className="px-10 py-5 bg-white text-indigo-600 rounded-3xl text-xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              הורד קוד מקור
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="md:col-span-2 glass-card p-10 rounded-[3rem] border-2 border-rose-100 bg-rose-50/20 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-100 rounded-[1.5rem] shadow-sm">
              <ShieldAlert className="w-8 h-8 text-rose-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-rose-900 leading-none">אזור מסוכן</h3>
              <p className="text-sm font-bold text-rose-700/60 mt-2 uppercase tracking-widest">פעולות בלתי הפיכות</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white/60 p-6 rounded-[2rem] border border-rose-100 space-y-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-black text-slate-800">איפוס שיבוצים</h4>
                <p className="text-xs font-medium text-slate-500">ביטול כל שיבוצי התלמידים והחזרתם למאגר (מבנה הכיתה יישמר)</p>
              </div>
              <button 
                onClick={() => {
                  if (confirm("האם אתה בטוח שברצונך לבטל את כל השיבוצים? כל התלמידים יוחזרו למאגר.")) {
                    updateCurrentConfig((prev: any) => ({
                      ...prev,
                      grid: Array(prev.rows * prev.cols).fill(null)
                    }));
                    setNotifications((prev: any) => [{ id: Date.now(), text: "כל השיבוצים בוטלו בהצלחה", type: 'success' }, ...prev]);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                איפוס כל השיבוצים
              </button>
            </div>

            <div className="bg-white/60 p-6 rounded-[2rem] border border-rose-100 space-y-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-black text-slate-800">מחיקת נתונים מלאה</h4>
                <p className="text-xs font-medium text-slate-500">מחיקת כל רשימת התלמידים, האילוצים והשיבוצים (פעולה סופית)</p>
              </div>
              <button 
                onClick={() => {
                  if (confirm("האם אתה בטוח שברצונך למחוק את כל נתוני התלמידים? פעולה זו אינה ניתנת לביטול.")) {
                    updateCurrentConfig((prev: any) => ({
                      ...prev,
                      students: [],
                      grid: Array(prev.rows * prev.cols).fill(null)
                    }));
                    setNotifications((prev: any) => [{ id: Date.now(), text: "כל נתוני התלמידים נמחקו", type: 'error' }, ...prev]);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-rose-600 rounded-2xl font-black border-2 border-rose-600 hover:bg-rose-50 transition-all active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
                מחיקת כל התלמידים
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main App Component ---

export default function App() {
  const [currentConfig, setCurrentConfig] = useState({
    id: '1',
    name: 'כיתת מצוינות א׳',
    rows: 6,
    cols: 8,
    grid: Array(48).fill(null) as (string | null)[],
    students: [
      { id: '1', name: 'יוני לוי', preferred: [], forbidden: [], separateFrom: ['2'], height: 'short', groups: ['א'], notes: '' },
      { id: '2', name: 'ענבר כהן', preferred: ['1'], forbidden: [], keepDistantFrom: ['1'], height: 'tall', groups: ['ב'], notes: '' },
      { id: '3', name: 'גיל שרון', preferred: [], forbidden: [], height: 'medium', groups: ['א'], notes: '' }
    ],
    hiddenDesks: [] as number[],
    rowGaps: [] as number[],
    columnGaps: [] as number[],
    teacherDesk: { index: -1, width: 2, height: 1 },
    groups: [
      { id: 'א', name: 'קבוצה א', constraint: 'none' },
      { id: 'ב', name: 'קבוצה ב', constraint: 'none' },
      { id: 'ג', name: 'קבוצה ג', constraint: 'none' },
    ] as any[],
    updatedAt: Date.now(),
    columnGapSize: 32,
    rowGapSize: 32,
    obstructions: [] as number[]
  });

  const [viewType, setViewType] = useState<'grid' | 'table' | 'history' | 'dashboard' | 'attendance' | 'grades' | 'progress' | 'settings' | 'studentDetail'>('grid');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding_v3');
    if (!hasSeenOnboarding) {
      setOnboardingStep(0);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding_v3', 'true');
    setOnboardingStep(null);
  };

  const onboardingContent = [
    { title: "ברוכים הבאים!", text: "בואו נכיר את ClassManager Pro. המקום בו פדגוגיה פוגשת AI.", icon: <Sparkles className="w-10 h-10 text-brand-600" /> },
    { title: "גרירה ושחרור", text: "פשוט גררו תלמידים מהמאגר או בין השולחנות כדי לעצב את הכיתה.", icon: <MousePointer className="w-10 h-10 text-indigo-600" /> },
    { title: "אופטימיזציית AI", text: "לחצו על כפתור ה-AI כדי לתת למערכת למצוא את הסידור המושלם לפי אילוצים.", icon: <Brain className="w-10 h-10 text-brand-600" /> },
    { title: "תצוגת 3D", text: "חדש! מעכשיו תוכלו לראות את הכיתה בפרספקטיבה תלת-ממדית.", icon: <Box className="w-10 h-10 text-amber-600" /> }
  ];

  const [editMode, setEditMode] = useState<'normal' | 'structure'>('normal');
  const [showDeskNumbers, setShowDeskNumbers] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [is3DView, setIs3DView] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const dashboardStats = useMemo(() => {
    const studentCount = currentConfig.students.length;
    const placedCount = currentConfig.grid.filter(s => s !== null).length;
    
    // Conflict calculation
    let conflictCount = 0;
    currentConfig.grid.forEach((sid, idx) => {
      if (!sid) return;
      const student = currentConfig.students.find(s => s.id === sid);
      if (!student || !student.forbidden) return;
      const r = Math.floor(idx / currentConfig.cols);
      const c = idx % currentConfig.cols;
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < currentConfig.rows && nc >= 0 && nc < currentConfig.cols) {
          const neighborId = currentConfig.grid[nr * currentConfig.cols + nc];
          if (neighborId && student.forbidden.includes(neighborId)) conflictCount++;
        }
      });
    });

    // Satisfaction calculation (simplified normalization of scoring)
    let totalScore = 0;
    const activeStudents = currentConfig.grid.filter(s => s !== null);
    if (activeStudents.length > 0) {
      currentConfig.grid.forEach((sid, idx) => {
        if (!sid) return;
        const student = currentConfig.students.find(s => s.id === sid);
        if (!student) return;
        const r = Math.floor(idx / currentConfig.cols);
        const c = idx % currentConfig.cols;
        
        let sScore = 100; // Base score
        // Height check
        if (student.height === 'short' && r >= 2) sScore -= 40;
        // Preferred check (very simple)
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < currentConfig.rows && nc >= 0 && nc < currentConfig.cols) {
            return currentConfig.grid[nr * currentConfig.cols + nc];
          }
          return null;
        });
        if (student.preferred?.some(id => neighbors.includes(id))) sScore += 20;
        if (student.forbidden?.some(id => neighbors.includes(id))) sScore -= 60;
        
        totalScore += sScore;
      });
    }
    const satisfaction = activeStudents.length > 0 ? Math.min(100, Math.max(0, Math.round(totalScore / activeStudents.length))) : 0;

    return {
      studentCount,
      placedCount,
      conflicts: Math.floor(conflictCount / 2),
      satisfaction,
      attendance: 98 // Static/Mock for now as requested
    };
  }, [currentConfig]);

  const aiInsights = useMemo(() => {
    if (!currentConfig.grid) return [];
    const insights = [];
    const studentCount = currentConfig.grid.filter((s: any) => s !== null).length;
    const placedCount = currentConfig.grid.filter((s: any) => s !== null).length;
    
    if (studentCount > 0) {
      insights.push({ 
        type: 'pedagogical', 
        text: `הושבת ${studentCount} תלמידים. מומלץ לוודא שהתלמידים המאתגרים יושבים קרוב לשולחן המורה.` 
      });
    }

    const shortCount = currentConfig.students.filter(s => s.height === 'short').length;
    const shortInFront = currentConfig.grid.filter((sid: any, idx: number) => {
      if (!sid) return false;
      const s = currentConfig.students.find(st => st.id === sid);
      return s?.height === 'short' && Math.floor(idx / currentConfig.cols) < 2;
    }).length;

    if (shortCount > 0) {
      const percentage = Math.round((shortInFront / shortCount) * 100);
      insights.push({ 
        type: 'spatial', 
        text: `${percentage}% מהתלמידים הנמוכים יושבים בשורות הראשונות. ${percentage < 80 ? 'כדאי לשפר את המיקום שלהם.' : 'מצוין!'}` 
      });
    }

    // Social Conflict Check
    let conflicts = 0;
    currentConfig.grid.forEach((sid: any, idx: number) => {
      if (!sid) return;
      const student = currentConfig.students.find(s => s.id === sid);
      if (!student || !student.forbidden) return;

      const r = Math.floor(idx / currentConfig.cols);
      const c = idx % currentConfig.cols;
      
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < currentConfig.rows && nc >= 0 && nc < currentConfig.cols) {
          const neighborId = currentConfig.grid[nr * currentConfig.cols + nc];
          if (neighborId && student.forbidden.includes(neighborId)) {
            conflicts++;
          }
        }
      });
    });

    if (conflicts > 0) {
      insights.push({ 
        type: 'social', 
        text: `נמצאו ${Math.floor(conflicts / 2)} הפרדות שלא נשמרו. ה-AI יכול לעזור לסדר זאת.` 
      });
    }

    return insights;
  }, [currentConfig]);

  const [isGroupsPanelOpen, setIsGroupsPanelOpen] = useState(false);
  const [isIssuesPanelOpen, setIsIssuesPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'row' | 'col'>('name');
  const [accessibility, setAccessibility] = useState({ highContrast: false, fontSize: 'medium' });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [deskHistory, setDeskHistory] = useState<Record<number, string[]>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStudentId && viewType === 'grid') {
      const timer = setTimeout(() => {
        const deskElement = document.querySelector(`[data-student-id="${selectedStudentId}"]`);
        if (deskElement) {
          deskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedStudentId, viewType]);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [undoHistory, setUndoHistory] = useState<any[]>([]);
  const [aiResponse, setAiResponse] = useState("");
  const [aiWeights, setAiWeights] = useState({ preferred: 8, forbidden: 10, separateFrom: 6 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  const runAIShuffle = () => {
    setIsLoadingAI(true);
    
    // Convert current config to valid seats list like the Python script
    const rows = currentConfig.rows;
    const cols = currentConfig.cols;
    const validSeats: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (!currentConfig.hiddenDesks.includes(idx)) {
          validSeats.push(idx);
        }
      }
    }

    const students = [...currentConfig.students];
    const weights = aiWeights;

    // Helper: Getting neighbors
    const getNeighbors = (idx: number) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const neighbors: number[] = [];
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const nIdx = nr * cols + nc;
          if (validSeats.includes(nIdx)) neighbors.push(nIdx);
        }
      });
      return neighbors;
    };

    // Scoring function
    const scoreAssignment = (assignment: (string | null)[]) => {
      let score = 0;
      
      assignment.forEach((sid, idx) => {
        if (!sid) return;
        const student = students.find(s => s.id === sid);
        if (!student) return;

        const neighbors = getNeighbors(idx);
        const r = Math.floor(idx / cols);
        const c = idx % cols;

        // 1. Social Score
        neighbors.forEach(nIdx => {
          const neighborId = assignment[nIdx];
          if (!neighborId) return;

          if (student.preferred?.includes(neighborId)) score += 12;
          if (student.forbidden?.includes(neighborId)) score -= 40;
        });

        // 2. Spatial / Area Prefs
        const pref = (student as any).areaPref;
        if (pref) {
          if (pref.row !== undefined && r === pref.row) score += (pref.weight || 20);
          if (pref.col !== undefined && c === pref.col) score += (pref.weight || 20);
          if (pref.row_range && r >= pref.row_range[0] && r <= pref.row_range[1]) score += (pref.weight || 10);
          if (pref.col_range && c >= pref.col_range[0] && c <= pref.col_range[1]) score += (pref.weight || 10);
          
          if (pref.special === "window_or_microwave" && (c === 0 || c === cols - 1)) score += 60;
          
          if (pref.isolated) {
            const hasNeighbor = neighbors.some(nIdx => assignment[nIdx] !== null);
            if (!hasNeighbor) score += (pref.weight || 300);
            else score -= (pref.weight || 300);
          }
        }

        // 3. Group Constraints
        if (student.groups && student.groups.length > 0) {
          student.groups.forEach((groupId: string) => {
            const groupConfig = currentConfig.groups.find(g => g.id === groupId);
            if (!groupConfig || groupConfig.constraint === 'none') return;

            // Check neighbors for group constraints
            neighbors.forEach(nIdx => {
              const neighborId = assignment[nIdx];
              if (!neighborId) return;
              const neighbor = students.find(s => s.id === neighborId);
              if (!neighbor) return;

              const inSameGroup = neighbor.groups?.includes(groupId);
              if (inSameGroup) {
                if (groupConfig.constraint === 'together') score += 100; // Strong bonus for staying together
                if (groupConfig.constraint === 'separate') score -= 200; // Heavy penalty for being next to each other
              }
            });

            // If separate, also check that THEY ARE NOT IN THE SAME CLUSTER (optional, but neighbors is enough for now)
          });
        }

        // Height constraint (Front row for 'short')
        if (student.height === 'short') {
          if (r < 2) score += 50;
          else score -= 100;
        }
      });
      return score;
    };

    // Simulated Annealing
    setTimeout(() => {
      let currentAssignment: (string | null)[] = Array(rows * cols).fill(null);
      
      // Initial Random Assignment (respecting fixed seats)
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      const pool = [...validSeats].sort(() => Math.random() - 0.5);

      // Handle fixed seats first
      shuffledStudents.forEach((s, i) => {
        const pref = (s as any).areaPref;
        if (pref && pref.fixed_seat) {
          const [fr, fc] = pref.fixed_seat;
          const fIdx = fr * cols + fc;
          if (validSeats.includes(fIdx)) {
            currentAssignment[fIdx] = s.id;
            const poolIdx = pool.indexOf(fIdx);
            if (poolIdx !== -1) pool.splice(poolIdx, 1);
          }
        }
      });

      // Fill rest
      shuffledStudents.forEach(s => {
        if (currentAssignment.includes(s.id)) return;
        if (pool.length > 0) {
          const target = pool.pop()!;
          currentAssignment[target] = s.id;
        }
      });

      let currentScore = scoreAssignment(currentAssignment);
      let best = [...currentAssignment];
      let bestScore = currentScore;
      
      let temp = 1000;
      const iterations = 5000; // Reduced for browser performance but still effective
      
      for (let i = 0; i < iterations; i++) {
        // Swap two random seats
        const idx1 = validSeats[Math.floor(Math.random() * validSeats.length)];
        const idx2 = validSeats[Math.floor(Math.random() * validSeats.length)];
        
        // Don't swap if one is fixed seat? (For simplicity we just skip students with fixed_seat in random swap)
        const s1 = students.find(s => s.id === currentAssignment[idx1]);
        const s2 = students.find(s => s.id === currentAssignment[idx2]);
        if (s1?.areaPref?.fixed_seat || s2?.areaPref?.fixed_seat) continue;

        const next = [...currentAssignment];
        [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
        
        const nextScore = scoreAssignment(next);
        const delta = nextScore - currentScore;
        
        if (delta > 0 || Math.random() < Math.exp(delta / temp)) {
          currentAssignment = next;
          currentScore = nextScore;
          if (currentScore > bestScore) {
            best = [...currentAssignment];
            bestScore = currentScore;
          }
        }
        temp *= 0.999;
      }

      updateCurrentConfig((prev: any) => ({ ...prev, grid: best }));
      setIsLoadingAI(false);
      setIsAIPanelOpen(false);
      setNotifications(prev => [{ id: Date.now(), text: `ה-AI סיים סימולציה! ניקוד אופטימיזציה: ${Math.round(bestScore)}`, type: 'success' }, ...prev]);
    }, 500);
  };

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeDeskIdx, setActiveDeskIdx] = useState<number | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('class-manager-config');
    const savedHistory = localStorage.getItem('desk-history');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setCurrentConfig(config);
      } catch (e) { console.error("Error loading config", e); }
    }
    if (savedHistory) {
      try {
        setDeskHistory(JSON.parse(savedHistory));
      } catch (e) { console.error("Error loading history", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('class-manager-config', JSON.stringify(currentConfig));
    localStorage.setItem('desk-history', JSON.stringify(deskHistory));
  }, [currentConfig, deskHistory]);

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
        setNotifications(prev => [{ id: Date.now(), text: `הנתונים יובאו בהצלחה!`, type: 'success' }, ...prev]);
      } catch (err) {
        setNotifications(prev => [{ id: Date.now(), text: "שגיאה בטעינת הקובץ.", type: 'error' }, ...prev]);
      }
    };
    if (file.name.endsWith('.json')) reader.readAsText(file);
    else reader.readAsBinaryString(file);
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
        [r, c-1], [r, c+1], [r-1, c], [r+1, c],
        [r-1, c-1], [r-1, c+1], [r+1, c-1], [r+1, c+1] // Add diagonal checks
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
      let next = typeof update === 'function' ? update(prev) : update;
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        setUndoHistory(h => [prev, ...h].slice(0, 10));
        next = { ...next, updatedAt: Date.now() };
      }
      return next;
    });
  }, []);

  const undo = () => {
    if (undoHistory.length === 0) return;
    const [prev, ...rest] = undoHistory;
    setCurrentConfig(prev);
    setUndoHistory(rest);
    setNotifications(prevNotif => [{ id: Date.now(), text: "הפעולה בוטלה בהצלחה", type: 'info' }, ...prevNotif]);
  };

  const handleGridResize = (type: 'rows' | 'cols', delta: number) => {
    updateCurrentConfig((prev: any) => {
      const newVal = Math.max(2, Math.min(12, prev[type] + delta));
      if (newVal === prev[type]) return prev;
      
      const newRows = type === 'rows' ? newVal : prev.rows;
      const newCols = type === 'cols' ? newVal : prev.cols;
      const newGridSize = newRows * newCols;
      const newGrid = Array(newGridSize).fill(null);
      
      // Preserve students based on their old visual coordinates
      for (let r = 0; r < Math.min(prev.rows, newRows); r++) {
        for (let c = 0; c < Math.min(prev.cols, newCols); c++) {
          const oldIdx = r * prev.cols + c;
          const newIdx = r * newCols + c;
          newGrid[newIdx] = prev.grid[oldIdx];
        }
      }

      // Update teacher desk if it's now out of bounds
      let teacherDesk = { ...prev.teacherDesk };
      if (teacherDesk.index !== -1) {
        const tr = Math.floor(teacherDesk.index / prev.cols);
        const tc = teacherDesk.index % prev.cols;
        if (tr >= newRows || tc >= newCols) {
          teacherDesk.index = (Math.min(tr, newRows - 1) * newCols) + Math.min(tc, newCols - 1);
        } else {
          // Recalculate index for new width
          teacherDesk.index = tr * newCols + tc;
        }
      }
      
      return { ...prev, [type]: newVal, grid: newGrid, teacherDesk };
    });
  };

  const renderMainContent = () => {
    const onBack = () => setViewType('dashboard');
    const onBackToGrid = () => setViewType('grid');
    switch (viewType) {
      case 'dashboard': return <DashboardView stats={dashboardStats} onBack={onBackToGrid} />;
      case 'attendance': return <AttendanceView students={currentConfig.students} onBack={onBack} />;
      case 'grades': return <GradesView onBack={onBack} />;
      case 'progress': return <ProgressView onBack={onBack} />;
      case 'settings': return (
        <SettingsView 
          onBack={onBackToGrid}
          handleFileImport={handleFileImport}
          aiWeights={aiWeights}
          setAiWeights={setAiWeights}
          accessibility={accessibility}
          setAccessibility={setAccessibility}
          currentConfig={currentConfig}
          updateCurrentConfig={updateCurrentConfig}
          setNotifications={setNotifications}
          exportToPDF={exportToPDF}
          exportToJSON={exportToJSON}
          selectedStudentId={selectedStudentId}
          setSelectedStudentId={setSelectedStudentId}
          setViewType={setViewType}
        />
      );
      case 'studentDetail': {
        const student = currentConfig.students.find(s => s.id === selectedStudentId);
        return student ? (
          <StudentDetailView 
            student={student} 
            students={currentConfig.students}
            onBack={onBackToGrid} 
            updateCurrentConfig={updateCurrentConfig}
            onSelectStudent={setSelectedStudentId}
          />
        ) : null;
      }
      default: return null;
    }
  };

  const exportToExcel = () => console.log("Exporting to Excel...");

  const Header = () => (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-50">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl transition-all shadow-sm"
          title={isSidebarOpen ? "סגור תפריט" : "פתח תפריט"}
        >
          {isSidebarOpen ? <ChevronRight className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
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

        {viewType === 'grid' && (
          <div className="flex items-center gap-3 mr-4">
            <button 
              onClick={() => setIs3DView(!is3DView)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                is3DView ? "bg-brand-600 text-white shadow-lg" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              <Box className="w-4 h-4" />
              תצוגת 3D
            </button>
            
            {aiInsights.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <Brain className="w-4 h-4 text-indigo-600" />
                <p className="text-[10px] font-black text-indigo-800">{aiInsights[0].text}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {undoHistory.length > 0 && (
          <button 
            onClick={undo}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 text-brand-700 rounded-2xl font-black text-xs hover:bg-brand-100 transition-all border border-brand-100 shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 rotate-180" />
            ביטול פעולה
          </button>
        )}
        <button 
          onClick={() => setOnboardingStep(0)}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl transition-all"
          title="מדריך למשתמש"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
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

  const handleResetGrid = () => {
    updateCurrentConfig((prev: any) => ({
      ...prev,
      grid: Array(prev.rows * prev.cols).fill(null)
    }));
    setIsResetConfirmOpen(false);
    setNotifications((prev: any) => [{ id: Date.now(), text: "סידור הישיבה אופס בהצלחה", type: 'info' }, ...prev]);
  };

  const exportToPDF = async () => {
    if (!gridRef.current) return;
    setIsExporting(true);
    setNotifications((prev: any) => [{ id: Date.now(), text: "מכין קובץ להדפסה...", type: 'info' }, ...prev]);
    
    try {
      // Temporarily switch off 3D if active for better printing
      const was3D = is3DView;
      if (was3D) setIs3DView(false);
      
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`classroom-layout-${currentConfig.name || 'export'}.pdf`);
      
      if (was3D) setIs3DView(true);
      setNotifications((prev: any) => [{ id: Date.now(), text: "הקובץ מוכן להורדה", type: 'info' }, ...prev]);
    } catch (error) {
      console.error('Export failed:', error);
      setNotifications((prev: any) => [{ id: Date.now(), text: "שגיאה ביצוא ה-PDF", type: 'error' }, ...prev]);
    } finally {
      setIsExporting(false);
    }
  };
  
  const exportToJSON = () => {
    const dataStr = JSON.stringify(currentConfig, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `classroom-structure-${currentConfig.name || 'export'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setNotifications((prev: any) => [{ id: Date.now(), text: "מבנה הכיתה יוצא בהצלחה", type: 'success' }, ...prev]);
  };

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
              <div className="bg-white border-2 border-slate-200 p-6 rounded-3xl flex flex-col gap-4 shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">כיתה פעילה</h3>
                    <Badge className="bg-brand-100 text-brand-700 border border-brand-200">v3.2.0</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={currentConfig.name}
                      onChange={(e) => updateCurrentConfig((prev: any) => ({ ...prev, name: e.target.value }))}
                      className="text-xl font-black text-slate-900 bg-transparent border-0 p-0 focus:ring-0 flex-1"
                    />
                    <button 
                      onClick={() => {
                        const newName = prompt("הזן שם חדש לכיתה:", currentConfig.name);
                        if (newName && newName !== currentConfig.name) {
                          if (confirm(`האם לשנות את שם הכיתה ל-"${newName}"?`)) {
                            updateCurrentConfig((prev: any) => ({ ...prev, name: newName }));
                          }
                        }
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600 transition-all"
                      title="שנה שם כיתה"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 opacity-50">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500">
                      עדכון אחרון: {new Intl.DateTimeFormat('he-IL', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      }).format(new Date(currentConfig.updatedAt))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group Constraints Section */}
              <div className="flex flex-col gap-4">
                 <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest px-1">אילוצי קבוצות</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {currentConfig.groups.map((group: any) => (
                      <div key={group.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white",
                            group.id === 'א' ? "bg-brand-500" : group.id === 'ב' ? "bg-amber-500" : "bg-emerald-500"
                          )}>
                            {group.id}
                          </div>
                          <span className="text-sm font-black text-slate-700">{group.name}</span>
                        </div>
                        <select 
                          value={group.constraint}
                          onChange={(e) => updateCurrentConfig((prev: any) => ({
                            ...prev,
                            groups: prev.groups.map((g: any) => g.id === group.id ? { ...g, constraint: e.target.value } : g)
                          }))}
                          className="bg-slate-50 border-0 text-[10px] font-black rounded-lg focus:ring-1 focus:ring-brand-200 py-1 px-2"
                        >
                          <option value="none">ללא אילוץ</option>
                          <option value="together">יחד (שכנים)</option>
                          <option value="separate">בנפרד</option>
                        </select>
                      </div>
                    ))}
                  </div>
              </div>

              {/* Student Pool */}
              <div className="flex flex-col gap-4 min-h-[200px]">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">ממתינים לשיבוץ ({studentsInPool.length})</h3>
                  <button className="p-2 hover:bg-slate-100 rounded-xl bg-slate-50 border border-slate-200 transition-colors"><Plus className="w-5 h-5 text-slate-600" /></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {studentsInPool.map((student, idx) => (
                    <motion.div
                      key={`${student.id}-${idx}`}
                      draggable
                      onDragStart={() => setDraggedStudentId(student.id)}
                      onDragEnd={() => setDraggedStudentId(null)}
                      className="p-4 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-brand-500 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-black text-slate-600 text-base">
                          {student.name[0]}
                        </div>
                        <span className="text-base font-black text-slate-900">{student.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                           onClick={() => {
                             setSelectedStudentId(student.id);
                             setViewType('studentDetail');
                           }}
                           className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-brand-600 transition-colors"
                        >
                           <Eye className="w-5 h-5" />
                        </button>
                        <MoreVertical className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
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
                  disabled={isLoadingAI}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden",
                    isLoadingAI ? "bg-slate-100 text-slate-400" : "bg-brand-600 text-white shadow-brand-200 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  {isLoadingAI ? (
                    <>
                      <motion.div
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-400/10 to-transparent"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-2 h-2 bg-brand-500 rounded-full"
                      />
                      <span className="relative z-10">הסידור בביצוע...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 text-indigo-400" />
                      <span>שיבוץ חכם AI</span>
                    </>
                  )}
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
                    <button onClick={exportToJSON} className="flex items-center justify-center gap-3 px-2 py-4 bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-100 border border-slate-200">
                      <Share2 className="w-5 h-5" />
                      JSON
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
    <>
      <AnimatePresence>
        {onboardingStep !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 max-w-sm w-full shadow-2xl text-center space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
              <div className="relative">
                <div className="w-16 h-16 bg-brand-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                  {onboardingContent[onboardingStep].icon}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">{onboardingContent[onboardingStep].title}</h2>
                <p className="text-base text-slate-600 font-medium leading-relaxed">{onboardingContent[onboardingStep].text}</p>
              </div>
              
              <div className="flex gap-4 relative">
                {onboardingStep < onboardingContent.length - 1 ? (
                  <button 
                    onClick={() => setOnboardingStep(onboardingStep + 1)}
                    className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-brand-700 transition-all shadow-xl active:scale-95"
                  >
                    הבא
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button 
                    onClick={completeOnboarding}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl active:scale-95"
                  >
                    בואו נתחיל!
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
      {Header()}

      <div className="flex flex-1 overflow-hidden relative">
        {Sidebar()}

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
                 <div 
                   className={cn(
                     "flex-1 overflow-auto bg-slate-50 p-6 flex flex-col items-center shadow-inner transition-all duration-700 ease-in-out origin-top",
                     is3DView && "bg-slate-200/50"
                   )}
                   style={is3DView ? { 
                     perspective: '1200px',
                     transform: 'rotateX(25deg) scale(0.95)',
                     transformStyle: 'preserve-3d'
                   } : {}}
                 >
                   {/* Grid Toolbar */}
                   <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 mb-10 z-30 shadow-bento shrink-0 relative">
                     {/* Floating Structure Notice */}
                     <AnimatePresence>
                       {editMode === 'structure' && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 10, scale: 0.95 }}
                           className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-2 border-2 border-white whitespace-nowrap"
                         >
                           <CloudLightning className="w-3 h-3 text-amber-100" />
                           מצב עריכת מבנה פעיל - ניתן להזיז רווחים ולהוסיף שולחנות
                         </motion.div>
                       )}
                     </AnimatePresence>

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

                         {/* Gap Adjustment Controls */}
                         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <div className="flex flex-col items-center px-1">
                              <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5 whitespace-nowrap">מרווח רוחב</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.max(8, prev.columnGapSize - 4) }))} className="p-0.5 hover:bg-white rounded text-slate-500"><Minus className="w-3 h-3" /></button>
                                <span className="min-w-[16px] text-center font-black text-[9px]">{currentConfig.columnGapSize}</span>
                                <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.min(120, prev.columnGapSize + 4) }))} className="p-0.5 hover:bg-white rounded text-slate-500"><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                            <div className="w-px h-6 bg-slate-200 mx-0.5" />
                            <div className="flex flex-col items-center px-1">
                              <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5 whitespace-nowrap">מרווח גובה</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, rowGapSize: Math.max(8, (prev.rowGapSize || 32) - 4) }))} className="p-0.5 hover:bg-white rounded text-slate-500"><Minus className="w-3 h-3" /></button>
                                <span className="min-w-[16px] text-center font-black text-[9px]">{currentConfig.rowGapSize || 32}</span>
                                <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, rowGapSize: Math.min(120, (prev.rowGapSize || 32) + 4) }))} className="p-0.5 hover:bg-white rounded text-slate-500"><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                         </div>
                         <button 
                            onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, hiddenDesks: [], obstructions: [] }))}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black hover:bg-rose-100 transition-colors"
                         >
                           איפוס שולחנות
                         </button>
                       </div>
                     ) : (
                       <div className="flex items-center gap-2">
                         <button onClick={() => setShowDeskNumbers(!showDeskNumbers)} className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2", showDeskNumbers ? "bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "text-slate-500")}>
                            <Eye className="w-4 h-4" />
                            מספרים
                         </button>
                         <button 
                           onClick={() => setIsResetConfirmOpen(true)}
                           className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-100 transition-all flex items-center gap-2"
                         >
                           <RotateCcw className="w-4 h-4" />
                           איפוס
                         </button>
                         <button 
                           onClick={exportToPDF}
                           disabled={isExporting}
                           className="px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-xs font-black hover:bg-brand-100 transition-all flex items-center gap-2 disabled:opacity-50"
                         >
                           <FileDown className="w-4 h-4" />
                           {isExporting ? 'מייצא...' : 'PDF'}
                         </button>
                       </div>
                     )}
                   </div>

                   {/* Grid Content */}
                   <div ref={gridRef} className="relative w-full max-w-6xl flex flex-col items-center" id="classroom-grid-container">
                       {/* Floating Teacher Desk Toggle (Structure Mode Only) */}
                       {editMode === 'structure' && currentConfig.teacherDesk.index === -1 && (
                         <button 
                           onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, index: 0 } }))}
                           className="mb-8 px-6 py-3 bg-brand-600 text-white rounded-2xl font-black shadow-xl hover:bg-brand-700 transition-all flex items-center gap-3 animate-bounce"
                         >
                           <Plus className="w-5 h-5" />
                           הוסף שולחן מורה
                         </button>
                       )}

                    <div 
                      className={cn(
                        "grid p-20 transition-all duration-500 relative",
                        editMode === 'structure' ? "bg-white ring-[12px] ring-amber-400 ring-offset-[12px] ring-offset-slate-100 rounded-[5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)]" : "bg-white rounded-[5rem] border-4 border-slate-200 shadow-2xl"
                      )}
                     style={{ 
                       display: 'grid',
                       gridTemplateColumns: Array.from({ length: currentConfig.cols }).map((_, i) => 
                         `${currentConfig.columnGaps.includes(i) ? `70px ${currentConfig.columnGapSize}px` : '70px'}`
                       ).join(' '),
                       gridTemplateRows: Array.from({ length: currentConfig.rows }).map((_, i) => 
                         `${currentConfig.rowGapSize ? (currentConfig.rowGaps.includes(i) ? `48px ${currentConfig.rowGapSize}px` : '48px') : (currentConfig.rowGaps.includes(i) ? '48px 32px' : '48px')}`
                       ).join(' '),
                       perspective: '1000px',
                     }}
                   >
                    {/* Teacher Desk Injection */}
                    {currentConfig.teacherDesk && currentConfig.teacherDesk.index !== -1 && (
                      <TeacherDesk 
                        {...currentConfig.teacherDesk}
                        colPos={(currentConfig.teacherDesk.index % currentConfig.cols) + 1 + currentConfig.columnGaps.filter(g => g < (currentConfig.teacherDesk.index % currentConfig.cols)).length}
                        rowPos={Math.floor(currentConfig.teacherDesk.index / currentConfig.cols) + 1 + currentConfig.rowGaps.filter(g => g < Math.floor(currentConfig.teacherDesk.index / currentConfig.cols)).length}
                        editMode={editMode}
                        updateCurrentConfig={updateCurrentConfig}
                      />
                    )}

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
                               style={{ 
                                 gridColumn: hasGap ? colPos + 1 : colPos, 
                                 gridRow: `1 / span ${currentConfig.rows + (currentConfig.rowGaps?.length || 0)}`,
                                 width: hasGap ? `${currentConfig.columnGapSize}px` : '16px',
                                 marginRight: hasGap ? `-${currentConfig.columnGapSize / 2}px` : '-8px',
                                 marginLeft: hasGap ? `-${currentConfig.columnGapSize / 2}px` : '-8px',
                                 justifySelf: 'center'
                               }}
                               className={cn(
                                 "h-full relative flex items-center justify-center group",
                                 hasGap ? "bg-brand-500/5" : "bg-transparent"
                               )}
                             >
                                <div 
                                  onClick={() => updateCurrentConfig((prev: any) => ({
                                    ...prev,
                                    columnGaps: prev.columnGaps.includes(i) ? prev.columnGaps.filter((g: number) => g !== i) : [...prev.columnGaps, i]
                                  }))}
                                  className={cn(
                                    "w-1 h-full cursor-pointer transition-all rounded-full",
                                    hasGap ? "bg-brand-400 group-hover:scale-x-[3]" : "bg-slate-200 group-hover:bg-brand-300 group-hover:scale-x-[4]"
                                  )} 
                                />
                                
                                {hasGap && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                                  >
                                    <div className="bg-white shadow-lg border border-brand-100 rounded-full px-2 py-4 flex flex-col items-center gap-1.5 pointer-events-auto">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.min(prev.columnGapSize + 4, 120) })); }}
                                        className="p-1 hover:bg-slate-50 text-brand-600 rounded-full"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                      <div className="flex flex-col items-center -space-y-0.5">
                                        <Ruler className="w-2.5 h-2.5 text-slate-300" />
                                        <span className="text-[9px] font-black text-brand-700">{currentConfig.columnGapSize}</span>
                                      </div>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.max(prev.columnGapSize - 4, 8) })); }}
                                        className="p-1 hover:bg-slate-50 text-brand-600 rounded-full"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
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
                               style={{ 
                                 gridRow: hasGap ? rowPos + 1 : rowPos, 
                                 gridColumn: `1 / span ${currentConfig.cols + (currentConfig.columnGaps?.length || 0)}`,
                                 height: hasGap ? `${currentConfig.rowGapSize}px` : '16px',
                                 marginTop: hasGap ? `-${currentConfig.rowGapSize / 2}px` : '-8px',
                                 marginBottom: hasGap ? `-${currentConfig.rowGapSize / 2}px` : '-8px',
                                 alignSelf: 'center'
                               }}
                               className={cn(
                                 "w-full relative flex items-center justify-center group",
                                 hasGap ? "bg-brand-500/5" : "bg-transparent"
                               )}
                             >
                                <div 
                                  onClick={() => updateCurrentConfig((prev: any) => ({
                                    ...prev,
                                    rowGaps: prev.rowGaps.includes(i) ? prev.rowGaps.filter((g: number) => g !== i) : [...prev.rowGaps, i]
                                  }))}
                                  className={cn(
                                    "h-1 w-full cursor-pointer transition-all rounded-full",
                                    hasGap ? "bg-brand-400 group-hover:scale-y-[3]" : "bg-slate-200 group-hover:bg-brand-300 group-hover:scale-y-[4]"
                                  )} 
                                />

                                {hasGap && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                  >
                                    <div className="bg-white shadow-lg border border-brand-100 rounded-full px-4 py-2 flex items-center gap-1.5 pointer-events-auto">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, rowGapSize: Math.max((prev.rowGapSize || 32) - 4, 8) })); }}
                                        className="p-1 hover:bg-slate-50 text-brand-600 rounded-full"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <div className="flex items-center gap-1.5">
                                        <Ruler className="w-2.5 h-2.5 text-slate-300" />
                                        <span className="text-[9px] font-black text-brand-700">{currentConfig.rowGapSize || 32}</span>
                                      </div>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, rowGapSize: Math.min((prev.rowGapSize || 32) + 4, 120) })); }}
                                        className="p-1 hover:bg-slate-50 text-brand-600 rounded-full"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
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
                            selectedStudentId={selectedStudentId}
                            onDrop={handleDrop}
                            updateCurrentConfig={updateCurrentConfig}
                            currentConfig={currentConfig}
                            is3DView={is3DView}
                            activeDeskIdx={activeDeskIdx}
                            onShowHistory={(i: number) => {
                              setActiveDeskIdx(i);
                              setIsHistoryModalOpen(true);
                            }}
                            onShowProfile={() => {
                              if (student) {
                                setSelectedStudentId(student.id);
                                setViewType('studentDetail');
                              }
                            }}
                            setNotifications={setNotifications}
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
                   <button onClick={() => { setIsHistoryModalOpen(false); setActiveDeskIdx(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
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

                <button onClick={() => { setIsHistoryModalOpen(false); setActiveDeskIdx(null); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">סגור</button>
            </motion.div>
          </div>
        )}

        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full flex flex-col gap-6 text-center"
            >
              <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-2">
                <RotateCcw className="w-10 h-10 text-rose-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">איפוס סידור ישיבה?</h2>
                <p className="text-slate-500 font-medium leading-relaxed">
                  פעולה זו תנקה את כל התלמידים מהשולחנות ותחזיר אותם למאגר. לא ניתן לבטל פעולה זו.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                >
                  ביטול
                </button>
                <button 
                  onClick={handleResetGrid}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors"
                >
                  איפוס הכל
                </button>
              </div>
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
                   onClick={runAIShuffle}
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
    </>
  );
}
