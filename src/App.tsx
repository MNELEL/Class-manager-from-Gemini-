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
  Edit3,
  Layout,
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
  FileText,
  Sun,
  Moon,
  Zap,
  Shield,
  TrendingUp,
  Activity,
  ChevronUp,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Logic Helpers ---

/** 
 * Checks if two indices in a grid are adjacent (including diagonals)
 */
function areAdjacent(idx1: number, idx2: number, cols: number) {
  const r1 = Math.floor(idx1 / cols);
  const c1 = idx1 % cols;
  const r2 = Math.floor(idx2 / cols);
  const c2 = idx2 % cols;
  
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && idx1 !== idx2;
}

/** 
 * Calculates conflicts for the current layout
 */
function calculateConflicts(config: any) {
  const { grid, students, cols } = config;
  const conflicts: { type: 'forbidden' | 'missing_pref' | 'height' | 'special', studentId1: string, studentId2?: string, deskIdx1: number, deskIdx2?: number, message: string }[] = [];
  
  // 1. Adjacency Based Conflicts (Forbidden / Group Escape)
  grid.forEach((id1: string | null, idx1: number) => {
    if (!id1) return;
    const s1 = students.find((s: any) => s.id === id1);
    if (!s1) return;
    
    // Check neighbors
    grid.forEach((id2: string | null, idx2: number) => {
      if (!id2 || idx1 === idx2) return;
      if (areAdjacent(idx1, idx2, cols)) {
        const s2 = students.find((s:any)=>s.id===id2);
        if (!s2) return;

        // Manual Forbidden
        if (s1.forbidden?.includes(id2) || s1.separateFrom?.includes(id2)) {
          conflicts.push({
            type: 'forbidden',
            studentId1: id1,
            studentId2: id2,
            deskIdx1: idx1,
            deskIdx2: idx2,
            message: `${s1.name} ו-${s2.name} אמורים להיות מופרדים.`
          });
        }

        // Group Separate Constraint
        s1.groups?.forEach((gId: string) => {
           const group = config.groups?.find((g: any) => g.id === gId);
           if (group?.constraint === 'separate' && s2.groups?.includes(gId)) {
              conflicts.push({
                 type: 'forbidden',
                 studentId1: id1,
                 studentId2: id2,
                 deskIdx1: idx1,
                 deskIdx2: idx2,
                 message: `קונפליקט בקבוצה ${group.name}: ${s1.name} ו-${s2.name} אמורים להיות מופרדים.`
              });
           }
        });
      }
    });

    // 2. Group Together Constraint (Isolation Check)
    s1.groups?.forEach((gId: string) => {
       const group = config.groups?.find((g: any) => g.id === gId);
       if (group?.constraint === 'together') {
          const hasGroupMemberAdjacent = grid.some((id2: string | null, idx2: number) => {
             if (!id2 || idx1 === idx2 || !areAdjacent(idx1, idx2, cols)) return false;
             const s2 = students.find((s:any)=>s.id===id2);
             return s2?.groups?.includes(gId);
          });
          if (!hasGroupMemberAdjacent) {
             const otherMembersInClass = students.filter((s:any) => s.id !== s1.id && s.groups?.includes(gId) && grid.includes(s.id));
             if (otherMembersInClass.length > 0) {
                conflicts.push({
                   type: 'special',
                   studentId1: id1,
                   deskIdx1: idx1,
                   message: `${s1.name} מבודד מחבריו לקבוצת ${group.name}.`
                });
             }
          }
       }
    });

    // 2. Height Conflict (Short student in back)
    if (s1.height === 'short') {
      const row = Math.floor(idx1 / cols);
      if (row >= 3) { // Front is usually first 2-3 rows
        conflicts.push({
          type: 'height',
          studentId1: id1,
          deskIdx1: idx1,
          message: `${s1.name} (קדמי) יושב רחוק מדי.`
        });
      }
    }
    
    // 3. Special Area Prefs
    if (s1.areaPref?.special === 'window_or_microwave') {
      const col = idx1 % cols;
      if (col !== 0 && col !== cols - 1) {
        conflicts.push({
          type: 'special',
          studentId1: id1,
          deskIdx1: idx1,
          message: `${s1.name} ביקש לשבת בקצה הכיתה.`
        });
      }
    }
  });
  
  return conflicts;
}

// --- Helper Components (Hoisted) ---

function Badge({ children, className, style, ...props }: { children: React.ReactNode, className?: string, style?: React.CSSProperties, [key: string]: any }) {
  return (
    <span style={style} className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight", className)} {...props}>
      {children}
    </span>
  );
}

const BulkUpdateModal = ({ students, groups = [], onUpdate, onClose }: any) => {
  const [text, setText] = useState("");

  const handleUpdate = () => {
    const lines = text.split('\n').filter(l => l.trim());
    const updates: any[] = [...students];

    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      const name = parts[0];
      if (!name) return;

      const studentIdx = updates.findIndex((s: any) => s.name === name);
      if (studentIdx !== -1) {
        let updated = { ...updates[studentIdx] };
        parts.slice(1).forEach(p => {
          if (p.startsWith('חברים:')) {
            const names = p.replace('חברים:', '').split(';').map(n => n.trim());
            updated.preferred = students.filter((s: any) => names.includes(s.name)).map((s: any) => s.id);
          } else if (p.startsWith('להרחיק:')) {
            const names = p.replace('להרחיק:', '').split(';').map(n => n.trim());
            updated.forbidden = students.filter((s: any) => names.includes(s.name)).map((s: any) => s.id);
          } else if (p.startsWith('גובה:')) {
            const h = p.replace('גובה:', '').trim();
            if (h === 'נמוך' || h === 'קדמי') updated.height = 'short';
            else if (h === 'גבוה' || h === 'אחורי') updated.height = 'tall';
            else updated.height = 'medium';
          } else if (p.startsWith('קבוצה:')) {
            const groupNames = p.replace('קבוצה:', '').split(';').map(n => n.trim());
            const currentGroups = [...(updated.groups || [])];
            groupNames.forEach(gn => {
              const group = groups.find((g: any) => g.name === gn);
              if (group && !currentGroups.includes(group.id)) {
                currentGroups.push(group.id);
              }
            });
            updated.groups = currentGroups;
          }
        });
        updates[studentIdx] = updated;
      }
    });

    onUpdate(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-10 space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl">
                   <Edit3 className="w-7 h-7 text-brand-600" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-800 dark:text-white">עדכון קבוצתי בטקסט חופשי</h3>
                   <p className="text-slate-500 font-bold">פורמט: שם התלמיד, חברים: חבר1; חבר2, להרחיק: חבר3</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                 <X className="w-6 h-6 text-slate-400" />
              </button>
           </div>

           <textarea 
             className="w-full h-80 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 font-mono text-sm leading-relaxed outline-none focus:border-brand-500 transition-colors"
             placeholder={`ישראל ישראלי, חברים: יונתן; דנה, גובה: נמוך\nיונית לוי, להרחיק: דביר, גובה: גבוה`}
             value={text}
             onChange={(e) => setText(e.target.value)}
           />

           <div className="flex gap-4">
              <button 
                onClick={handleUpdate}
                className="flex-1 py-5 bg-brand-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-brand-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
              >
                עדכן את כל התלמידים
              </button>
              <button 
                onClick={onClose}
                className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-[2rem] font-black hover:bg-slate-200 transition-all"
              >
                ביטול
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

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
  setNotifications,
  conflicts = []
}: any) => {
  const [isOver, setIsOver] = useState(false);
  const draggingS = currentConfig.students.find((s: any) => s.id === draggedStudentId);
  const isCompatible = draggingS && draggingS.height === 'short' ? Math.floor(idx / currentConfig.cols) < 2 : true;
  const compatibilityClass = isOver ? (isCompatible ? "bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100" : "bg-rose-50 border-rose-300 ring-4 ring-rose-100") : "";

  const isSelected = studentId && selectedStudentId === studentId;
  const isObstruction = currentConfig.obstructions?.includes(idx);
  
  // Find conflicts for this specific desk
  const deskConflicts = conflicts.filter((c: any) => c.deskIdx1 === idx || c.deskIdx2 === idx);
  const hasConflict = deskConflicts.length > 0;

  const isPrinting = currentConfig.isPrinting;

  if (((isHidden || isObstruction) && !isPrinting) && editMode === 'normal') return (
    <div style={{ gridColumn: colPos, gridRow: rowPos }} className="aspect-square bg-transparent flex items-center justify-center">
      {isObstruction && <ShieldAlert className="w-5 h-5 text-slate-200" />}
    </div>
  );

  if (isPrinting && (isHidden || isObstruction)) return <div style={{ gridColumn: colPos, gridRow: rowPos }} />;

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
      layout
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
      whileHover={is3DView ? { scale: 1.02, y: -8, rotateX: 2, rotateY: -2 } : { scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      animate={isSelected ? { scale: 1.1, y: -10, z: 50, shadow: "0 20px 40px rgba(0,0,0,0.2)" } : { scale: 1, y: 0, z: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{ 
        gridColumn: colPos, 
        gridRow: rowPos,
        ...(is3DView && !isHidden ? {
          transform: `translateZ(${idx === activeDeskIdx ? '80px' : '40px'}) rotateX(0deg)`,
          boxShadow: idx === activeDeskIdx || isSelected
            ? '0 40px 80px rgba(0,0,0,0.3)' 
            : '0 20px 40px rgba(0,0,0,0.15)',
          transformStyle: 'preserve-3d',
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
        isPrinting ? "bg-white border-slate-100" : (
          isObstruction ? "bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 opacity-80" :
          isHidden ? "border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 opacity-60 hover:opacity-100 hover:border-brand-400 hover:bg-brand-50" :
          !student ? "bg-slate-50/30 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800" : "bg-white dark:bg-slate-900 border border-brand-100 dark:border-brand-900 shadow-sm ring-2 ring-brand-50 dark:ring-brand-950"
        ),
        compatibilityClass,
        (isSelected && !isPrinting) && "ring-4 ring-brand-400 border-brand-500 shadow-2xl z-50",
        (hasConflict && !isPrinting) && "ring-4 ring-rose-400/30 border-rose-200 dark:border-rose-900",
        (editMode === 'structure' && !isHidden && !isObstruction && !isPrinting) && "cursor-move hover:ring-2 hover:ring-amber-300"
      )}
    >
      {/* Conflict Overlay Pulse */}
      {hasConflict && student && (
        <motion.div 
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-rose-500 rounded-[2rem] pointer-events-none z-0"
        />
      )}

      {editMode === 'structure' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-1 z-10"
        >
          {isObstruction ? (
            <>
              <ShieldAlert className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">הפרעה/עמוד</span>
            </>
          ) : isHidden ? (
            <>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:scale-110 transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[8px] font-black text-slate-400 group-hover:text-brand-600 uppercase tracking-tighter">הוסף</span>
            </>
          ) : null}
        </motion.div>
      )}

      {/* Desk Surface Visualization */}
      {!isHidden && !isObstruction && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-1" />
      )}
      
      {showDeskNumbers && !isPrinting && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-black text-slate-400">#{idx + 1}</span>}
      
      {student ? (
        <div className="flex flex-col items-center gap-1 w-full z-10">
           {/* Chair Backrest Icon */}
           <div className="w-10 h-7 bg-slate-200 dark:bg-slate-700 rounded-t-lg -mb-2 z-0 border border-slate-300 dark:border-slate-600 shadow-inner flex items-center justify-center">
             <div className="w-5 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
           </div>
           
           <div className={cn(
             "z-10 flex flex-col items-center bg-white dark:bg-slate-800 px-5 py-2.5 rounded-2xl border-2 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] relative w-[90%]",
             (hasConflict && !isPrinting) ? "border-rose-400 dark:border-rose-900" : "border-slate-400 dark:border-slate-600",
              isPrinting && "shadow-none border-slate-200"
           )}>
             <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{student.name}</span>
             
             {/* Indicators for constraints */}
             <div className="flex gap-1.5 mt-2">
               {student.height === 'short' && (
                 <div title="ראייה/קדמי" className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800 shadow-sm">
                   <Eye className="w-3.5 h-3.5 text-amber-600" />
                 </div>
               )}
               {student.preferred?.length > 0 && (
                 <div title="חברים" className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800 shadow-sm">
                   <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                 </div>
               )}
               {student.forbidden?.length > 0 && (
                 <div title="הפרדות" className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                   <Ban className="w-3.5 h-3.5 text-slate-600" />
                 </div>
               )}
               {(student.groups && student.groups.length > 0) && (
                 <div title="שייך לקבוצה" className="p-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-800 shadow-sm">
                   <Layers className="w-3.5 h-3.5 text-brand-600" />
                 </div>
               )}
             </div>

             {/* Conflict Badge */}
             {(hasConflict && !isPrinting) && (
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="absolute -top-3 -left-3 w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800"
               >
                 <AlertCircle className="w-4 h-4" />
               </motion.div>
             )}
             
             {/* Group Dot Indicators */}
             {(student.groups && student.groups.length > 0 && !isPrinting) && (
               <div className="absolute -top-2 -right-2 flex gap-1">
                 {student.groups.map((gId: string, i: number) => {
                   const group = currentConfig.groups?.find((g: any) => g.id === gId);
                   const colors = ['bg-brand-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500'];
                   const groupIndex = (currentConfig.groups || []).findIndex((g: any) => g.id === gId);
                   return (
                     <div key={i} className={cn("w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm", colors[groupIndex % colors.length] || 'bg-slate-400')} title={group?.name || `קבוצה ${gId}`} />
                   );
                 })}
               </div>
             )}
           </div>
           
           {/* Desk Shadow Area */}
           <div className="w-12 h-1.5 bg-slate-300/40 dark:bg-black/40 rounded-full blur-[2px] mt-2" />
           
           {/* Actions */}
           <div className="absolute inset-0 flex items-center justify-center pt-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex gap-2 pointer-events-auto">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCurrentConfig((prev: any) => {
                      const newGrid = [...prev.grid];
                      newGrid[idx] = null;
                      return { ...prev, grid: newGrid };
                    });
                    setNotifications((prev: any) => [{ id: Date.now(), text: `השיבוץ בוטל: ${student.name}`, type: 'info' }, ...prev]);
                  }}
                  className="w-10 h-10 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white hover:border-rose-700 shadow-xl transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowProfile();
                  }}
                  className="w-10 h-10 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center hover:bg-brand-600 hover:text-white hover:border-brand-700 shadow-xl transition-all"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
           </div>
        </div>
      ) : !isHidden && (
        <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-50 transition-opacity">
           <LayoutGrid className="w-6 h-6 text-slate-400" />
           <Plus className="w-3 h-3 text-slate-400" />
        </div>
      )}

    </motion.div>
  );
};

const ConflictPanel = ({ conflicts, students, onResolve }: any) => {
  if (conflicts.length === 0) return (
    <div className="flex flex-col items-center justify-center p-8 bg-emerald-50/20 dark:bg-emerald-950/10 border border-dashed border-emerald-200 dark:border-emerald-900 rounded-[2rem]">
      <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
      <p className="text-sm font-black text-emerald-600 uppercase tracking-widest text-center">אין קונפליקטים פעילים</p>
      <p className="text-[10px] font-bold text-emerald-600/60 mt-1">כל האילוצים וההעדפות נענו בהצלחה!</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          ניתוח קונפליקטים ({conflicts.length})
        </h3>
      </div>
      
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {conflicts.map((conflict: any, idx: number) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 rounded-2xl shadow-sm flex gap-3 items-start group"
          >
            <div className="p-2 bg-rose-50 dark:bg-rose-900/10 rounded-xl group-hover:bg-rose-100 transition-colors">
              {conflict.type === 'height' ? <Eye className="w-4 h-4 text-rose-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{conflict.message}</p>
              <div className="flex gap-4 mt-2">
                <button 
                  onClick={() => onResolve(conflict)}
                  className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest hover:underline underline-offset-4"
                >
                  הצע פתרון
                </button>
                <button 
                  onClick={() => {
                    // Logic to highlight the desks involved
                  }}
                  className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest hover:text-slate-600"
                >
                  הצג במפה
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="p-4 bg-brand-50/50 dark:bg-brand-950/10 rounded-2xl border border-brand-100 dark:border-brand-900/50">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-brand-600" />
          <span className="text-[10px] font-black text-brand-700 dark:text-brand-400 uppercase tracking-widest">עצה חכמה</span>
        </div>
        <p className="text-[11px] font-bold text-brand-800 dark:text-brand-300 leading-relaxed">
          ניסית להחליף בין {students.find((s:any)=>s.id===conflicts[0]?.studentId1)?.name || 'התלמיד'} לבין מקום פנוי בשורה הראשונה?
        </p>
      </div>
    </div>
  );
};

// --- Content Handlers & Views ---

// --- Views ---

const AttendanceView = ({ students, onBack }: { students: any[], onBack: () => void }) => {
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

  const toggleStatus = (id: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const lateCount = Object.values(attendance).filter(v => v === 'late').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack}
          className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">נוכחות יומית</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest">
              יום שלישי, 28 באפריל, 2024
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black">
              {presentCount} נוכחים
            </div>
            <div className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-black">
              {lateCount} מאחרים
            </div>
            <div className="px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-black">
              {absentCount} נעדרים
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {students.map((s, idx) => {
          const status = attendance[s.id] || 'none';
          return (
            <div key={`${s.id}-${idx}`} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col gap-6 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-2xl text-slate-400 group-hover:bg-brand-600 group-hover:text-white transition-colors uppercase">
                  {s.name[0]}
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-slate-800 dark:text-white leading-tight">{s.name}</span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">תלמיד מן המניין</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => toggleStatus(s.id, 'present')}
                  className={cn(
                    "py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                    status === 'present' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  )}
                >
                  נוכח
                </button>
                <button 
                   onClick={() => toggleStatus(s.id, 'late')}
                   className={cn(
                     "py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                     status === 'late' ? "bg-amber-500 text-white shadow-lg shadow-amber-100 dark:shadow-none" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                   )}
                >
                  מאחר
                </button>
                <button 
                   onClick={() => toggleStatus(s.id, 'absent')}
                   className={cn(
                     "py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                     status === 'absent' ? "bg-rose-500 text-white shadow-lg shadow-rose-100 dark:shadow-none" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                   )}
                >
                  נעדר
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GradesView = ({ onBack }: { onBack: () => void }) => {
  const [grades, setGrades] = useState([
    { id: '1', name: 'יוני לוי', math: 85, english: 92, science: 78, history: 95 },
    { id: '2', name: 'ענבר כהן', math: 92, english: 88, science: 94, history: 82 },
    { id: '3', name: 'גיל שרון', math: 78, english: 85, science: 82, history: 88 },
    { id: '4', name: 'נועה ברק', math: 95, english: 94, science: 91, history: 97 },
  ]);

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack}
          className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex items-center justify-between flex-1">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">ניהול הישגים וציונים</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest">סקירה פדגוגית של הישגי המחצית</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all">
            <Download className="w-5 h-5" />
            ייצוא גיליון
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">שם התלמיד</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">מתמטיקה</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">אנגלית</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">מדעים</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">היסטוריה</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">ממוצע</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {grades.map((s) => {
              const avg = Math.round((s.math + s.english + s.science + s.history) / 4);
              return (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 dark:text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        {s.name[0]}
                      </div>
                      <span className="text-xl font-black text-slate-800 dark:text-white leading-tight">{s.name}</span>
                    </div>
                  </td>
                  {[s.math, s.english, s.science, s.history].map((grade, i) => (
                    <td key={i} className="px-8 py-6">
                      <div className="flex justify-center">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black",
                          grade >= 90 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : 
                          grade >= 80 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                          "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        )}>
                          {grade}
                        </div>
                      </div>
                    </td>
                  ))}
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-50 dark:border-slate-800 flex items-center justify-center text-2xl font-black text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-900/10">
                        {avg}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const ProgressView = ({ onBack }: { onBack: () => void }) => {
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } = require('recharts');

  // Mock data for analytics
  const engagementData = [
    { name: 'אייר', engagement: 65, attendance: 92, satisfaction: 78 },
    { name: 'סיוון', engagement: 72, attendance: 88, satisfaction: 82 },
    { name: 'תמוז', engagement: 68, attendance: 94, satisfaction: 85 },
    { name: 'אב', engagement: 85, attendance: 91, satisfaction: 89 },
    { name: 'אלול', engagement: 78, attendance: 95, satisfaction: 92 },
    { name: 'תשרי', engagement: 92, attendance: 97, satisfaction: 94 },
  ];

  const categoryData = [
    { name: 'ריכוז', value: 85 },
    { name: 'שיתוף פעולה', value: 72 },
    { name: 'משמעת', value: 91 },
    { name: 'הישגים', value: 78 },
  ];

  const COLORS = ['#6366f1', '#6366f1', '#a5b4fc', '#e0e7ff'];

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack}
          className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">אופטימיזציה וניתוח נתונים</h2>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest">מבט על התקדמות הכיתה והשיפור במרחבי הלמידה</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-8 rounded-[3rem] space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-brand-600" />
              מגמות שביעות רצון ומעורבות
            </h3>
            <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black p-2 outline-none">
              <option>6 חודשים אחרונים</option>
              <option>שנה אחרונה</option>
            </select>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementData}>
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1.5rem', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#1e293b',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="#6366f1" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorEngagement)" 
                  name="מעורבות"
                />
                <Area 
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke="#fbbf24" 
                  strokeWidth={4}
                  fill="transparent"
                  name="שביעות רצון"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="glass-card p-8 rounded-[3rem] space-y-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <PieChartIcon className="w-6 h-6 text-brand-600" />
            חלוקת מדדים
          </h3>
          
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900 dark:text-white">82%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">ממוצע כיתתי</span>
            </div>
          </div>

          <div className="space-y-4">
            {categoryData.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Small Analytics Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'שיפור ממוצע', value: '+12%', sub: 'מאז השינוי האחרון', color: 'emerald', icon: <ChevronUp /> },
             { label: 'ריכז בכיתה', value: '7.8/10', sub: 'מדד מבוסס AI', color: 'indigo', icon: <Brain /> },
             { label: 'שת"פ בין תלמידים', value: '4.2', sub: 'אינטראקציות לשעה', color: 'amber', icon: <Zap /> },
             { label: 'שקט תעשייתי', value: '92%', sub: 'מדד רעש ממוצע', color: 'brand', icon: <Activity /> }
           ].map((card, i) => (
             <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[3rem] space-y-4 relative overflow-hidden group hover:scale-[1.02] transition-all">
                <div className={cn(
                  "absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform",
                  `bg-${card.color}-500`
                )} />
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-2",
                  `bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`
                )}>
                  {React.cloneElement(card.icon as React.ReactElement, { className: "w-6 h-6" })}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{card.label}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{card.value}</span>
                    <span className="text-xs font-bold text-slate-400">{card.sub}</span>
                  </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const StudentDetailView = ({ student, currentConfig, onBack, updateCurrentConfig, students, onSelectStudent }: { student: any, currentConfig: any, onBack: () => void, updateCurrentConfig: (update: any) => void, students: any[], onSelectStudent: (id: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'ai' | 'pedagogy' | 'academic' | 'attendance'>('info');
  
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

  const tabs = [
    { id: 'info', label: 'מידע חברתי', icon: <Heart className="w-4 h-4" /> },
    { id: 'ai', label: 'הגדרות AI', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'pedagogy', label: 'פדגוגיה', icon: <FileText className="w-4 h-4" /> },
    { id: 'academic', label: 'הישגים', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'attendance', label: 'נוכחות', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Upper Navigation Bar */}
      <div className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-10 transition-colors">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 p-2 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs transition-all"
          >
            <ChevronRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            חזרה לסידור
          </button>
          
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
          
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-brand-200 ring-4 ring-brand-50 dark:ring-brand-900/20">
               {student.name[0]}
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white leading-none">{student.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">תלמיד #{student.id}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[10px] font-black text-brand-600 leading-none">פעיל במערכת</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button 
                disabled={!prevStudent}
                onClick={() => onSelectStudent(prevStudent.id)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button 
                disabled={!nextStudent}
                onClick={() => onSelectStudent(nextStudent.id)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
           </div>
           
           <button 
              onClick={() => {
                if (confirm(`האם למחוק את ${student.name}?`)) {
                  updateCurrentConfig((prev: any) => ({ 
                    ...prev, 
                    students: prev.students.filter((s:any) => s.id !== student.id),
                    grid: prev.grid.map((id: string | null) => id === student.id ? null : id)
                  }));
                  onBack();
                }
              }}
              className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-all"
           >
              <Trash2 className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-fit shadow-inner">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3.5 rounded-[2rem] text-sm font-black transition-all relative overflow-hidden",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-slate-800 text-brand-600 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="student-tab-indicator" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-brand-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {activeTab === 'info' && (
                <>
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-10 rounded-[3.5rem] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-600/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                         <Heart className="w-6 h-6 text-brand-600" />
                         העדפות חברתיות (חברים)
                      </h3>
                      
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">תלמידים מועדפים</label>
                          <div className="flex flex-wrap gap-2.5">
                            {students.filter(s => s.id !== student.id).map(s => {
                              const isSelected = student.preferred?.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    const current = student.preferred || [];
                                    updateStudent('preferred', isSelected ? current.filter((id: string) => id !== s.id) : [...current, s.id]);
                                  }}
                                  className={cn(
                                    "px-5 py-2.5 rounded-2xl text-sm font-black transition-all border-2",
                                    isSelected 
                                      ? "bg-rose-50 border-rose-200 text-rose-700 shadow-sm" 
                                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200"
                                  )}
                                >
                                  {s.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-800" />

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">הפרדות מנדטוריות</label>
                          <div className="flex flex-wrap gap-2.5">
                            {students.filter(s => s.id !== student.id).map(s => {
                              const isSelected = student.forbidden?.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    const current = student.forbidden || [];
                                    updateStudent('forbidden', isSelected ? current.filter((id: string) => id !== s.id) : [...current, s.id]);
                                  }}
                                  className={cn(
                                    "px-5 py-2.5 rounded-2xl text-sm font-black transition-all border-2",
                                    isSelected 
                                      ? "bg-slate-900 dark:bg-slate-100 border-slate-800 dark:border-slate-200 text-white dark:text-slate-900 shadow-xl" 
                                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200"
                                  )}
                                >
                                  {s.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="glass-card p-10 rounded-[3.5rem] space-y-8">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white">שיבוץ ישיבה</h3>
                      
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מגבלת גובה</label>
                          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem]">
                             {(['short', 'medium', 'tall'] as const).map(h => (
                               <button
                                 key={h}
                                 onClick={() => updateStudent('height', h)}
                                 className={cn(
                                   "py-3.5 rounded-[1.5rem] text-[10px] font-black transition-all",
                                   student.height === h 
                                     ? "bg-white dark:bg-slate-700 text-brand-600 shadow-xl ring-1 ring-slate-200 dark:ring-slate-600" 
                                     : "text-slate-400 hover:text-slate-600"
                                 )}
                               >
                                 {h === 'short' ? 'קדמי' : h === 'medium' ? 'מרכז' : 'אחורי'}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מגדר / קטגוריה</label>
                          <div className="flex gap-2">
                             {['זכר', 'נקבה'].map(g => (
                               <button 
                                key={g}
                                onClick={() => updateStudent('gender', g)}
                                className={cn(
                                  "flex-1 py-4 rounded-3xl text-sm font-black transition-all border-2",
                                  student.gender === g 
                                    ? "bg-brand-50 border-brand-200 text-brand-600" 
                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                                )}
                               >
                                  {g}
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'ai' && (
                <div className="lg:col-span-3">
                   <div className="glass-card p-12 rounded-[4rem] space-y-12">
                      <div className="flex items-center gap-6">
                        <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] shadow-sm">
                           <Brain className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div>
                           <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">פרמטרים לאופטימיזציית AI</h3>
                           <p className="text-lg font-medium text-slate-400 max-w-2xl">כאן תוכלו להגדיר אילוצים ספציפיים לתלמיד זה שישפיעו על האלגוריתם בעת חישוב הסידור האופטימלי.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div className="space-y-10">
                           <div className="space-y-4">
                              <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                 <Layers className="w-4 h-4" />
                                 חברות בקבוצות
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {(currentConfig.groups || []).map((group: any) => {
                                   const isMember = student.groups?.includes(group.id);
                                   return (
                                     <button
                                       key={group.id}
                                       onClick={() => {
                                         const current = student.groups || [];
                                         updateStudent('groups', isMember ? current.filter((id: string) => id !== group.id) : [...current, group.id]);
                                       }}
                                       className={cn(
                                         "p-6 rounded-[2rem] border-2 text-right transition-all flex flex-col gap-2 relative overflow-hidden group/item",
                                         isMember 
                                           ? "bg-brand-50 border-brand-200 text-brand-900 shadow-sm" 
                                           : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200"
                                       )}
                                     >
                                       <div className="flex items-center justify-between">
                                         <span className="font-black text-base">{group.name}</span>
                                         {isMember && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                                       </div>
                                       <span className="text-[10px] font-bold opacity-60">
                                         אילוץ: {group.constraint === 'together' ? 'ישיבה יחד' : group.constraint === 'separate' ? 'הפרדה' : 'ללא אילוץ'}
                                       </span>
                                     </button>
                                   );
                                 })}
                              </div>
                              {(currentConfig.groups || []).length === 0 && (
                                 <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    טרם הוגדרו קבוצות בהגדרות המערכת
                                 </div>
                              )}
                           </div>

                           <div className="space-y-4">
                              <div className="flex justify-between items-end">
                                 <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">משקולת חשיבות כללית</label>
                                 <span className="text-2xl font-black text-brand-600">{student.areaPref?.weight || 50}</span>
                              </div>
                              <input 
                                type="range" min="0" max="300" step="10"
                                value={student.areaPref?.weight || 50}
                                onChange={(e) => updateAreaPref('weight', parseInt(e.target.value))}
                                className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-brand-500"
                              />
                              <div className="flex justify-between text-xs font-bold text-slate-400 italic">
                                 <span>התחשבות מופחתת</span>
                                 <span>עדיפות עליונה לשיבוץ</span>
                              </div>
                           </div>

                           <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-6">
                              <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">מיקום יעד ספציפי</h4>
                              <div className="grid grid-cols-2 gap-6">
                                 <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400">שורה (0-10)</label>
                                    <input 
                                      type="number" min="0" max="10"
                                      value={student.areaPref?.row ?? ""}
                                      onChange={(e) => updateAreaPref('row', e.target.value === "" ? undefined : parseInt(e.target.value))}
                                      placeholder="אוטומטי"
                                      className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black"
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400">טור (0-12)</label>
                                    <input 
                                      type="number" min="0" max="12"
                                      value={student.areaPref?.col ?? ""}
                                      onChange={(e) => updateAreaPref('col', e.target.value === "" ? undefined : parseInt(e.target.value))}
                                      placeholder="אוטומטי"
                                      className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black"
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <button 
                             onClick={() => updateAreaPref('isolated', !student.areaPref?.isolated)}
                             className={cn(
                               "w-full p-8 rounded-[3rem] border-2 text-right transition-all group relative overflow-hidden",
                               student.areaPref?.isolated 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200" 
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                             )}
                           >
                              <div className="flex items-center gap-6 relative z-10">
                                 <div className={cn(
                                   "p-4 rounded-3xl transition-colors",
                                   student.areaPref?.isolated ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800"
                                 )}>
                                    <Shield className={cn("w-8 h-8", student.areaPref?.isolated ? "text-white" : "text-slate-400")} />
                                 </div>
                                 <div>
                                    <h4 className="text-xl font-black mb-1">מצב בידוד (Isolation)</h4>
                                    <p className={cn("text-sm font-medium", student.areaPref?.isolated ? "text-indigo-100" : "text-slate-400")}>ה-AI ינסה למצוא מיקום ללא שכנים קרובים כלל</p>
                                 </div>
                              </div>
                           </button>

                           <div className="p-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[3rem] space-y-4">
                              <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                                 <ShieldAlert className="w-6 h-6" />
                                 <h4 className="text-base font-black">מידע חשוב</h4>
                              </div>
                              <p className="text-sm font-medium text-amber-600 dark:text-amber-500 italic leading-relaxed">
                                שים לב שהגדרת מיקומים קשיחים (שורה/טור) עלולה לפגוע ביכולת ה-AI למצוא פתרון העונה על כל האילוצים החברתיים. השתמש בזה רק כשזה הכרחי במיוחד.
                              </p>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'pedagogy' && (
                <div className="lg:col-span-3">
                   <div className="glass-card p-12 rounded-[4rem] space-y-10">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2.5rem]">
                               <FileText className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">הערות ותיעוד פדגוגי</h3>
                         </div>
                         <div className="text-sm font-black text-slate-400 tracking-widest uppercase">מעודכן לאחרונה: היום</div>
                      </div>

                      <textarea 
                         value={student.notes || ''}
                         onChange={(e) => updateStudent('notes', e.target.value)}
                         placeholder="הזן תיעוד פדגוגי, נקודות לשימור, קשיים לימודיים או הערות התנהגותיות..."
                         className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 text-xl font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 min-h-[400px] transition-all resize-none shadow-inner"
                      />
                   </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="lg:col-span-3">
                   <EmptyState 
                      icon={<GraduationCap className="w-12 h-12" />}
                      title="מודול הישגים לימודיים"
                      description="כאן תוכלו לראות גרפים ומגמות על ציוני התלמיד לאורך שנת הלימודים. מודול זה יהיה זמין בעדכון התוכנה הבא."
                   />
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="lg:col-span-3">
                   <div className="glass-card p-12 rounded-[4rem] space-y-10">
                      <div className="flex items-center gap-6">
                         <div className="p-5 bg-brand-50 dark:bg-brand-900/20 rounded-[2.5rem]">
                            <Calendar className="w-10 h-10 text-brand-600" />
                         </div>
                         <h3 className="text-3xl font-black text-slate-900 dark:text-white">יומן נוכחות (Monthly)</h3>
                      </div>

                      <div className="grid grid-cols-7 gap-4">
                        {Array.from({ length: 35 }).map((_, i) => {
                          const isWeekend = i % 7 >= 5;
                          const isAbsent = i === 14 || i === 22;
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "aspect-square rounded-[1.5rem] flex items-center justify-center text-sm font-black transition-all",
                                isWeekend ? "bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700" :
                                isAbsent ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-2 border-rose-100 dark:border-rose-800 shadow-sm" : 
                                "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-100 dark:border-emerald-800"
                              )}
                            >
                              {i + 1}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ stats, onBack }: any) => (
  <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
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
      {[
        { label: 'תלמידים רשומים', value: stats.studentCount, icon: <Users />, color: 'brand' },
        { label: 'שביעות רצון', value: `${stats.satisfaction}%`, icon: <Sparkles />, color: 'amber', badge: '98% נוכחות' },
        { label: 'שיבוץ נוכחי', value: `${stats.placedCount} / ${stats.studentCount}`, icon: <LayoutGrid />, color: 'indigo', badge: 'מעודכן' },
        { label: 'אילוצים לא פתורים', value: stats.conflicts, icon: <AlertCircle />, color: 'rose', badge: stats.conflicts > 0 ? "נדרש טיפול" : "תקין" },
      ].map((card, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-8 rounded-[3rem] space-y-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform opacity-10",
            `bg-${card.color}-500`
          )} />
          <div className="relative flex items-center justify-between">
            <div className={cn(
              "p-4 rounded-2xl border shadow-inner",
              `bg-${card.color}-100 dark:bg-${card.color}-900/20 border-${card.color}-200 dark:border-${card.color}-800`
            )}>
              {React.cloneElement(card.icon as React.ReactElement, { className: `w-8 h-8 text-${card.color}-700 dark:text-${card.color}-400` })}
            </div>
            {card.badge && (
              <Badge className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                card.color === 'rose' && card.value > 0 ? "bg-rose-50 dark:bg-rose-900/40 text-rose-600 border border-rose-100 dark:border-rose-800" : "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800"
              )}>
                {card.badge}
              </Badge>
            )}
          </div>
          <div className="relative">
            <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{card.label}</h3>
            <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LoadingSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4 w-full">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-5 bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-[2rem] flex items-center gap-4 animate-pulse">
        <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full w-2/3" />
          <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const GroupManager = ({ groups = [], updateCurrentConfig, setNotifications }: any) => {
  const addGroup = () => {
    const name = prompt("שם הקבוצה החדשה:");
    if (!name) return;
    const id = (groups.length + 1).toString();
    updateCurrentConfig((prev: any) => ({
      ...prev,
      groups: [...(prev.groups || []), { id, name, constraint: 'none' }]
    }));
    setNotifications((prev: any) => [{ id: Date.now(), text: `קבוצה חדשה נוצרה: ${name}`, type: 'success' }, ...prev]);
  };

  const removeGroup = (id: string) => {
    if (!confirm("האם למחוק קבוצה זו? (שיוכי תלמידים יישמרו אך לא ישפיעו על ה-AI)")) return;
    updateCurrentConfig((prev: any) => ({
      ...prev,
      groups: prev.groups.filter((g: any) => g.id !== id)
    }));
  };

  const updateGroup = (id: string, field: string, value: any) => {
    updateCurrentConfig((prev: any) => ({
      ...prev,
      groups: prev.groups.map((g: any) => g.id === id ? { ...g, [field]: value } : g)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-indigo-500" />
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">ניהול קבוצות ואילוצי ישיבה</h3>
        </div>
        <button 
          onClick={addGroup}
          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף קבוצה
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group: any) => (
          <div key={group.id} className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] space-y-4 hover:shadow-lg transition-all group overflow-hidden">
            <div className="flex items-center justify-between">
              <input 
                value={group.name}
                onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 focus:ring-0 border-0 p-0 text-base flex-1"
              />
              <button 
                onClick={() => removeGroup(group.id)}
                className="p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">אילוץ ישיבה (AI)</label>
              <div className="flex gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl">
                {[
                  { value: 'none', label: 'ללא אילוץ', icon: <Minus className="w-3 h-3" /> },
                  { value: 'together', label: 'שבו יחד', icon: <Heart className="w-3 h-3" /> },
                  { value: 'separate', label: 'מופרדים', icon: <Ban className="w-3 h-3" /> }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateGroup(group.id, 'constraint', opt.value)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all flex flex-col items-center gap-1",
                      group.constraint === opt.value 
                        ? (opt.value === 'together' ? "bg-emerald-500 text-white shadow-md" : opt.value === 'separate' ? "bg-rose-500 text-white shadow-md" : "bg-white dark:bg-slate-700 text-brand-600 shadow-sm")
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {group.constraint === 'together' ? 'ה-AI ינסה לשבץ חברי קבוצה זה לצד זה.' : 
               group.constraint === 'separate' ? 'ה-AI ימנע משיבוץ חברי קבוצה זה לצד זה.' : 
               'אין אילוץ מיוחד לקבוצה זו.'}
            </p>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
            <Layers className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">טרם הוגדרו קבוצות</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon, title, description, action }: any) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center p-12 text-center space-y-6"
  >
    <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 rounded-[2.5rem] flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-bento">
      {icon}
    </div>
    <div className="space-y-2">
      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">{description}</p>
    </div>
    {action && action}
  </motion.div>
);

const StudentCard = ({ student, currentConfig, updateCurrentConfig, setNotifications, isSelected, onClick }: any) => {
  const [localName, setLocalName] = useState(student.name);

  useEffect(() => {
    setLocalName(student.name);
  }, [student.name]);

  const commitName = () => {
    if (!localName.trim()) {
      setLocalName(student.name);
      return;
    }
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
    <motion.div 
      layout
      onClick={onClick}
      whileHover={{ scale: 1.01, x: -4 }}
      className={cn(
        "p-5 bg-white dark:bg-slate-900 border-2 transition-all group cursor-pointer relative rounded-[2rem]",
        isSelected ? "border-brand-500 ring-4 ring-brand-100 dark:ring-brand-900 shadow-xl" : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors shadow-sm",
          isSelected ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
        )}>
          {student.name[0]}
        </div>
        
        <div className="flex-1 flex flex-col gap-0.5">
          <input 
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && commitName()}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent font-black text-slate-800 dark:text-slate-100 focus:ring-0 border-0 p-0 text-base"
          />
          <div className="flex gap-2">
             <Badge className={cn(
               "text-[9px] px-2 py-0.5 rounded-md",
               student.height === 'short' ? "bg-amber-100 text-amber-900" : student.height === 'tall' ? "bg-indigo-100 text-indigo-900" : "bg-slate-100 text-slate-600"
             )}>
                {student.height === 'short' ? 'קדמי' : student.height === 'tall' ? 'אחורי' : 'בינוני'}
             </Badge>
             {student.groups?.map((gId: string) => {
                const group = currentConfig.groups?.find((g: any) => g.id === gId);
                const groupIndex = (currentConfig.groups || []).findIndex((g: any) => g.id === gId);
                const colors = ['bg-brand-50 text-brand-700 border-brand-100', 'bg-amber-50 text-amber-700 border-amber-100', 'bg-emerald-50 text-emerald-700 border-emerald-100', 'bg-indigo-50 text-indigo-700 border-indigo-100', 'bg-rose-50 text-rose-700 border-rose-100'];
                return (
                  <Badge key={gId} className={cn("text-[9px] px-2 py-0.5 rounded-md border", colors[groupIndex % colors.length] || 'bg-slate-50 text-slate-500 border-slate-100')}>
                     {group?.name || `קבוצה ${gId}`}
                  </Badge>
                );
             })}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
             className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>

      {isSelected && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">גובה עבור הושבה</label>
                <div className="flex gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl">
                   {(['short', 'medium', 'tall'] as const).map(h => (
                     <button
                       key={h}
                       onClick={(e) => { e.stopPropagation(); updateStudent('height', h); }}
                       className={cn(
                         "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all",
                         student.height === h ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                       )}
                     >
                       {h === 'short' ? 'קדמי' : h === 'medium' ? 'אמצע' : 'אחור'}
                     </button>
                   ))}
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">קבוצת לימוד</label>
                <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl">
                   {(currentConfig.groups || []).map((g: any) => (
                     <button
                       key={g.id}
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         const current = student.groups || [];
                         updateStudent('groups', current.includes(g.id) ? current.filter((cg: string) => cg !== g.id) : [...current, g.id]);
                       }}
                       className={cn(
                         "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
                         student.groups?.includes(g.id) ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                       )}
                     >
                       {g.name}
                     </button>
                   ))}
                   {(currentConfig.groups || []).length === 0 && <span className="text-[9px] text-slate-400 p-1">אין קבוצות מוגדרות</span>}
                </div>
             </div>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
               <Heart className={cn("w-3 h-3", student.preferred?.length > 0 ? "text-rose-500" : "text-slate-300")} />
               <span className="text-[10px] font-bold text-slate-500">{student.preferred?.length || 0} העדפות</span>
            </div>
            <div className="flex items-center gap-1">
               <Ban className={cn("w-3 h-3", student.forbidden?.length > 0 ? "text-slate-600" : "text-slate-300")} />
               <span className="text-[10px] font-bold text-slate-500">{student.forbidden?.length || 0} הרחקות</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onClick(); }} 
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black hover:bg-brand-700 shadow-lg shadow-brand-100"
            >
              פרופיל מלא
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
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
        
        {/* Group Management */}
        <div className="md:col-span-2 glass-card p-10 rounded-[3rem] space-y-8 bg-white/40 shadow-sm border border-slate-100">
          <GroupManager 
            groups={currentConfig.groups} 
            updateCurrentConfig={updateCurrentConfig}
            setNotifications={setNotifications} 
          />
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

              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                currentConfig.students.length === 0 && "md:col-span-1 md:flex md:justify-center"
              )}>
                {currentConfig.students.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 w-full">
                    <EmptyState 
                      icon={<Users className="w-12 h-12" />}
                      title="אין תלמידים רשומים"
                      description="הוסיפו תלמידים ידנית או יבאו קובץ Excel כדי להתחיל בשיבוץ."
                      action={
                        <button 
                          onClick={loadExampleData}
                          className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-xl hover:bg-brand-700 transition-all flex items-center gap-2 active:scale-95"
                        >
                          <Zap className="w-5 h-5" />
                          טען נתוני דוגמה מהסימולציה
                        </button>
                      }
                    />
                  </div>
                ) : (
                  currentConfig.students.map((student: any, idx: number) => (
                    <StudentCard 
                      key={`${student.id}-${idx}`}
                      student={student}
                      currentConfig={currentConfig}
                      updateCurrentConfig={updateCurrentConfig}
                      setNotifications={setNotifications}
                      isSelected={selectedStudentId === student.id}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setViewType('studentDetail');
                      }}
                    />
                  ))
                )}
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const conflicts = useMemo(() => calculateConflicts(currentConfig), [currentConfig]);

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
  const isPrinting = (currentConfig as any).isPrinting;
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
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
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

        // 1. Social Score (Personal + Groups)
        neighbors.forEach(nIdx => {
          const neighborId = assignment[nIdx];
          if (!neighborId) return;
          const neighbor = students.find(s => s.id === neighborId);
          if (!neighbor) return;

          // Personal prefs
          if (student.preferred?.includes(neighborId)) score += weights.preferred;
          if (student.forbidden?.includes(neighborId)) score -= weights.forbidden;

          // Group constraints
          student.groups?.forEach((gId: string) => {
            const group = (currentConfig as any).groups?.find((g: any) => g.id === gId);
            if (!group) return;

            if (neighbor.groups?.includes(gId)) {
              // Same group
              if (group.constraint === 'together') score += 15; // Positive weight for sitting together
              if (group.constraint === 'separate') score -= 20; // Negative weight for sitting together when should separate
            }
          });
        });

        // 1.5 Together isolation penalty
        student.groups?.forEach((gId: string) => {
          const group = (currentConfig as any).groups?.find((g: any) => g.id === gId);
          if (group?.constraint === 'together') {
            const hasGroupMemberAdjacent = neighbors.some(nIdx => {
               const neighborId = assignment[nIdx];
               if (!neighborId) return false;
               const neighbor = students.find(s => s.id === neighborId);
               return neighbor?.groups?.includes(gId);
            });
            if (!hasGroupMemberAdjacent) {
               // If there are other members of this group in the class, sitting alone is bad
               const otherMembers = students.filter(s => s.id !== sid && s.groups?.includes(gId));
               if (otherMembers.length > 0) score -= 50;
            }
          }
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

            neighbors.forEach(nIdx => {
              const neighborId = assignment[nIdx];
              if (!neighborId) return;
              const neighbor = students.find(s => s.id === neighborId);
              if (!neighbor) return;

              const inSameGroup = neighbor.groups?.includes(groupId);
              if (inSameGroup) {
                if (groupConfig.constraint === 'together') score += 100;
                if (groupConfig.constraint === 'separate') score -= 200;
              }
            });
          });
        }

        // Height constraint
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
      
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      const pool = [...validSeats].sort(() => Math.random() - 0.5);

      shuffledStudents.forEach((s) => {
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
      const iterations = 5000;
      
      for (let i = 0; i < iterations; i++) {
        const idx1 = validSeats[Math.floor(Math.random() * validSeats.length)];
        const idx2 = validSeats[Math.floor(Math.random() * validSeats.length)];
        
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

  const studentsInPool = useMemo(() => currentConfig.students.filter(s => {
    const isPlaced = currentConfig.grid.includes(s.id);
    const matchesFilter = selectedGroups.length === 0 || (s.groups && s.groups.some((g: string) => selectedGroups.includes(g)));
    return !isPlaced && matchesFilter;
  }), [currentConfig.students, currentConfig.grid, selectedGroups]);

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
          const wb = XLSX.read(bstr as string, { type: 'binary' });
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
        [r-1, c-1], [r-1, c+1], [r+1, c-1], [r+1, c+1]
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
          (student.separateFrom && student.separateFrom.includes(nSid));

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
            currentConfig={currentConfig}
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
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-50 transition-colors">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all shadow-sm"
          title={isSidebarOpen ? "סגור תפריט" : "פתח תפריט"}
        >
          {isSidebarOpen ? <ChevronRight className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-brand-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl scale-110 shadow-brand-200 dark:shadow-none -rotate-2 group hover:rotate-0 transition-all duration-500">
            <Sparkles className="w-7 h-7 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">ClassManager <span className="text-brand-600">Pro</span></h1>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">v3.5 Enterprise</span>
               <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
               <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">AI Core Ready</span>
            </div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
           {(['grid', 'dashboard', 'attendance', 'grades', 'progress', 'settings'] as const).map(nav => (
             <button
               key={nav}
               onClick={() => setViewType(nav)}
               className={cn(
                 "px-4 py-2 rounded-xl text-xs font-black transition-all",
                 viewType === nav 
                  ? "bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
                is3DView 
                  ? "bg-brand-600 text-white shadow-lg" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Box className="w-4 h-4" />
              תצוגת 3D
            </button>
            
            {aiInsights.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <p className="text-[10px] font-black text-indigo-800 dark:text-indigo-300">{aiInsights[0].text}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsBulkUpdateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-2xl font-black text-xs hover:bg-brand-700 transition-all shadow-md active:scale-95"
          title="עדכון קבוצתי"
        >
          <Edit3 className="w-4 h-4" />
          עדכון מהיר
        </button>
        {undoHistory.length > 0 && (
          <button 
            onClick={undo}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-2xl font-black text-xs hover:bg-brand-100 dark:hover:bg-brand-800 transition-all border border-brand-100 dark:border-brand-800 shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 rotate-180" />
            ביטול פעולה
          </button>
        )}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all"
          title={isDarkMode ? "מצב יום" : "מצב לילה"}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button 
          onClick={() => setOnboardingStep(0)}
          className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all"
          title="עזרה והדרכה"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setViewType('settings')}
          className={cn(
            "p-3 rounded-2xl transition-all relative overflow-hidden",
            viewType === 'settings' ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400" : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          )}
        >
          <Settings className="w-5 h-5" />
          {viewType === 'settings' && <motion.div layoutId="nav-active" className="absolute inset-0 bg-brand-200/20" />}
        </button>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-black text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform">
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
    
    // Set printing mode to hide UI elements
    updateCurrentConfig((prev: any) => ({ ...prev, isPrinting: true }));

    try {
      // Temporarily switch off 3D if active for better printing
      const was3D = is3DView;
      if (was3D) setIs3DView(false);
      
      // Wait for layout and state to settle
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(gridRef.current, {
        scale: 3, // Higher scale for better PDF quality
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
      updateCurrentConfig((prev: any) => ({ ...prev, isPrinting: false }));
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
      "absolute z-40 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors",
      isMobile 
        ? "inset-x-0 bottom-0 h-[80vh] rounded-t-[3rem] border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]" 
        : "right-0 lg:relative lg:right-auto w-[300px] h-full border-l border-slate-200 dark:border-slate-800"
    )}
  >
    {isMobile && (
      <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-4 shrink-0" />
    )}
    <div className="p-6 flex flex-col gap-8 custom-scrollbar h-full overflow-y-auto">
      {/* Classroom Header */}
      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-6 rounded-3xl flex flex-col gap-4 shadow-sm transition-colors">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">כיתה פעילה</h3>
            <Badge className="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-800">v3.2.0</Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              value={currentConfig.name}
              onChange={(e) => updateCurrentConfig((prev: any) => ({ ...prev, name: e.target.value }))}
              className="text-xl font-black text-slate-900 dark:text-white bg-transparent border-0 p-0 focus:ring-0 flex-1 leading-none"
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
         <h3 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest px-1">אילוצי קבוצות</h3>
          <div className="grid grid-cols-1 gap-3">
            {currentConfig.groups.map((group: any) => (
              <div key={group.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white",
                    group.id === 'א' ? "bg-brand-500" : group.id === 'ב' ? "bg-amber-500" : "bg-emerald-500"
                  )}>
                    {group.id}
                  </div>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200">{group.name}</span>
                </div>
                <select 
                  value={group.constraint}
                  onChange={(e) => updateCurrentConfig((prev: any) => ({
                    ...prev,
                    groups: prev.groups.map((g: any) => g.id === group.id ? { ...g, constraint: e.target.value } : g)
                  }))}
                  className="bg-slate-50 dark:bg-slate-900 border-0 text-[10px] font-black rounded-lg focus:ring-1 focus:ring-brand-200 py-1 px-2 text-slate-700 dark:text-slate-300 transition-colors"
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
                  {studentsInPool.length === 0 ? (
                    <EmptyState 
                      icon={<CheckCircle2 className="w-10 h-10" />}
                      title="הכל מוכן!"
                      description="כל התלמידים משולבים בכיתה בהצלחה."
                    />
                  ) : (
                    studentsInPool.map((student, idx) => (
                      <motion.div
                        key={`${student.id}-${idx}`}
                        draggable
                        onDragStart={() => setDraggedStudentId(student.id)}
                        onDragEnd={() => setDraggedStudentId(null)}
                        className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-brand-500 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-600 dark:text-slate-400 text-base">
                            {student.name[0]}
                          </div>
                          <span className="text-base font-black text-slate-900 dark:text-slate-100">{student.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                             onClick={() => {
                               setSelectedStudentId(student.id);
                               setViewType('studentDetail');
                             }}
                             className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-brand-600 transition-colors"
                          >
                             <Eye className="w-5 h-5" />
                          </button>
                          <MoreVertical className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Conflict Analysis Section */}
              <div className="glass-card p-6 bg-rose-50/10 border border-rose-100 dark:border-rose-900/20 rounded-[2.5rem]">
                <ConflictPanel 
                  conflicts={conflicts} 
                  students={currentConfig.students}
                  onResolve={(conflict: any) => {
                    setNotifications(prev => [{ id: Date.now(), text: `הצעה: העבר את ${currentConfig.students.find((s:any)=>s.id===conflict.studentId1)?.name} למקום פנוי בשורה 1`, type: 'info' }, ...prev]);
                  }}
                />
              </div>

      {/* View Satisfaction Indicator */}
      <div className="glass-card p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ממוצע שביעות רצון</h3>
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
        "flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans rtl selection:bg-brand-100 transition-colors",
        isDarkMode && "dark",
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
                          {(currentConfig.groups || []).map(group => (
                            <button
                               key={group.id}
                               onClick={() => setSelectedGroups(prev => prev.includes(group.id) ? prev.filter(pg => pg !== group.id) : [...prev, group.id])}
                               className={cn(
                                 "px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap",
                                 selectedGroups.includes(group.id) ? "bg-brand-600 text-white shadow-md shadow-brand-100" : "bg-slate-50 text-slate-500 border border-slate-100"
                               )}
                            >
                              קבוצה {group.name}
                            </button>
                          ))}
                          {(currentConfig.groups || []).length === 0 && <span className="text-[10px] text-slate-400 italic">לא הוגדרו קבוצות</span>}
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
                        {/* Print Header only for PDF */}
                        {isPrinting && (
                          <div className="w-full text-center mb-12 py-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100">
                             <h1 className="text-4xl font-black text-slate-900">מפת הושבה: {currentConfig.name}</h1>
                             <div className="flex items-center justify-center gap-6 mt-4">
                                <span className="px-4 py-2 bg-white rounded-xl text-slate-600 font-bold border border-slate-200 shadow-sm">סה"כ תלמידים: {currentConfig.students.length}</span>
                                <span className="px-4 py-2 bg-white rounded-xl text-slate-600 font-bold border border-slate-200 shadow-sm">תאריך: {new Date().toLocaleDateString('he-IL')}</span>
                             </div>
                             <p className="text-slate-400 font-bold mt-4 text-xs tracking-widest">הופק באמצעות ClassManager Pro AI</p>
                          </div>
                        )}
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
                        editMode === 'structure' 
                         ? "bg-white dark:bg-slate-900 ring-[12px] ring-amber-400 ring-offset-[12px] ring-offset-slate-100 dark:ring-offset-slate-950 rounded-[5rem] shadow-bento" 
                         : "bg-white dark:bg-slate-900 rounded-[5rem] border-4 border-slate-200 dark:border-slate-800 shadow-2xl"
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
                            conflicts={conflicts}
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

                   {/* PDF Alphabetical Student List - Advanced Version */}
                   {isPrinting && (
                     <div className="w-full mt-24 px-12 pb-20">
                        <div className="h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full mb-16" />
                        <div className="flex items-center gap-4 mb-10">
                           <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                              <Layout className="w-6 h-6" />
                           </div>
                           <h2 className="text-3xl font-black text-slate-800">רשימת שיבוצים שמית</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                           {currentConfig.students
                             .slice()
                             .sort((a: any, b: any) => a.name.localeCompare(b.name, 'he'))
                             .map((s: any, idx: number) => {
                               const deskIdx = currentConfig.grid.indexOf(s.id);
                               const sRow = deskIdx !== -1 ? Math.floor(deskIdx / currentConfig.cols) + 1 : null;
                               const sCol = deskIdx !== -1 ? (deskIdx % currentConfig.cols) + 1 : null;
                               const group = s.groups && s.groups.length > 0 ? currentConfig.groups.find((g: any) => g.id === s.groups[0]) : null;

                               return (
                                 <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                   <div className="flex justify-between items-start">
                                      <span className="text-xl font-black text-slate-900">{s.name}</span>
                                      {group && (
                                         <span className="text-[9px] font-black px-2 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                                            {group.name}
                                         </span>
                                      )}
                                   </div>
                                   <div className="flex items-center gap-3 mt-2">
                                      <div className={cn(
                                        "w-12 h-12 rounded-2xl flex flex-col items-center justify-center border-2",
                                        deskIdx !== -1 ? "bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-100" : "bg-slate-50 border-slate-200 text-slate-300"
                                      )}>
                                         <span className="text-[8px] font-black uppercase opacity-50">שולחן</span>
                                         <span className="text-xl font-black leading-none">{deskIdx !== -1 ? deskIdx + 1 : '--'}</span>
                                      </div>
                                      <div className="flex flex-col">
                                         <span className="text-[10px] font-black text-slate-400 uppercase">מיקום במערך:</span>
                                         <span className="text-xs font-bold text-slate-600">
                                            {deskIdx !== -1 ? `שורה ${sRow}, טור ${sCol}` : 'טרם שובץ'}
                                         </span>
                                      </div>
                                   </div>
                                 </div>
                               );
                             })
                           }
                        </div>
                        <div className="mt-20 text-center text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em]">
                           Generated by ClassManager Pro // End of Report
                        </div>
                     </div>
                   )}
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
      
      {/* Notifications & Overlays */}
      {isBulkUpdateOpen && (
        <BulkUpdateModal 
          students={currentConfig.students}
          groups={currentConfig.groups}
          onClose={() => setIsBulkUpdateOpen(false)}
          onUpdate={(updates: any[]) => {
            updateCurrentConfig((prev: any) => ({
              ...prev,
              students: updates
            }));
          }}
        />
      )}

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
                n.type === 'error' ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-200 shadow-rose-200 dark:shadow-none" : "bg-white dark:bg-slate-900 border-brand-500 text-slate-700 dark:text-slate-200 shadow-slate-200 dark:shadow-none"
              )}
            >
              {n.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-brand-500" />}
              <div className="flex-1">
                <p className="text-xs font-black">{n.text}</p>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <footer className="h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0 transition-colors">
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
