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
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Activity,
  AlertCircle,
  BarChart3,
  ArrowRight,
  ArrowRightLeft,
  Ban,
  Bell,
  Bookmark,
  BookOpen,
  Box,
  Brain,
  Briefcase,
  Cake,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  CloudLightning,
  Columns,
  Computer,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileDown,
  FileText,
  Filter,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Grid3X3,
  GripVertical,
  Heart,
  HelpCircle,
  History,
  Info,
  Layers,
  Layout,
  LayoutGrid,
  Lightbulb,
  LineChart,
  ListChecks,
  ListPlus,
  LogOut,
  Palette,
  Lock,
  LockOpen,
  Maximize2,
  Megaphone,
  Menu,
  Minus,
  Monitor,
  Moon,
  MoreVertical,
  MousePointer,
  MousePointer2,
  Move,
  Pause,
  PhoneCall,
  PieChart as PieChartIcon,
  Play,
  Plus,
  Printer,
  Repeat,
  RotateCcw,
  RotateCw,
  Rows,
  Ruler,
  LogIn,
  UserPlus as UserPlus2,
  Save,
  School,
  Search,
  Settings,
  Settings2,
  Share2,
  Shield,
  ShieldAlert,
  Sliders,
  Smartphone,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Tablet,
  Timer,
  Trash2,
  TrendingUp,
  User,
  UserCircle,
  UserCircle2,
  Upload,
  UserPlus,
  Users,
  Wand2,
  Wrench,
  X,
  XCircle,
  Zap,
  Paperclip,
  File,
  FileUp,
  Trophy,
  Target,
  Edit2,
  Archive,
  Image as ImageIcon,
  Map,
  Trash2 as TrashIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HDate, HebrewCalendar, Location } from '@hebcal/core';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';

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
          message: `${s1.name} נמוך/קדמי יושב רחוק מדי.`
        });
      }
    }

    // 2.1 Row Preference Conflict
    if (s1.rowPreference && s1.rowPreference !== 'any') {
      const row = Math.floor(idx1 / cols);
      const totalRows = Math.ceil(grid.length / cols);
      
      let violated = false;
      let targetName = '';
      
      if (s1.rowPreference === 'front' && row >= 2) {
        violated = true;
        targetName = 'קדמית';
      } else if (s1.rowPreference === 'middle' && (row < 1 || row > totalRows - 2)) {
        violated = true;
        targetName = 'אמצעית';
      } else if (s1.rowPreference === 'back' && row < totalRows - 2) {
        violated = true;
        targetName = 'אחורית';
      }
      
      if (violated) {
        conflicts.push({
          type: 'missing_pref',
          studentId1: id1,
          deskIdx1: idx1,
          message: `${s1.name} מעדיף שורה ${targetName}.`
        });
      }
    }

    // 2.2 Corner Preference Conflict
    if (s1.cornerPreference) {
      const col = idx1 % cols;
      const isCorner = col === 0 || col === cols - 1;
      if (!isCorner) {
        conflicts.push({
          type: 'missing_pref',
          studentId1: id1,
          deskIdx1: idx1,
          message: `${s1.name} מעדיף לשבת בפינה או בקצה.`
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

const GroupsPanelModal = ({ groups, updateCurrentConfig, setNotifications, onClose }: any) => {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-8 left-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">ניהול קבוצות משתמשים</h2>
          <p className="text-slate-500 font-medium">כאן תוכלו לנהל קבוצות תלמידים לפי הישגים, חוגים, או מצב חברתי</p>
        </div>
        <GroupManager groups={groups} updateCurrentConfig={updateCurrentConfig} setNotifications={setNotifications} />
      </motion.div>
    </div>
  );
};

const IssuesPanelModal = ({ conflicts, students, updateCurrentConfig, onClose }: any) => {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-8 left-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="mb-6 z-10 relative bg-white dark:bg-slate-900">
          <h2 className="text-2xl font-black text-rose-600 flex items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            בעיות נוכחיות בשיבוץ ({conflicts.length})
          </h2>
          <p className="text-slate-500 font-medium mt-2">המערכת מזהה קונפליקטים בשיבוץ לפי אילוצי התלמידים. פתרו או התעלמו לפי הצורך.</p>
        </div>
        <div className="space-y-4">
          {conflicts.length === 0 ? (
            <div className="p-8 text-center bg-brand-50 rounded-3xl">
              <CheckCircle2 className="w-12 h-12 text-brand-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-brand-700">אין בעיות בשיבוץ!</h3>
              <p className="text-brand-600 text-sm">נראה שהכיתה מסודרת באופן מושלם.</p>
            </div>
          ) : (
            conflicts.map((c: any, index: number) => (
               <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/50 gap-4">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-white dark:bg-rose-800 rounded-xl shadow-sm shrink-0">
                     <AlertCircle className="w-6 h-6 text-rose-500 text-white" />
                   </div>
                   <div>
                     <p className="text-sm font-black text-rose-700 dark:text-rose-400">{c.message}</p>
                     <p className="text-xs font-bold text-rose-500/70 dark:text-rose-500 mt-1">
                       מערב את: {students.find((s:any)=>s.id === c.studentId1)?.name} {c.studentId2 ? `ו-${students.find((s:any)=>s.id === c.studentId2)?.name}` : ''}
                     </p>
                   </div>
                 </div>
                 <button 
                   onClick={() => {
                     updateCurrentConfig((prev: any) => {
                       const newGrid = [...prev.grid];
                       newGrid[c.deskIdx1] = null;
                       if (c.deskIdx2 !== undefined) {
                         newGrid[c.deskIdx2] = null;
                       }
                       return { ...prev, grid: newGrid };
                     });
                   }}
                   className="px-5 py-2.5 bg-white text-rose-600 rounded-xl font-black text-xs hover:bg-rose-100 transition-colors shadow-sm whitespace-nowrap self-stretch sm:self-auto uppercase tracking-wider"
                 >
                   להחזיר למאגר התלמידים
                 </button>
               </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

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
          if (p.startsWith('חברים:') || p.toLowerCase().startsWith('friends:')) {
            const names = p.replace(/^(חברים:|friends:)/i, '').split(';').map(n => n.trim());
            updated.preferred = students.filter((s: any) => names.includes(s.name)).map((s: any) => s.id);
          } else if (p.startsWith('להרחיק:') || p.toLowerCase().startsWith('separate:')) {
            const names = p.replace(/^(להרחיק:|separate:)/i, '').split(';').map(n => n.trim());
            updated.forbidden = students.filter((s: any) => names.includes(s.name)).map((s: any) => s.id);
          } else if (p.startsWith('גובה:') || p.toLowerCase().startsWith('height:')) {
            const h = p.replace(/^(גובה:|height:)/i, '').trim().toLowerCase();
            if (h === 'נמוך' || h === 'קדמי' || h === 'short' || h === 'front') updated.height = 'short';
            else if (h === 'גבוה' || h === 'אחורי' || h === 'tall' || h === 'back') updated.height = 'tall';
            else updated.height = 'medium';
          } else if (p.startsWith('קבוצה:') || p.toLowerCase().startsWith('group:')) {
            const groupNames = p.replace(/^(קבוצה:|group:)/i, '').split(';').map(n => n.trim());
            const currentGroups = [...(updated.groups || [])];
            groupNames.forEach(gn => {
              const group = groups.find((g: any) => g.name === gn || g.id === gn);
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
                   <h3 className="text-2xl font-bold text-slate-800 dark:text-white">עדכון קבוצתי בטקסט חופשי</h3>
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

const BulkBehaviorModal = ({ students, selectedIds, categories, onAction, onClose }: any) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0].id);
  const [customReason, setCustomReason] = useState("");
  const selectedStudents = students.filter((s: any) => selectedIds.includes(s.id));

  const handleApply = () => {
    const category = categories.find((c: any) => c.id === selectedCategoryId);
    const reason = customReason || category.label;
    onAction(selectedIds, category.points, reason, category.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-8 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-auto"
      >
        <div className="p-8 space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl">
                   <ClipboardList className="w-7 h-7 text-brand-600" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-slate-800 dark:text-white">עדכון התנהגות מרובה</h3>
                   <p className="text-slate-500 font-bold">מעדכן {selectedStudents.length} תלמידים בבת אחת</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                 <X className="w-6 h-6 text-slate-400" />
              </button>
           </div>

           <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
             {selectedStudents.map((s: any) => (
               <div key={s.id} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300">
                 {s.name}
               </div>
             ))}
           </div>

           <div className="space-y-4 text-right" dir="rtl">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">בחר סוג דיווח</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                      selectedCategoryId === cat.id 
                        ? "bg-brand-50 border-brand-500 shadow-md" 
                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300"
                    )}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-[10px] font-black">{cat.label}</span>
                    <span className={cn("text-[10px] font-bold", cat.points > 0 ? "text-emerald-500" : "text-rose-500")}>
                      {cat.points > 0 ? `+${cat.points}` : cat.points}
                    </span>
                  </button>
                ))}
              </div>
           </div>

           <div className="space-y-4 text-right" dir="rtl">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">תיאור אירוע (אופציונלי)</h4>
              <input 
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="הוסף הערה נוספת..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 transition-all font-bold text-slate-800 dark:text-white"
              />
           </div>

           <div className="flex gap-4">
              <button 
                onClick={handleApply}
                className="flex-1 py-5 bg-brand-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-brand-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
              >
                בצע עדכון לכל התלמידים
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

const TeacherDesk = ({ index, width, height, colPos, rowPos, editMode, updateCurrentConfig, is3DView, totalCols, totalRows, isLocked = false }: any) => {
  return (
    <motion.div
      layoutId="teacher-desk"
      whileHover={is3DView ? { scale: 1.02, y: -12, rotateX: -50, rotateY: -1 } : { scale: 1.02 }}
      style={{
        gridColumn: `${colPos} / span ${width}`,
        gridRow: `${rowPos} / span ${height}`,
        ...(is3DView ? {
          transform: 'translateZ(60px) rotateX(-50deg)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.1)',
          transformStyle: 'preserve-3d',
        } : {})
      }}
      draggable={editMode === 'structure' && !isLocked}
      onDragStart={(e) => {
        if (editMode === 'structure' && !isLocked) {
          e.dataTransfer.setData('type', 'teacher-desk');
          e.dataTransfer.setData('index', index.toString());
        }
      }}
      className={cn(
        "bg-slate-700 text-white rounded-3xl border-b-[15px] border-slate-900 shadow-2xl flex flex-col items-center justify-center gap-3 z-40 transition-all relative group overflow-hidden",
        editMode === 'structure' ? (isLocked ? "ring-4 ring-slate-400/50 cursor-not-allowed" : "ring-4 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-move") : "cursor-default border-b-[10px]"
      )}
    >
      {/* Table Top Details */}
      <div className="absolute top-0 inset-x-0 h-1 bg-white/5" />
      
      {/* Decorative monitor/laptop representation */}
      <div className="absolute top-4 left-6 w-16 h-10 bg-slate-800 rounded border border-slate-600 flex flex-col items-center justify-center shadow-inner opacity-40 group-hover:opacity-80 transition-opacity">
        <div className="w-8 h-4 bg-slate-900 rounded-sm mb-1" />
        <div className="w-4 h-0.5 bg-slate-700 rounded-full" />
      </div>

      {/* Decorative papers */}
      <div className="absolute bottom-4 right-8 w-12 h-14 bg-white/10 rounded rotate-12 shadow-sm border border-white/5 opacity-50" />
      <div className="absolute bottom-6 right-10 w-12 h-14 bg-white/5 rounded -rotate-6 shadow-sm border border-white/5 opacity-40" />

      <div className="flex flex-col items-center gap-2 relative z-10">
        <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
          <Monitor className="w-8 h-8 text-slate-300" />
        </div>
        <span className="text-lg font-black uppercase tracking-widest leading-none drop-shadow-md">עמדת מורה</span>
      </div>
      
      {editMode === 'structure' && (
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <div className="flex gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl scale-95 hover:scale-100 transition-transform">
            <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 mr-1">
              <span className="text-[10px] font-black text-white/60 uppercase">רוחב</span>
              <button 
                onClick={(e) => { e.stopPropagation(); width > 1 && updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, width: width - 1 } })); }} 
                className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all text-xs font-black"
              >-</button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const col = index % totalCols;
                  if (col + width < totalCols) {
                    updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, width: width + 1 } })); 
                  }
                }} 
                className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all text-xs font-black"
              >+</button>
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-[10px] font-black text-white/60 uppercase">גובה</span>
              <button 
                onClick={(e) => { e.stopPropagation(); height > 1 && updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, height: height - 1 } })); }} 
                className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all text-xs font-black"
              >-</button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const row = Math.floor(index / totalCols);
                  if (row + height < totalRows) {
                    updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, height: height + 1 } })); 
                  }
                }} 
                className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all text-xs font-black"
              >+</button>
            </div>
          </div>
        </div>
      )}

      {editMode === 'structure' && (
        <>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, isLocked: !isLocked } }));
            }}
            className={cn(
              "absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 transition-all hover:scale-110 active:scale-95",
              isLocked ? "bg-amber-500 text-white border-amber-400 z-50" : "bg-white text-slate-400 border-slate-200 hover:bg-amber-50"
            )}
            title={isLocked ? "שחרר נעילה" : "נעל מיקום"}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (isLocked) return;
              if (confirm("האם להסיר את שולחן המורה מהמפה?")) {
                updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, index: -1 } }));
              }
            }}
            className={cn("absolute -top-3 -right-3 w-10 h-10 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-xl border-2 border-slate-100 transition-all active:scale-95", isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-rose-600 hover:text-white scale-90 hover:scale-100")}
            title="הסר שולחן"
          >
            <X className="w-6 h-6" />
          </button>
        </>
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
  setDraggedStudentId,
  onDrop,
  updateCurrentConfig,
  currentConfig,
  is3DView,
  activeDeskIdx,
  onShowHistory,
  onShowProfile,
  setSelectedStudentId,
  setNotifications,
  setNewStudent,
  setIsAddStudentOpen,
  setQuickPrefsStudentId,
  selectedStudentIds = [],
  setSelectedStudentIds,
  isMultiSelectMode = false,
  conflicts = [],
  isLocked = false
}: any) => {
  const [isOver, setIsOver] = useState(false);
  const isObstruction = currentConfig.obstructions?.includes(idx);
  const isPlacementLocked = currentConfig.lockedDesks?.includes(idx);
  const isPrinting = currentConfig.isPrinting;
  const draggingS = currentConfig.students.find((s: any) => s.id === draggedStudentId);
  const isCompatible = draggingS && draggingS.height === 'short' ? Math.floor(idx / currentConfig.cols) < 2 : true;
  
  const compatibilityClass = isOver 
    ? (isCompatible 
       ? "bg-emerald-100 border-emerald-400 ring-4 ring-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-600 dark:ring-emerald-800 shadow-xl scale-105 z-50" 
       : "bg-rose-100 border-rose-400 ring-4 ring-rose-200 dark:bg-rose-900/40 dark:border-rose-600 dark:ring-rose-800 shadow-xl scale-105 z-50") 
    : (draggedStudentId && editMode === 'placement' && !isHidden && !isObstruction && !isPrinting
       ? (isCompatible
          ? "border-brand-400 border-dashed bg-brand-50/50 dark:bg-brand-900/20 ring-2 ring-brand-200 dark:ring-brand-800 shadow-sm"
          : "border-rose-200 border-dashed bg-rose-50/30 dark:bg-rose-900/10 opacity-50")
       : "");

  const isSelected = studentId && selectedStudentId === studentId;
  const isBulkSelected = studentId && selectedStudentIds.includes(studentId);
  
  const selectedStudentObj = selectedStudentId ? currentConfig.students.find((s: any) => s.id === selectedStudentId) : null;
  const isFriendOfSelected = studentId && selectedStudentObj?.preferred?.includes(studentId);
  const isAvoidedBySelected = studentId && selectedStudentObj?.forbidden?.includes(studentId);
  const hasCommonGroup = studentId && selectedStudentObj?.groups && student?.groups && selectedStudentObj.groups.some((g: string) => student.groups.includes(g));

  const isFiltered = currentConfig.selectedGroups && currentConfig.selectedGroups.length > 0;
  const isInFilteredGroup = studentId && student?.groups?.some((gId: string) => currentConfig.selectedGroups.includes(gId));
  const isDimmed = isFiltered && !isInFilteredGroup;

  const relationalClass = !isSelected && selectedStudentId && studentId ? (
    isFriendOfSelected ? "ring-4 ring-emerald-300 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg z-40" :
    isAvoidedBySelected ? "ring-4 ring-rose-300 border-rose-400 bg-rose-50 dark:bg-rose-900/20 shadow-lg z-40" :
    hasCommonGroup ? "ring-4 ring-indigo-300 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg z-30" : ""
  ) : "";

  // Find conflicts for this specific desk
  const deskConflicts = conflicts.filter((c: any) => c.deskIdx1 === idx || c.deskIdx2 === idx);
  const hasConflict = deskConflicts.length > 0;

  if (((isHidden || isObstruction) && !isPrinting) && editMode === 'placement') return (
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
      draggable={(editMode === 'structure' && !isHidden) || (editMode === 'placement' && !!studentId)}
      onDragStart={(e) => {
        if (editMode === 'structure') handleDeskDragStart(e);
        else if (editMode === 'placement' && studentId) {
          setDraggedStudentId(studentId);
        }
      }}
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
              lockedDesks: prev.lockedDesks?.filter((i: number) => i !== idx),
              grid: prev.grid.map((val: any, i: number) => i === idx ? null : val)
            }));
          }
        }
      }}
      whileHover={is3DView ? { scale: (currentConfig.deskScales?.[idx] || 1) * 1.05, y: -15, rotateX: 5, rotateY: -2 } : { scale: (currentConfig.deskScales?.[idx] || 1) * 1.05, y: -4 }}
      whileTap={{ scale: (currentConfig.deskScales?.[idx] || 1) * 0.98 }}
      animate={isSelected ? { scale: (currentConfig.deskScales?.[idx] || 1) * 1.1, y: -15, z: 60, shadow: "0 30px 60px rgba(0,0,0,0.3)" } : { scale: currentConfig.deskScales?.[idx] || 1, y: 0, z: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      style={{ 
        gridColumn: colPos, 
        gridRow: rowPos,
        ...(is3DView && !isHidden ? {
          transform: `translateZ(${idx === activeDeskIdx || isSelected ? '40px' : '0px'}) rotateX(-50deg) scale(${currentConfig.deskScales?.[idx] || 1})`,
          boxShadow: idx === activeDeskIdx || isSelected
            ? '0 40px 70px -10px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.2)' 
            : '0 15px 25px -5px rgba(0,0,0,0.15)',
          transformStyle: 'preserve-3d',
        } : {
          transform: `scale(${currentConfig.deskScales?.[idx] || 1})`
        })
      }}
      onClick={() => {
        if (isMultiSelectMode && studentId) {
          setSelectedStudentIds((prev: string[]) => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
          );
          return;
        }
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
          if (is3DView && student) {
             setSelectedStudentId(student.id);
          } else if (student && editMode === 'placement') {
             if (setQuickPrefsStudentId) setQuickPrefsStudentId(student.id);
          } else {
             onShowHistory(idx);
          }
        }
      }}
      className={cn(
        "aspect-square rounded-[1.5rem] transition-all flex flex-col items-center justify-center cursor-pointer relative group",
        is3DView && !isHidden && "border-b-[12px] border-slate-200 dark:border-slate-800",
        isPrinting ? "bg-white border-slate-100" : (
          isObstruction ? "bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 opacity-80" :
          isHidden ? "border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 opacity-60 hover:opacity-100 hover:border-brand-400 hover:bg-brand-50" :
          !student ? "bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm" : "bg-white dark:bg-slate-900 border border-brand-100 dark:border-brand-900 shadow-sm ring-2 ring-brand-50 dark:ring-brand-950 hover:ring-brand-200 hover:shadow-lg dark:hover:ring-brand-800 transition-all z-10"
        ),
        isPlacementLocked && "ring-4 ring-amber-500/30",
        ( (student?.height === 'short' || (student as any)?.rowPreference === 'front') && !isPrinting ) && "shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/20 bg-amber-50/10",
        compatibilityClass,
        relationalClass,
        isDimmed && "opacity-20 grayscale scale-[0.98] blur-[1px]",
        (isSelected && !isPrinting) && "ring-4 ring-brand-400 border-brand-500 shadow-2xl z-50",
        (isBulkSelected && !isPrinting) && "ring-4 ring-brand-500 border-brand-600 shadow-2xl z-50 bg-brand-50/50 dark:bg-brand-900/30",
        (hasConflict && !isPrinting) && "ring-4 ring-rose-400/30 border-rose-200 dark:border-rose-900",
        (editMode === 'structure' && !isHidden && !isObstruction && !isPrinting) && "cursor-move hover:ring-2 hover:ring-amber-300"
      )}
    >
      {/* Selection Checkbox for Multi-Select */}
      {isMultiSelectMode && studentId && (
        <div className="absolute top-2 right-2 z-50">
          <div className={cn(
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
            isBulkSelected 
              ? "bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/30" 
              : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          )}>
            {isBulkSelected && <Check className="w-4 h-4 stroke-[4]" />}
          </div>
        </div>
      )}
      {/* Compatibility / Swap Overlay */}
      {isOver && draggedStudentId && !isHidden && !isObstruction && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center rounded-[2rem] backdrop-blur-[2px]",
            isCompatible ? "bg-emerald-500/20 border-4 border-emerald-400" : "bg-rose-500/20 border-4 border-rose-400"
          )}
        >
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-2xl flex flex-col items-center gap-1">
             {student ? (
               <>
                 <ArrowRightLeft className={cn("w-6 h-6", isCompatible ? "text-emerald-500" : "text-rose-500")} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">החלף מקומות</span>
               </>
             ) : (
               <>
                 <Check className={cn("w-6 h-6", isCompatible ? "text-emerald-500" : "text-rose-500")} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">שבץ כאן</span>
               </>
             )}
          </div>
        </motion.div>
      )}

      {/* Spotlight for 3D View */}
      {is3DView && (isSelected || isOver) && !isPrinting && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[240px] h-[240px] pointer-events-none z-0"
        >
          <div 
            className="w-full h-full animate-pulse"
            style={{
              background: isSelected 
                ? 'radial-gradient(circle at center, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)'
                : 'radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              filter: 'blur(15px)',
              transform: 'perspective(400px) rotateX(15deg)',
            }}
          />
          {/* Ground Glow */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[20%] bg-white/20 blur-xl rounded-[100%]"
          />
        </motion.div>
      )}

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
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  updateCurrentConfig((prev: any) => ({
                    ...prev,
                    obstructions: prev.obstructions.filter((i: number) => i !== idx)
                  }));
                }}
                className="text-[8px] font-black text-rose-500 uppercase tracking-tighter bg-white px-2 py-0.5 rounded-full hover:bg-rose-50 transition-colors"
              >
                הפוך לשולחן
              </button>
            </>
          ) : isHidden ? (
            <>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:scale-110 transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[8px] font-black text-slate-400 group-hover:text-brand-600 uppercase tracking-tighter">הוסף שולחן</span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
               <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCurrentConfig((prev: any) => ({
                        ...prev,
                        deskScales: {
                          ...(prev.deskScales || {}),
                          [idx]: Math.max(0.5, (prev.deskScales?.[idx] || 1) - 0.1)
                        }
                      }));
                    }}
                    className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600"
                    title="הקטן"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCurrentConfig((prev: any) => ({
                        ...prev,
                        deskScales: {
                          ...(prev.deskScales || {}),
                          [idx]: Math.min(2.0, (prev.deskScales?.[idx] || 1) + 0.1)
                        }
                      }));
                    }}
                    className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600"
                    title="הגדל"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
               </div>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   updateCurrentConfig((prev: any) => ({
                     ...prev,
                     lockedDesks: prev.lockedDesks?.includes(idx) 
                       ? prev.lockedDesks.filter((i: number) => i !== idx) 
                       : [...(prev.lockedDesks || []), idx]
                   }));
                 }}
                 className={cn(
                   "w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all",
                   isPlacementLocked ? "bg-amber-500 text-white" : "bg-white text-slate-400 hover:text-amber-500"
                 )}
                 title={isPlacementLocked ? "שחרר שיבוץ" : "נעל שיבוץ"}
               >
                 {isPlacementLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
               </button>
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  updateCurrentConfig((prev: any) => ({
                    ...prev,
                    hiddenDesks: [...prev.hiddenDesks, idx],
                    lockedDesks: prev.lockedDesks?.filter((i: number) => i !== idx),
                    grid: prev.grid.map((val: any, i: number) => i === idx ? null : val)
                  }));
                }}
                className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 shadow-sm flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all border border-rose-100 dark:border-rose-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Desk Surface Visualization */}
      {!isHidden && !isObstruction && (
        <div className="absolute inset-x-2 top-2 h-0.5 bg-white/20 rounded-full z-10" />
      )}

      {/* 3D Chair representation */}
      {is3DView && !isHidden && !isObstruction && (
        <div 
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-300 dark:bg-slate-800 rounded-lg shadow-lg border-b-8 border-slate-400 dark:border-black flex flex-col items-center"
          style={{ transform: 'translateZ(-20px) rotateX(10deg)' }}
        >
          <div className="w-10 h-8 bg-slate-400/50 dark:bg-slate-700/50 rounded-sm mt-1" />
        </div>
      )}
      
      {showDeskNumbers && !isPrinting && <span className={cn("absolute left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400", is3DView ? "-top-10" : "-top-7")}>#{idx + 1}</span>}
      
      {student ? (
        <motion.div 
          className={cn("flex flex-col items-center gap-1 w-full z-10 transition-all", editMode === 'placement' && "cursor-grab active:cursor-grabbing rounded-2xl")}
          animate={draggedStudentId === student.id ? { scale: 0.95, opacity: 0.4 } : { scale: 1, opacity: 1 }}
          whileHover={editMode === 'placement' ? { scale: 1.03, y: -4 } : {}}
          whileTap={editMode === 'placement' ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          draggable={editMode === 'placement'}
          onDragStart={(e: any) => {
            if (editMode === 'placement') {
              e.dataTransfer.setData('type', 'student');
              if (setDraggedStudentId) setDraggedStudentId(student.id);
            }
          }}
          onDragEnd={() => {
            if (setDraggedStudentId) setDraggedStudentId(null);
          }}
        >
           {/* Relational Highlight Badges */}
           {(relationalClass && !isPrinting) && (
              <div className="absolute top-1 right-1 flex gap-1 z-50">
                {isFriendOfSelected && <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-600 shadow-md"><Heart className="w-3 h-3 fill-emerald-600" /></div>}
                {isAvoidedBySelected && <div className="p-1.5 bg-rose-100 rounded-full text-rose-600 shadow-md"><X className="w-3 h-3" /></div>}
                {(!isFriendOfSelected && !isAvoidedBySelected && hasCommonGroup) && <div className="p-1.5 bg-indigo-100 rounded-full text-indigo-600 shadow-md"><Users className="w-3 h-3" /></div>}
              </div>
           )}

           {/* Chair Backrest Icon */}
           <div className="w-10 h-7 bg-slate-200 dark:bg-slate-700 rounded-t-lg -mb-2 z-0 border border-slate-300 dark:border-slate-600 shadow-inner flex items-center justify-center">
             <div className="w-5 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
           </div>
           
           <div className={cn(
             "z-10 flex flex-col items-center bg-white dark:bg-slate-800 px-5 py-2.5 rounded-2xl border-2 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] relative w-[90%]",
             (hasConflict && !isPrinting) ? "border-rose-400 dark:border-rose-900" : "border-slate-400 dark:border-slate-600",
              isPrinting && "shadow-none border-slate-200"
           )}>
             <div className="flex items-center gap-1 mb-0.5">
               <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
               <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{student.name}</span>
             </div>
             
             {/* Hover Tooltip - Hidden when printing or in structure mode */}
             {!isPrinting && editMode !== 'structure' && (
               <div className="absolute -top-32 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] w-56 hidden group-hover:block">
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    whileHover={{ opacity: 1, y: 0, scale: 1 }}
                    className="bg-slate-900/95 dark:bg-black/95 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/50 text-right backdrop-blur-md"
                  >
                    <p className="text-sm font-black border-b border-white/10 pb-2 mb-2 flex items-center justify-between gap-4">
                      <span>{student.name}</span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">#{idx + 1}</span>
                    </p>
                    <div className="space-y-1.5 text-[11px] font-medium text-slate-300">
                      <p className="flex justify-between">
                        <span className="text-slate-500">שורה:</span>
                        <span>{Math.floor(idx / currentConfig.cols) + 1}</span>
                      </p>
                      {student.groups && student.groups.length > 0 && (
                        <p className="flex justify-between">
                          <span className="text-slate-500">קבוצות:</span>
                          <span className="truncate max-w-[120px]">{student.groups?.map((gId: string) => currentConfig.groups?.find((g: any) => g.id === gId)?.name).filter(Boolean).join(', ')}</span>
                        </p>
                      )}
                      
                      <div className="flex gap-2.5 mt-3 pt-3 border-t border-white/10">
                         {student.preferred?.length > 0 && (
                           <div className="flex items-center gap-1 group/tooltip">
                             <Heart className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                             <span className="text-[9px]">{student.preferred.length}</span>
                           </div>
                         )}
                         {student.forbidden?.length > 0 && (
                           <div className="flex items-center gap-1">
                             <Ban className="w-3 h-3 text-rose-400" />
                             <span className="text-[9px]">{student.forbidden.length}</span>
                           </div>
                         )}
                         {student.separateFrom?.length > 0 && (
                           <div className="flex items-center gap-1">
                             <ShieldAlert className="w-3 h-3 text-amber-400" />
                             <span className="text-[9px]">{student.separateFrom.length}</span>
                           </div>
                         )}
                         {student.height === 'short' && <Eye className="w-3 h-3 text-sky-400" />}
                      </div>
                    </div>
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 rotate-45 w-3 h-3 bg-slate-900 dark:bg-black border-r border-b border-slate-700/50" />
                  </motion.div>
               </div>
             )}
             
             {/* Indicators for constraints */}
             <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide pb-0.5">
               {(student.height === 'short' || (student as any).rowPreference === 'front') && (
                 <div title="מעדיף שורות ראשונות / גובה נמוך" className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800 shadow-sm shrink-0">
                   <Eye className="w-3.5 h-3.5 text-amber-600" />
                 </div>
               )}
               {( (student as any).cornerPreference ) && (
                 <div title="מעדיף מושב בפינה" className="p-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800 shadow-sm shrink-0">
                   <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                 </div>
               )}
               {(student.preferred && student.preferred.length > 0) && (
                 <div title={`מעדיף לשבת ליד: ${student.preferred.length} חברים`} className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800 shadow-sm shrink-0">
                   <Heart className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/10" />
                 </div>
               )}
               {( (student.forbidden && student.forbidden.length > 0) || (student.separateFrom && student.separateFrom.length > 0) ) && (
                 <div title="יש תלמידים שצריך להתרחק מהם" className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800 shadow-sm shrink-0">
                   <Ban className="w-3.5 h-3.5 text-rose-600" />
                 </div>
               )}
               {((student as any).rowPreference === 'back') && (
                 <div title="מעדיף שורות אחרונות" className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
                   <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                 </div>
               )}
               {(student.groups && student.groups.length > 0) && (
                 <div title="שייך לקבוצה" className="p-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-800 shadow-sm shrink-0">
                   <Layers className="w-3.5 h-3.5 text-brand-600" />
                 </div>
               )}
               {student.notes && student.notes.length > 0 && (
                 <div title="קיימות הערות מורה" className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 shadow-sm shrink-0">
                   <FileText className="w-3.5 h-3.5 text-indigo-600" />
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
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`האם למחוק את התלמיד ${student.name} מהמערכת לחלוטין?`)) {
                       updateCurrentConfig((prev: any) => {
                          const newGrid = [...prev.grid];
                          newGrid[idx] = null;
                          return { 
                            ...prev, 
                            grid: newGrid,
                            students: prev.students.filter((s:any) => s.id !== student.id)
                          };
                       });
                       setNotifications((prev: any) => [{ id: Date.now(), text: `התלמיד ${student.name} נמחק לחלוטין`, type: 'error' }, ...prev]);
                    }
                  }}
                  className="w-10 h-10 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white hover:border-rose-700 shadow-xl transition-all"
                  title="מחיקת תלמיד מהמערכת"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
           </div>
        </motion.div>
      ) : !isHidden && !isObstruction && (
        <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity w-full h-full relative">
           <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
             <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-400 dark:border-slate-500 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 mb-1 transition-all group-hover:scale-110">
               <Plus className="w-4 h-4 text-slate-500" />
             </div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center leading-tight">שולחן<br/>פנוי</span>
           </div>
           
          {editMode === 'placement' && (
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-slate-900/80 rounded-[2rem] transition-all backdrop-blur-sm z-20">
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   setNewStudent({ name: '', height: 'average' });
                   setIsAddStudentOpen(true);
                   // In a real app we would want to inject the clicked desk idx to the new student on creation. 
                   // To keep it simple globally, the modal adds the student to the pool, and then they can drag it to this seat.
                   // As placing it immediately in the grid requires saving the grid idx, let's keep the global "Add Student" modal behavior and show a notification.
                 }}
                 className="flex flex-col items-center gap-1 px-4 py-3 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all shadow-xl border border-brand-500"
               >
                 <Plus className="w-5 h-5 mx-auto" />
                 <span className="text-[10px] font-black uppercase text-center w-full leading-none whitespace-nowrap">הוסף תלמיד</span>
               </button>
             </div>
           )}
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
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
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

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 max-w-md w-full flex flex-col gap-6 text-center border border-slate-100 dark:border-slate-800"
          dir="rtl"
        >
          <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-2">
            <HelpCircle className="w-10 h-10 text-brand-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {message}
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={onCancel}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95"
            >
              ביטול
            </button>
            <button 
              onClick={() => { onConfirm(); onCancel(); }}
              className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-xl shadow-brand-100 dark:shadow-none hover:bg-brand-700 transition-all active:scale-95"
            >
              אישור
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const StudentPickerGrid = ({ 
  students, 
  currentConfig, 
  searchQuery, 
  setSearchQuery, 
  onAddStudent, 
  onQuickPrefs, 
  onSort, 
  isPracticeMode 
}: any) => {
  const studentsInPool = students.filter((s: any) => !currentConfig.grid.includes(s.id));
  const filteredStudents = studentsInPool.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש תלמיד..."
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ממתינים לשיבוץ ({filteredStudents.length})</h3>
          <button 
            onClick={onAddStudent}
            className="p-1.5 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredStudents.length === 0 ? (
          <div className="py-10 text-center opacity-50 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-400">אין תלמידים להצגה</p>
          </div>
        ) : (
          filteredStudents.map((s: any) => (
            <div 
              key={s.id}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-brand-500 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('type', 'student');
                e.dataTransfer.setData('studentId', s.id);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600">
                  {s.name[0]}
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
              </div>
              <button 
                onClick={() => onQuickPrefs(s.id)}
                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ResponsiveGridContainer = ({ children, is3DView, targetWidth = 1200, targetHeight = 700 }: { children: React.ReactNode, is3DView: boolean, targetWidth?: number, targetHeight?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const padding = window.innerWidth < 768 ? 40 : 120;
        const containerWidth = containerRef.current.clientWidth - padding;
        const containerHeight = containerRef.current.clientHeight - padding;
        
        setIsMobile(window.innerWidth < 768);

        const scaleW = containerWidth / targetWidth;
        const scaleH = containerHeight / targetHeight;
        
        // On mobile, we allow smaller scaling but ensure it's usable
        const minScale = window.innerWidth < 768 ? 0.2 : 0.4;
        const maxScale = window.innerWidth < 768 ? 2.0 : 1.2;
        
        setScale(Math.max(minScale, Math.min(scaleW, scaleH, maxScale)));
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [targetWidth, targetHeight]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden p-4 md:p-8 relative min-h-[400px]">
       <motion.div 
         initial={false}
         animate={{ 
           scale: scale,
           x: 0,
           y: 0
         }}
         transition={{ 
           type: 'spring',
           damping: 30,
           stiffness: 200,
           mass: 0.8
         }}
         style={{ 
           transformOrigin: 'center center',
           width: `${targetWidth}px`,
           height: `${targetHeight}px`,
           flexShrink: 0
         }}
         className={cn(
           "flex flex-col items-center justify-center",
           is3DView && "overflow-visible"
         )}
       >
         {children}
       </motion.div>
       
       {/* Zoom indicator for mobile */}
       {isMobile && scale < 0.6 && (
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-800 pointer-events-none fade-in">
           <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">מפת הכיתה הוקטנה להתאמה למסך</span>
         </div>
       )}
    </div>
  );
};

const AttendanceView = ({ students, onBack, updateCurrentConfig }: { students: any[], onBack: () => void, updateCurrentConfig: any }) => {
  const toggleStatus = (id: string, status: 'present' | 'absent' | 'late' | 'none') => {
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => s.id === id ? { ...s, status } : s)
    }));
  };

  const markAllPresent = () => {
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => ({ ...s, status: 'present' }))
    }));
  };

  const presentCount = students.filter(s => s.status === 'present').length;
  const lateCount = students.filter(s => s.status === 'late').length;
  const absentCount = students.filter(s => s.status === 'absent').length;

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
          <div className="flex items-center gap-4">
            <button 
              onClick={markAllPresent}
              className="flex items-center gap-2 px-6 py-2 border-2 border-brand-500 bg-brand-50 text-brand-600 rounded-xl text-sm font-black hover:bg-brand-500 hover:text-white transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              סמן הכל כנוכח
            </button>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {students.map((s, idx) => {
          const status = s.status || 'none';
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

const GradesView = ({ students, onBack, updateCurrentConfig }: { students: any[], onBack: () => void, updateCurrentConfig: (update: any) => void }) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'quiz' | 'midterm' | 'final' | 'homework'>('all');
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [newGrade, setNewGrade] = useState({ studentId: '', subject: 'מתמטיקה', grade: 90, testName: '', date: new Date().toISOString().split('T')[0], category: 'quiz' as any });

  const categories = [
    { id: 'quiz', label: 'בוחן', color: 'bg-indigo-500' },
    { id: 'midterm', label: 'מבחן מחצית', color: 'bg-amber-500' },
    { id: 'final', label: 'מבחן סוף שנה', color: 'bg-emerald-500' },
    { id: 'homework', label: 'שיעורי בית', color: 'bg-brand-500' },
    { id: 'other', label: 'אחר', color: 'bg-slate-500' },
  ];

  const allGrades = students.flatMap(s => (s.grades || []).map((g: any) => ({ ...g, studentName: s.name, studentId: s.id })));
  const filteredGrades = filterCategory === 'all' ? allGrades : allGrades.filter(g => g.category === filterCategory);

  // Subject Statistics
  const subjectStats = useMemo(() => {
    const stats: Record<string, { total: number, count: number, name: string }> = {};
    allGrades.forEach(g => {
      const subject = g.subject || 'כללי';
      if (!stats[subject]) stats[subject] = { total: 0, count: 0, name: subject };
      stats[subject].total += g.grade;
      stats[subject].count += 1;
    });
    return Object.values(stats).map(s => ({
      ...s,
      average: Math.round(s.total / s.count)
    })).sort((a, b) => b.average - a.average);
  }, [allGrades]);

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">ניהול הישגים וציונים</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest">סקירה פדגוגית לפי קטגוריות</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddingGrade(!isAddingGrade)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            הוסף ציון
          </button>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">פילוח הישגים לפי מקצוע</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-brand-500 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 capitalize">ממוצע</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {subjectStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <BarChart data={subjectStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSze: '12px', fontWeight: 'bold' }}
                    />
                    <Bar 
                      dataKey="average" 
                      fill="url(#colorAvg)" 
                      radius={[8, 8, 8, 8]}
                      barSize={40}
                    >
                      <defs>
                        <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-black italic">
                   לא הוזנו ציונים עדיין
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {subjectStats.slice(0, 2).map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity",
                  stat.average >= 90 ? "bg-emerald-500" : stat.average >= 80 ? "bg-brand-500" : "bg-amber-500"
                )} />
                <div className="relative flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.name}</span>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black",
                      stat.average >= 85 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                    )}>
                      {stat.average >= 85 ? 'מצטיין' : 'תקין'}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-auto">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">{stat.average}</span>
                    <span className="text-sm font-bold text-slate-400">ממוצע כיתתי</span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-2">מבוסס על {stat.count} ציונים שהוזנו</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setFilterCategory('all')}
          className={cn(
            "px-6 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap",
            filterCategory === 'all' ? "bg-slate-900 text-white shadow-xl" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800"
          )}
        >
          הכל
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setFilterCategory(cat.id as any)}
            className={cn(
              "px-6 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap flex items-center gap-2",
              filterCategory === cat.id ? "bg-brand-600 text-white shadow-xl" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", cat.color)} />
            {cat.label}
          </button>
        ))}
      </div>

      {isAddingGrade && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-brand-100 dark:border-brand-900 shadow-xl space-y-6">
           <h3 className="text-xl font-bold text-slate-800 dark:text-white">הוספת ציון חדש</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">תלמיד</label>
                <select 
                  value={newGrade.studentId}
                  onChange={(e) => setNewGrade(prev => ({...prev, studentId: e.target.value}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                >
                  <option value="">בחר תלמיד...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">מקצוע</label>
                <input 
                  value={newGrade.subject}
                  onChange={(e) => setNewGrade(prev => ({...prev, subject: e.target.value}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                  placeholder="לדוגמה: מתמטיקה"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">קטגוריה</label>
                <select 
                  value={newGrade.category}
                  onChange={(e) => setNewGrade(prev => ({...prev, category: e.target.value as any}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">שם המבחן/משימה</label>
                <input 
                  value={newGrade.testName}
                  onChange={(e) => setNewGrade(prev => ({...prev, testName: e.target.value}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                  placeholder="לדוגמה: בוחן שברים"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">ציון (0-100)</label>
                <input 
                  type="number"
                  value={newGrade.grade}
                  onChange={(e) => setNewGrade(prev => ({...prev, grade: parseInt(e.target.value)}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">תאריך</label>
                <input 
                  type="date"
                  value={newGrade.date}
                  onChange={(e) => setNewGrade(prev => ({...prev, date: e.target.value}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                />
              </div>
           </div>
           <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setIsAddingGrade(false)}
                className="px-8 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm"
              >
                ביטול
              </button>
              <button 
                disabled={!newGrade.studentId || !newGrade.testName}
                onClick={() => {
                  updateCurrentConfig((prev: any) => ({
                    ...prev,
                    students: prev.students.map((s: any) => 
                      s.id === newGrade.studentId 
                        ? { ...s, grades: [...(s.grades || []), { ...newGrade, id: Date.now() }] } 
                        : s
                    )
                  }));
                  setIsAddingGrade(false);
                }}
                className="px-8 py-3 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-brand-700 disabled:opacity-50"
              >
                שמירת ציון
              </button>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">תאריך</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">תלמיד</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">מקצוע</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">קטגוריה</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">שם המשימה</th>
                <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">ציון</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((g: any) => (
                <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6 text-sm font-bold text-slate-500 whitespace-nowrap">
                    {new Date(g.date).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 dark:text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        {g.studentName[0]}
                      </div>
                      <span className="text-xl font-black text-slate-800 dark:text-white leading-tight whitespace-nowrap">{g.studentName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-black">{g.subject}</span>
                  </td>
                  <td className="px-8 py-6">
                    <Badge className={cn("text-[10px] border-none uppercase", categories.find(c => c.id === g.category)?.color, "text-white")}>
                      {categories.find(c => c.id === g.category)?.label || 'אחר'}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-700 dark:text-slate-300">
                    {g.testName}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black",
                        g.grade >= 90 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : 
                        g.grade >= 80 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                        "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                      )}>
                        {g.grade}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredGrades.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic">
                    אין ציונים להצגה בסינון הנוכחי.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EventsView = ({ currentConfig, updateCurrentConfig, onBack }: { currentConfig: any, updateCurrentConfig: (update: any) => void, onBack: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', date: new Date().toISOString().split('T')[0], description: '', type: 'activity', location: '' });
  const events = currentConfig.events || [];

  const handleSaveEvent = () => {
    if (!newEvent.title) return;
    updateCurrentConfig((prev: any) => {
      let updatedEvents;
      if (editingEventId) {
        updatedEvents = (prev.events || []).map((e: any) => e.id === editingEventId ? { ...newEvent, id: editingEventId } : e);
      } else {
        updatedEvents = [{ ...newEvent, id: Date.now().toString() }, ...(prev.events || [])];
      }
      return { ...prev, events: updatedEvents };
    });
    setIsAdding(false);
    setEditingEventId(null);
    setNewEvent({ title: '', date: new Date().toISOString().split('T')[0], description: '', type: 'activity', location: '' });
  };

  const handleEdit = (event: any) => {
    setNewEvent({ title: event.title, date: event.date, description: event.description || '', type: event.type, location: event.location || '' });
    setEditingEventId(event.id);
    setIsAdding(true);
  };

  const eventTypes: any = {
    activity: { label: 'פעילות מיוחדת', color: 'from-indigo-500 to-blue-600', textColor: 'text-indigo-600', borderColor: 'border-indigo-100', icon: <Sparkles className="w-4 h-4" /> },
    field_trip: { label: 'טיול/סיור', color: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-600', borderColor: 'border-emerald-100', icon: <Map className="w-4 h-4" /> },
    meeting: { label: 'אסיפת הורים/פגישה', color: 'from-amber-500 to-orange-600', textColor: 'text-amber-600', borderColor: 'border-amber-100', icon: <Users className="w-4 h-4" /> },
    important_date: { label: 'תאריך חשוב', color: 'from-rose-500 to-pink-600', textColor: 'text-rose-600', borderColor: 'border-rose-100', icon: <CalendarDays className="w-4 h-4" /> },
    other: { label: 'אחר', color: 'from-slate-500 to-slate-600', textColor: 'text-slate-600', borderColor: 'border-slate-100', icon: <Info className="w-4 h-4" /> }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      calendarDays.push({ day: prevMonthLastDay - i, current: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({ day: i, current: true, date: new Date(year, month, i) });
    }
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }

    const dayNames = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-bento overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
              className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-brand-600"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white min-w-[150px] text-center">
              {monthNames[month]} {year}
            </h3>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
              className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-brand-600"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-500 hover:text-brand-600 shadow-sm transition-all"
          >
            חזור להיום
          </button>
        </div>
        
        <div className="grid grid-cols-7 border-collapse">
          {dayNames.map(d => (
            <div key={d} className="p-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
              {d}
            </div>
          ))}
          {calendarDays.map((d, i) => {
            const dateStr = d.date.toISOString().split('T')[0];
            const dayEvents = events.filter((e: any) => e.date === dateStr);
            const isToday = d.date.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={i} 
                className={cn(
                  "min-h-[140px] p-3 border-r border-b border-slate-50 dark:border-slate-800/50 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
                  !d.current && "bg-slate-50/30 opacity-40",
                  isToday && "bg-brand-50/30 dark:bg-brand-900/10"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black",
                    isToday ? "bg-brand-600 text-white shadow-lg shadow-brand-200 dark:shadow-none" : "text-slate-500"
                  )}>
                    {d.day}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayEvents.map((e: any) => (
                    <button
                      key={e.id}
                      onClick={() => handleEdit(e)}
                      className={cn(
                        "w-full text-right px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white truncate shadow-sm hover:scale-[1.02] transition-transform",
                        `bg-gradient-to-r ${eventTypes[e.type]?.color}`
                      )}
                      title={e.title}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm">
              <ChevronLeft className="w-7 h-7 text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">יומן אירועים כיתתי</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">ניהול אירועים, טיולים ופגישות</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center">
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                    viewMode === 'list' ? "bg-slate-100 dark:bg-slate-800 text-brand-600 shadow-inner" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <ListIcon className="w-4 h-4" />
                  רשימה
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                    viewMode === 'calendar' ? "bg-slate-100 dark:bg-slate-800 text-brand-600 shadow-inner" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  לוח שנה
                </button>
             </div>
             
             <button 
              onClick={() => {
                setIsAdding(true);
                setEditingEventId(null);
                setNewEvent({ title: '', date: new Date().toISOString().split('T')[0], description: '', type: 'activity', location: '' });
              }} 
              className="px-6 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              אירוע חדש
            </button>
          </div>
       </div>

       {isAdding && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 border-brand-100 dark:border-brand-900 shadow-bento space-y-8"
         >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                {editingEventId ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="space-y-3">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">כותרת האירוע</label>
                 <input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" placeholder="מה קורה היום?" />
               </div>
               <div className="space-y-3">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">תאריך</label>
                 <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" />
               </div>
               <div className="space-y-3">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">סוג האירוע</label>
                 <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})} className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all appearance-none cursor-pointer">
                    {Object.entries(eventTypes).map(([k, v]: [string, any]) => <option key={k} value={k}>{v.label}</option>)}
                 </select>
               </div>
               <div className="space-y-3">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">מיקום (אופציונלי)</label>
                 <div className="relative">
                   <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                   <input value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full p-5 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all" placeholder="ביה''ס / כיתה / מוזיאון..." />
                 </div>
               </div>
               <div className="space-y-3 lg:col-span-2">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">תיאור</label>
                 <textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-medium text-slate-700 dark:text-slate-200 outline-none h-32 resize-none transition-all" placeholder="פרטים נוספים ליומן..." />
               </div>
            </div>
            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
               <button onClick={() => setIsAdding(false)} className="px-10 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 transition-all">ביטול</button>
               <button onClick={handleSaveEvent} className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-[0_15px_30px_rgba(79,70,229,0.3)] hover:bg-brand-700 hover:scale-105 transition-all">
                 {editingEventId ? 'עדכן אירוע' : 'שמור אירוע'}
               </button>
            </div>
         </motion.div>
       )}

       {viewMode === 'calendar' ? renderCalendar() : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {events.length === 0 ? (
               <div className="col-span-full py-40 text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                    <CalendarDays className="w-12 h-12 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">טרם תועדו אירועים ביומן</p>
                    <p className="text-slate-400 font-bold mt-2">התחילו בהוספת טיול או פגישה ראשונה</p>
                  </div>
               </div>
            ) : (
              events.map((e: any) => {
                const type = eventTypes[e.type] || eventTypes.other;
                return (
                  <motion.div 
                    layout
                    key={e.id} 
                    className={cn(
                      "group relative bg-white dark:bg-slate-900 border-2 rounded-[2.5rem] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-500 overflow-hidden",
                      type.borderColor
                    )}
                  >
                     <div className={cn("h-3 bg-gradient-to-r", type.color)} />
                     <div className="p-8">
                       <div className="flex items-center justify-between mb-6">
                          <div className={cn("px-4 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-black text-white uppercase shadow-sm bg-gradient-to-r", type.color)}>
                             {type.icon}
                             {type.label}
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px] font-black text-slate-600 dark:text-slate-400">{new Date(e.date).toLocaleDateString('he-IL')}</span>
                          </div>
                       </div>
                       <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-brand-600 transition-colors">{e.title}</h3>
                       {e.location && (
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 mb-4 border border-slate-100 dark:border-slate-800">
                           <MapPin className="w-3 h-3 text-brand-500" />
                           {e.location}
                         </div>
                       )}
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-8">{e.description}</p>
                       <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                         <div className="flex items-center gap-4">
                           <button onClick={() => handleEdit(e)} className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-400 hover:text-brand-600 rounded-2xl transition-all" title="ערוך"><Edit3 className="w-4 h-4" /></button>
                           <button onClick={() => confirm('האם אתה בטוח שברצונך למחוק אירוע זה?') && updateCurrentConfig((prev: any) => ({ ...prev, events: prev.events.filter((ev: any) => ev.id !== e.id) }))} className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 rounded-2xl transition-all" title="מחק"><Trash2 className="w-4 h-4" /></button>
                         </div>
                         <button className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-brand-600 transition-colors">פרטים מלאים</button>
                       </div>
                     </div>
                     <div className="absolute -bottom-10 -right-10 opacity-[0.04] dark:opacity-[0.08] pointer-events-none group-hover:scale-125 transition-transform duration-1000 rotate-12">
                        {React.cloneElement(type.icon || <Sparkles />, { className: "w-48 h-48" })}
                     </div>
                  </motion.div>
                );
              })
            )}
         </div>
       )}
    </div>
  );
};

const BEHAVIOR_CATEGORIES = [
  { id: 'excellence', label: 'הצטיינות', icon: '🌟', color: 'text-amber-500', points: 20 },
  { id: 'good_learning', label: 'למידה טובה', icon: '📚', color: 'text-emerald-500', points: 10 },
  { id: 'correct_seating', label: 'ישיבה נכונה', icon: '🪑', color: 'text-blue-500', points: 5 },
  { id: 'success_campaign', label: 'הצלחה במבצע', icon: '🎯', color: 'text-indigo-500', points: 30 },
  { id: 'disruption', label: 'הפרעה', icon: '📢', color: 'text-orange-500', points: -10 },
  { id: 'bad_learning', label: 'חוסר למידה', icon: '📝', color: 'text-rose-500', points: -15 },
  { id: 'violence', label: 'אלימות', icon: '🚫', color: 'text-red-600', points: -50 },
  { id: 'missing_task', label: 'אי ביצוע משימה', icon: '❌', color: 'text-slate-500', points: -10 },
];

const RemindersView = ({ currentConfig, updateCurrentConfig, onBack, setNotifications }: { currentConfig: any, updateCurrentConfig: (update: any) => void, onBack: () => void, setNotifications: any }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', time: '', date: new Date().toISOString().split('T')[0], notify: true });
  const reminders = currentConfig.reminders || [];

  const addReminder = () => {
    if (!newReminder.title || !newReminder.time) return;
    const item = { ...newReminder, id: Date.now().toString() };
    updateCurrentConfig((prev: any) => ({
      ...prev,
      reminders: [...(prev.reminders || []), item]
    }));
    
    if (newReminder.notify) {
      setNotifications((prev: any) => [{ id: Date.now(), text: `תזכורת הוגדרה: ${newReminder.title} ל-${newReminder.time}`, type: 'success' }, ...prev]);
    }

    setIsAdding(false);
    setNewReminder({ title: '', time: '', date: new Date().toISOString().split('T')[0], notify: true });
  };

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm">
              <ChevronLeft className="w-7 h-7" />
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">תזכורות ופעולות קרובות</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">ניהול לו"ז כיתתי ותזכורות פדגוגיות</p>
            </div>
          </div>
          <button onClick={() => setIsAdding(!isAdding)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2">
            <Bell className="w-5 h-5" />
            תזכורת חדשה
          </button>
       </div>

       {isAdding && (
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-indigo-100 dark:border-indigo-900 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="space-y-2 lg:col-span-2">
                 <label className="text-xs font-black text-slate-500 uppercase">מה להזכיר?</label>
                 <input value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 outline-none" placeholder="למשל: ישיבת צוות שכבתית, הכנת חומרים לשיעור חשבון..." />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 uppercase">תאריך</label>
                 <input type="date" value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 outline-none" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 uppercase">שעה</label>
                 <input type="time" value={newReminder.time} onChange={e => setNewReminder({...newReminder, time: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 outline-none" />
               </div>
               <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" checked={newReminder.notify} onChange={e => setNewReminder({...newReminder, notify: e.target.checked})} className="w-5 h-5 rounded-lg text-brand-600 focus:ring-brand-500 border-slate-300" id="notify-check" />
                  <label htmlFor="notify-check" className="text-sm font-bold text-slate-600 cursor-pointer">שלח התראה בזמן המתאים</label>
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
               <button onClick={() => setIsAdding(false)} className="px-8 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black">ביטול</button>
               <button onClick={addReminder} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">קבע תזכורת</button>
            </div>
         </div>
       )}

       <div className="max-w-4xl space-y-4">
          {reminders.length === 0 ? (
             <div className="py-20 text-center opacity-50 space-y-4">
                <Calendar className="w-16 h-16 mx-auto" />
                <p className="text-xl font-black text-slate-500">יומן התזכורות ריק</p>
             </div>
          ) : (
            reminders.sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time)).map((r: any) => (
              <div key={r.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-6 group hover:translate-x-2 transition-transform">
                 <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-20 shadow-sm">
                       <span className="text-[10px] font-black text-brand-600 uppercase tracking-tighter">{new Date(r.date).toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                       <span className="text-lg font-black text-slate-800 dark:text-white leading-none mt-1">{new Date(r.date).getDate()}</span>
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{r.title}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-slate-500">{r.time}</span>
                          {r.notify && <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full ml-2">התראה פעילה</span>}
                       </div>
                    </div>
                 </div>
                 <button 
                  onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, reminders: prev.reminders.filter((rem: any) => rem.id !== r.id) }))}
                  className="p-3 text-rose-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                 >
                    <Trash2 className="w-5 h-5" />
                 </button>
              </div>
            ))
          )}
       </div>
    </div>
  );
};

const CampaignsView = ({ currentConfig, updateCurrentConfig, onBack, setNotifications, students }: { currentConfig: any, updateCurrentConfig: (update: any) => void, onBack: () => void, setNotifications: any, students: any[] }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ 
    title: '', 
    description: '', 
    targetPoints: 1000, 
    type: 'class-wide', // or 'individual'
    category: 'academic', 
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reward: '',
    status: 'active'
  });

  const campaigns = currentConfig.campaigns || [];

  const addCampaign = () => {
    if (!newCampaign.title || !newCampaign.targetPoints) return;
    const item = { ...newCampaign, id: `camp-${Date.now()}`, currentPoints: 0, participants: [] };
    updateCurrentConfig((prev: any) => ({
      ...prev,
      campaigns: [...campaigns, item]
    }));
    
    setNotifications((prev: any) => [{ id: Date.now(), text: `מבצע חדש הושק: ${newCampaign.title}`, type: 'success' }, ...prev]);
    setIsAdding(false);
    setNewCampaign({ 
      title: '', 
      description: '', 
      targetPoints: 1000, 
      type: 'class-wide', 
      category: 'academic', 
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      reward: '',
      status: 'active'
    });
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'academic': return <GraduationCap className="w-5 h-5" />;
      case 'behavior': return <Heart className="w-5 h-5" />;
      case 'participation': return <Users className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm">
              <ChevronLeft className="w-7 h-7" />
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">מבצעים ויעדי כיתה</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">ניהול אתגרים, צבירת נקודות ותגמולים קבוצתיים</p>
            </div>
          </div>
          <button onClick={() => setIsAdding(!isAdding)} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" />
            מבצע חדש
          </button>
       </div>

       {isAdding && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-emerald-100 dark:border-emerald-900 shadow-xl space-y-8"
         >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="space-y-2 lg:col-span-2 text-right">
                 <label className="text-xs font-black text-slate-500 uppercase">שם המבצע</label>
                 <input value={newCampaign.title} onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-white outline-none" placeholder="למשל: אלופי הקריאה, מבצע כיתה נקייה, מצטייני השבוע בחשבון..." />
               </div>
               <div className="space-y-2 text-right">
                 <label className="text-xs font-black text-slate-500 uppercase">סוג מבצע</label>
                 <select value={newCampaign.type} onChange={e => setNewCampaign({...newCampaign, type: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-white outline-none appearance-none">
                    <option value="class-wide">כיתתי (יעד משותף)</option>
                    <option value="individual">אישי (תחרות בין תלמידים)</option>
                 </select>
               </div>
               <div className="space-y-2 lg:col-span-3 text-right">
                 <label className="text-xs font-black text-slate-500 uppercase">תיאור היעד והמשימה</label>
                 <textarea value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-white outline-none h-24 resize-none" placeholder="תארו מה התלמידים צריכים לעשות כדי להצליח במבצע..." />
               </div>
               <div className="space-y-2 text-right">
                 <label className="text-xs font-black text-slate-500 uppercase">יעד נקודות</label>
                 <input type="number" value={newCampaign.targetPoints} onChange={e => setNewCampaign({...newCampaign, targetPoints: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-white outline-none" />
               </div>
               <div className="space-y-2 text-right">
                 <label className="text-xs font-black text-slate-500 uppercase">קטגוריה</label>
                 <select value={newCampaign.category} onChange={e => setNewCampaign({...newCampaign, category: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-white outline-none appearance-none">
                    <option value="academic">לימודי</option>
                    <option value="behavior">התנהגותי</option>
                    <option value="participation">השתתפות ומעורבות</option>
                    <option value="other">אחר</option>
                 </select>
               </div>
               <div className="space-y-2 text-right">
                 <label className="text-xs font-black text-slate-500 uppercase">פרס למנצחים/לכיתה</label>
                 <input value={newCampaign.reward} onChange={e => setNewCampaign({...newCampaign, reward: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-white outline-none" placeholder="למשל: מסיבת פיצה, 15 דק' הפסקה נוספת..." />
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
               <button onClick={() => setIsAdding(false)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black">ביטול</button>
               <button onClick={addCampaign} className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg">השק מבצע!</button>
            </div>
         </motion.div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {campaigns.length === 0 ? (
             <div className="md:col-span-2 py-20 text-center opacity-50 space-y-4">
                <Target className="w-16 h-16 mx-auto text-slate-300" />
                <p className="text-xl font-black text-slate-500">אין מבצעים פעילים כרגע</p>
                <button onClick={() => setIsAdding(true)} className="text-brand-600 font-bold hover:underline">לחצו כאן כדי להתחיל את המבצע הראשון שלכם</button>
             </div>
          ) : (
            campaigns.map((c: any) => {
              const progress = Math.min(100, Math.round((c.currentPoints / c.targetPoints) * 100));
              return (
                <motion.div 
                  key={c.id} 
                  layout
                  className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group"
                >
                   <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                           {getCategoryIcon(c.category)}
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 dark:text-white">{c.title}</h3>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.type === 'class-wide' ? 'מבצע כיתתי' : 'מבצע אישי'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const pts = prompt("הזן נקודות להוספה (ניתן להזין מינוס להפחתה):", "10");
                            if (pts && !isNaN(parseInt(pts))) {
                              updateCurrentConfig((prev: any) => ({
                                ...prev,
                                campaigns: prev.campaigns.map((camp: any) => 
                                  camp.id === c.id ? { ...camp, currentPoints: Math.max(0, camp.currentPoints + parseInt(pts)) } : camp
                                )
                              }));
                            }
                          }}
                          className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-600 rounded-xl transition-all" 
                          title="הוסף נקודות"
                        >
                          <PlusCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, campaigns: prev.campaigns.filter((camp: any) => camp.id !== c.id) }))}
                          className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all" 
                          title="מחק מבצע"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                   </div>

                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed line-clamp-2">{c.description}</p>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm font-black">
                         <span className="text-slate-400 uppercase tracking-tight">התקדמות המבצע</span>
                         <span className={cn("px-3 py-1 rounded-full text-[10px]", progress >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                            {c.currentPoints} / {c.targetPoints} נק' ({progress}%)
                         </span>
                      </div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${progress}%` }}
                           className={cn(
                             "h-full rounded-full transition-all duration-1000",
                             progress >= 100 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-brand-500"
                           )} 
                         />
                      </div>
                   </div>

                   {c.reward && (
                     <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Zap className="w-4 h-4 text-amber-500" />
                           <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">הפרס:</span>
                           <span className="text-sm font-bold text-slate-900 dark:text-white">{c.reward}</span>
                        </div>
                        {progress >= 100 && (
                          <div className="flex items-center gap-1 text-emerald-600 animate-pulse font-black text-[10px] uppercase">
                             <CheckCircle2 className="w-3 h-3" /> היעד הושג!
                          </div>
                        )}
                     </div>
                   )}

                   {/* Decorative icon */}
                    <div className="absolute -bottom-8 -right-8 opacity-5 group-hover:scale-125 transition-transform duration-1000 rotate-12">
                       {getCategoryIcon(c.category)}
                    </div>
                </motion.div>
              );
            })
          )}
       </div>
    </div>
  );
};

const CampaignDisplay = ({ currentConfig }: { currentConfig: any }) => {
  const activeCampaigns = (currentConfig.campaigns || []).filter((c: any) => c.status === 'active').slice(0, 2);
  
  if (activeCampaigns.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {activeCampaigns.map((c: any) => {
        const progress = Math.min(100, Math.round((c.currentPoints / c.targetPoints) * 100));
        return (
          <div key={c.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
             <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-50 dark:bg-emerald-900 text-emerald-600 rounded-xl">
                      <Target className="w-4 h-4" />
                   </div>
                   <h4 className="text-sm font-black text-slate-800 dark:text-white truncate max-w-[150px]">{c.title}</h4>
                </div>
                <span className="text-[10px] font-black text-emerald-500">{progress}%</span>
             </div>
             <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative z-10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500 rounded-full" 
                />
             </div>
             <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
          </div>
        );
      })}
    </div>
  );
};

const TasksView = ({ students, onBack, updateCurrentConfig }: { students: any[], onBack: () => void, updateCurrentConfig: any }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ studentId: 'all', title: '', description: '', dueDate: new Date().toISOString().split('T')[0], priority: 'medium' as any, category: 'homework' as any });

  const allTasks = students.flatMap(s => (s.tasks || []).map((t: any) => ({ ...t, studentName: s.name, studentId: s.id })));
  const filteredTasks = filter === 'all' ? allTasks : allTasks.filter(t => t.status === filter);

  const priorities = [
    { id: 'low', label: 'נמוכה', color: 'bg-emerald-500' },
    { id: 'medium', label: 'בינונית', color: 'bg-amber-500' },
    { id: 'high', label: 'גבוהה', color: 'bg-rose-500' },
  ];

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">תזכורות ומטלות</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest">ניהול משימות אישיות וקבוצתיות לתלמידים</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddingTask(!isAddingTask)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
        >
          <Bell className="w-5 h-5" />
          משימה חדשה
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-1">
        {(['pending', 'completed', 'all'] as const).map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-6 py-3 font-black text-sm relative transition-all",
              filter === f ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {f === 'pending' ? 'בביצוע' : f === 'completed' ? 'הושלמו' : 'הכל'}
            {filter === f && <motion.div layoutId="task-filter" className="absolute bottom-0 inset-x-0 h-1 bg-indigo-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      {isAddingTask && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-indigo-100 dark:border-indigo-900 shadow-xl space-y-6">
           <h3 className="text-xl font-bold text-slate-800 dark:text-white">יצירת משימה חדשה</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">ליעד (תלמיד)</label>
                <select 
                  value={newTask.studentId}
                  onChange={(e) => setNewTask(prev => ({...prev, studentId: e.target.value}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                >
                  <option value="all">כל הכיתה</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-black text-slate-500 uppercase">כותרת המשימה</label>
                <input 
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({...prev, title: e.target.value}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                  placeholder="מה צריך לבצע?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">תאריך יעד</label>
                <input 
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask(prev => ({...prev, dueDate: e.target.value}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">עדיפות</label>
                <select 
                  value={newTask.priority}
                  onChange={(e) => setNewTask(prev => ({...prev, priority: e.target.value as any}))}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-slate-700 outline-none"
                >
                  {priorities.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
           </div>
           <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setIsAddingTask(false)}
                className="px-8 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm"
              >
                ביטול
              </button>
              <button 
                disabled={!newTask.title}
                onClick={() => {
                  const taskToSave = { ...newTask, id: Date.now().toString(), status: 'pending' as const };
                  updateCurrentConfig((prev: any) => ({
                    ...prev,
                    students: prev.students.map((s: any) => 
                      newTask.studentId === 'all' || s.id === newTask.studentId 
                        ? { ...s, tasks: [...(s.tasks || []), taskToSave] } 
                        : s
                    )
                  }));
                  setIsAddingTask(false);
                }}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                שריון משימה
              </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task: any) => (
          <div key={task.id} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group">
             <div className="flex items-start justify-between mb-4">
                <div className={cn("px-3 py-1 rounded-full text-[10px] font-black text-white uppercase", priorities.find(p => p.id === task.priority)?.color)}>
                  {priorities.find(p => p.id === task.priority)?.label}
                </div>
                <button 
                  onClick={() => {
                    updateCurrentConfig((prev: any) => ({
                      ...prev,
                      students: prev.students.map((s: any) => 
                        s.id === task.studentId 
                          ? { ...s, tasks: s.tasks.map((t: any) => t.id === task.id ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t) } 
                          : s
                      )
                    }));
                  }}
                  className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                    task.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 hover:border-emerald-500"
                  )}
                >
                  {task.status === 'completed' && <Check className="w-4 h-4" />}
                </button>
             </div>
             <h4 className={cn("text-lg font-black text-slate-800 dark:text-white leading-tight", task.status === 'completed' && "line-through opacity-50")}>
               {task.title}
             </h4>
             <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-50 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                    {task.studentName[0]}
                  </div>
                  <span className="text-xs font-black text-slate-500">{task.studentName}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto text-slate-400">
                  <CalendarDays className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{new Date(task.dueDate).toLocaleDateString('he-IL')}</span>
                </div>
             </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold italic bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            אין משימות להצגה.
          </div>
        )}
      </div>
    </div>
  );
};


const ProgressView = ({ onBack }: { onBack: () => void }) => {
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
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
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
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <RechartsPieChart>
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
              </RechartsPieChart>
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


const FloatingTimer = ({ 
  seconds, 
  isRunning, 
  onToggle, 
  onReset, 
  onClose,
  onAdjust,
  duration,
  isFinished
}: any) => {
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = (seconds / duration) * 100;

  return (
    <motion.div 
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 100 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "fixed bottom-24 right-8 z-[100] w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border-2 p-6 flex flex-col gap-4 cursor-move",
        isFinished ? "border-rose-500 animate-pulse bg-rose-50 dark:bg-rose-900/20 shadow-rose-200" : "border-brand-100 dark:border-slate-800"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            isFinished ? "bg-rose-100 text-rose-600" : "bg-brand-50 text-brand-600"
          )}>
            <Timer className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">טיימר משימה</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className={cn(
        "text-5xl font-black text-center font-mono tabular-nums tracking-tighter transition-colors",
        isFinished ? "text-rose-600" : "text-slate-800 dark:text-white"
      )}>
        {formatTime(seconds)}
      </div>

      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={false}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full", isFinished ? "bg-rose-500" : "bg-brand-500")}
        />
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <button 
          onClick={onAdjust}
          className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-bold text-[10px] uppercase tracking-wider"
        >
          כוון זמן
        </button>
        <button 
          onClick={onToggle}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all active:scale-90",
            isRunning ? "bg-amber-500 shadow-amber-200" : "bg-brand-600 shadow-brand-200"
          )}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        <button 
          onClick={onReset}
          className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:rotate-180 duration-500"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

const StudentQuickPrefsModal = ({ 
  studentId, 
  currentConfig, 
  updateCurrentConfig, 
  onClose,
  isDarkMode,
  conflicts = []
}: { 
  studentId: string, 
  currentConfig: any, 
  updateCurrentConfig: any, 
  onClose: () => void,
  isDarkMode?: boolean,
  conflicts?: any[]
}) => {
  const student = currentConfig.students.find((s: any) => s.id === studentId);
  const [localStudent, setLocalStudent] = useState<any>(student ? { ...student } : null);
  const studentIdx = currentConfig.grid.indexOf(studentId);
  const isPlaced = studentIdx !== -1;

  if (!student) return null;

  const getNeighbors = () => {
    if (studentIdx === -1) return [];
    const neighbors: any[] = [];
    const rows = currentConfig.rows;
    const cols = currentConfig.cols;
    const r = Math.floor(studentIdx / cols);
    const c = studentIdx % cols;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const nIdx = nr * cols + nc;
          const nStudentId = currentConfig.grid[nIdx];
          if (nStudentId) {
            const nStudent = currentConfig.students.find((s: any) => s.id === nStudentId);
            if (nStudent) neighbors.push({ ...nStudent, index: nIdx });
          }
        }
      }
    }
    return neighbors;
  };

  const neighbors = getNeighbors();
  const studentConflicts = conflicts.filter((c: any) => c.studentId1 === studentId || c.studentId2 === studentId);

  const swapWithNeighbor = (neighborIdx: number) => {
    updateCurrentConfig((prev: any) => {
      const newGrid = [...prev.grid];
      const targetStudentId = newGrid[neighborIdx];
      newGrid[neighborIdx] = studentId;
      newGrid[studentIdx] = targetStudentId;
      return { ...prev, grid: newGrid };
    });
    onClose();
  };

  const toggleArrayItem = (field: string, val: string) => {
    setLocalStudent((prev: any) => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(val) ? arr.filter((x: string) => x !== val) : [...arr, val]
      };
    });
  };

  const handleSave = () => {
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => s.id === studentId ? localStudent : s)
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border-2 border-slate-100 dark:border-slate-800"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center font-black text-xl">
               {student.name[0]}
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight">העדפות מהירות</h2>
                <p className="text-slate-500 font-medium text-sm">{student.name} • התאמת רקע פיזי וחברתי</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mb-6">
           {isPlaced && (
             <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Zap className="w-3 h-3 text-amber-500" />
                 תובנות מיקום ותלמידים סמוכים
               </h3>
               
               <div className="space-y-3">
                 <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-500 uppercase">שכנים קרובים ({neighbors.length})</p>
                   <div className="grid grid-cols-2 gap-2">
                     {neighbors.map((n: any) => {
                       const isPreferred = localStudent.preferred?.includes(n.id);
                       const isForbidden = localStudent.forbidden?.includes(n.id);
                       const hasConflict = studentConflicts.some(c => c.studentId1 === n.id || c.studentId2 === n.id);
                       
                       return (
                         <div key={n.id} className={cn(
                           "p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all",
                           isPreferred ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10" : 
                           isForbidden ? "bg-rose-50/50 border-rose-100 dark:bg-rose-900/10" :
                           "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 shadow-sm"
                         )}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{n.name}</span>
                              {hasConflict && <AlertCircle className="w-3 h-3 text-rose-500" />}
                            </div>
                            <div className="flex gap-1">
                               <button 
                                 onClick={() => toggleArrayItem('preferred', n.id)}
                                 className={cn(
                                   "flex-1 py-1 rounded-lg text-[8px] font-black transition-all",
                                   isPreferred ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600"
                                 )}
                               >
                                 חבר
                               </button>
                               <button 
                                 onClick={() => toggleArrayItem('forbidden', n.id)}
                                 className={cn(
                                   "flex-1 py-1 rounded-lg text-[8px] font-black transition-all",
                                   isForbidden ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600"
                                 )}
                               >
                                 להפריד
                               </button>
                               <button 
                                 onClick={() => swapWithNeighbor(n.index)}
                                 title="החלף מקומות"
                                 className="px-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-brand-600 hover:text-white rounded-lg transition-all"
                               >
                                 <Repeat className="w-3 h-3" />
                               </button>
                            </div>
                         </div>
                       );
                     })}
                     {neighbors.length === 0 && <p className="text-[10px] text-slate-400 col-span-2 text-center py-2 italic font-medium">אין תלמידים בקרבת מקום</p>}
                   </div>
                 </div>

                 {studentConflicts.length > 0 && (
                   <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800">
                     <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase flex items-center gap-2 mb-1">
                       <AlertCircle className="w-3 h-3" />
                       זוהו {studentConflicts.length} קונפליקטים במיקום זה
                     </p>
                     <div className="space-y-1">
                        {studentConflicts.map((c, i) => (
                          <p key={i} className="text-[9px] font-medium text-rose-500 leading-tight">
                            • {c.type === 'forbidden' ? 'יושב ליד תלמיד שאמור להתרחק ממנו' : 
                               c.type === 'height' ? 'תלמיד נמוך בשורה אחורית' : 
                               c.type === 'corner' ? 'מעדיף פינה אך לא משובץ באחת' : c.reason}
                          </p>
                        ))}
                     </div>
                   </div>
                 )}
               </div>
             </div>
           )}

           <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><Heart className="w-4 h-4 text-emerald-500"/> תלמידים מועדפים (לשבת ליד)</label>
              <div className="flex flex-wrap gap-2">
                {currentConfig.students.filter((s:any) => s.id !== student.id).map((s:any) => {
                  const isSelected = localStudent.preferred?.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleArrayItem('preferred', s.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-sm font-bold transition-all border",
                        isSelected 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400" 
                          : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 dark:bg-slate-900 dark:border-slate-700"
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><X className="w-4 h-4 text-rose-500"/> תלמידים להרחקה (לא קרוב)</label>
              <div className="flex flex-wrap gap-2">
                {currentConfig.students.filter((s:any) => s.id !== student.id).map((s:any) => {
                  const isSelected = localStudent.forbidden?.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleArrayItem('forbidden', s.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-sm font-bold transition-all border",
                        isSelected 
                          ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400" 
                          : "bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 dark:bg-slate-900 dark:border-slate-700"
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
           </div>
           
           <div className="space-y-2">
             <label className="text-sm font-black text-slate-700 dark:text-slate-300">מיקום מועדף בכתה</label>
             <select 
               value={localStudent.height || 'medium'} 
               onChange={(e) => setLocalStudent((prev: any) => ({ ...prev, height: e.target.value }))}
               className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-brand-500 text-slate-800 dark:text-white font-medium"
             >
               <option value="short">קרוב ללוח / שורה ראשונה (פיזי/קשבי)</option>
               <option value="medium">אמצע הכיתה (סטנדרטי)</option>
               <option value="tall">מאחור (גבוה)</option>
             </select>
           </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
           <button onClick={onClose} className="px-6 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors">
             ביטול
           </button>
           <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-lg font-black transition-all">
             שמור שינויים
           </button>
        </div>
      </motion.div>
    </div>
  );
};

const StudentDetailView = ({ student, currentConfig, onBack, updateCurrentConfig, students, onSelectStudent, aiWeights, setQuickPrefsStudentId }: { student: any, currentConfig: any, onBack: () => void, updateCurrentConfig: (update: any) => void, students: any[], onSelectStudent: (id: string) => void, aiWeights: any, setQuickPrefsStudentId?: (id: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'ai' | 'lessons' | 'tasks' | 'pedagogy' | 'academic' | 'attendance' | 'diagnostics' | 'communications' | 'documents' | 'history'>('info');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(student.name);
  
  useEffect(() => {
    setTempName(student.name);
  }, [student.id]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isAddingDiag, setIsAddingDiag] = useState(false);
  const [newDiag, setNewDiag] = useState({ type: '', date: '', description: '', accommodations: '' });

  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({ name: '', day: 'א', time: '08:00', room: '', category: 'regular' as any });

  const availableLessons = currentConfig.availableLessons || [];

  const lessonCategories = [
    { id: 'regular', label: 'רגיל', color: 'bg-indigo-500', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600' },
    { id: 'elective', label: 'בחירה', color: 'bg-emerald-500', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
    { id: 'remedial', label: 'תגבור', color: 'bg-rose-500', bgColor: 'bg-rose-100', textColor: 'text-rose-600' },
    { id: 'enrichment', label: 'העשרה', color: 'bg-amber-500', bgColor: 'bg-amber-100', textColor: 'text-amber-600' },
    { id: 'other', label: 'אחר', color: 'bg-slate-500', bgColor: 'bg-slate-100', textColor: 'text-slate-600' },
  ];

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    // Normalize today to start of day
    today.setHours(0, 0, 0, 0);

    return (students || [])
      .filter(s => s.birthday)
      .map(s => {
        const bday = new Date(s.birthday);
        // Create a date for this year's birthday
        const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        
        let targetBday = thisYearBday;
        // If birthday already passed this year, calculate for next year
        if (thisYearBday < today) {
           targetBday = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
        }

        const diffTime = targetBday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { ...s, daysUntil: diffDays, targetDate: targetBday };
      })
      .filter(s => s.daysUntil <= 60) // Show birthdays in next 60 days
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [students]);
  
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
    { id: 'lessons', label: 'שיעורים ומערכת', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'tasks', label: 'משימות ורשימות', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'pedagogy', label: 'פדגוגיה', icon: <FileText className="w-4 h-4" /> },
    { id: 'academic', label: 'הישגים', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'rewards', label: 'נקודות ופרסים', icon: <Trophy className="w-4 h-4" /> },
    { id: 'attendance', label: 'נוכחות', icon: <Calendar className="w-4 h-4" /> },
    { id: 'diagnostics', label: 'אבחונים והתאמות', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'communications', label: 'קשר הורים', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'history', label: 'יומן התנהגות', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Right Sidebar: All Students List */}
      <div className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
           <h3 className="font-bold text-slate-800 dark:text-white text-lg">כל התלמידים</h3>
           <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">{students.length} תלמידים רשומים</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
           {students.slice().sort((a: any, b: any)=>a.name.localeCompare(b.name,'he')).map(s => (
             <button
               key={s.id}
               onClick={() => onSelectStudent(s.id)}
               className={cn(
                 "w-full text-right p-3 rounded-2xl flex items-center gap-3 transition-colors group",
                 s.id === student.id ? "bg-brand-50 dark:bg-brand-900/20 shadow-sm border border-brand-100 dark:border-brand-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
               )}
             >
               <div className={cn(
                 "w-10 h-10 flex items-center justify-center rounded-xl font-black transition-colors shrink-0", 
                 s.id === student.id ? "bg-brand-600 text-white shadow-md shadow-brand-200 dark:shadow-none" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
               )}>
                 {s.name[0]}
               </div>
               <div className="flex flex-col">
                 <span className={cn("font-bold text-sm leading-tight", s.id === student.id ? "text-brand-800 dark:text-brand-300" : "text-slate-700 dark:text-slate-300")}>{s.name}</span>
                 {s.groups && s.groups.length > 0 && <span className="text-[10px] text-slate-400 font-bold mt-0.5">{currentConfig.groups?.find((g:any)=>g.id===s.groups[0])?.name || 'ללא קבוצה'}</span>}
               </div>
             </button>
           ))}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
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
             <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                   {isEditingName ? (
                      <input 
                        autoFocus
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        onBlur={() => { updateStudent('name', tempName); setIsEditingName(false); }}
                        onKeyDown={e => e.key === 'Enter' && (e.target as any).blur()}
                        className="text-xl font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 outline-none w-full"
                      />
                   ) : (
                      <>
                         <h2 className="text-xl font-black text-slate-800 dark:text-white leading-none truncate">{student.name}</h2>
                         <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                   )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">תלמיד #{student.id}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="flex items-center gap-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">כינוי:</span>
                     <EditableText 
                       value={student.nickname || ''} 
                       onSave={(val) => updateStudent('nickname', val)}
                       placeholder="הוסף כינוי..."
                       className="text-[10px] font-black text-brand-600 uppercase tracking-widest leading-none"
                     />
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[10px] font-black text-brand-600 leading-none">פעיל במערכת</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {setQuickPrefsStudentId && (
              <button 
                onClick={() => setQuickPrefsStudentId(student.id)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100 dark:border-indigo-800"
              >
                <Sliders className="w-5 h-5" />
                <span className="hidden sm:inline">העדפות זריזות</span>
              </button>
           )}
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
                      <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-3">
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
                      <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white">שיבוץ ישיבה</h3>
                      
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
                                 {h === 'short' ? 'קדמי (נמוך)' : h === 'medium' ? 'ממוצע' : 'אחורי (גבוה)'}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">העדפת שורה</label>
                          <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem]">
                             {(['front', 'middle', 'back', 'any'] as const).map(rp => (
                               <button
                                 key={rp}
                                 onClick={() => updateStudent('rowPreference', rp)}
                                 className={cn(
                                   "py-3 rounded-[1.2rem] text-[10px] font-black transition-all",
                                   (student.rowPreference || 'any') === rp 
                                     ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-lg ring-1 ring-slate-200 dark:ring-slate-600" 
                                     : "text-slate-400 hover:text-slate-600"
                                 )}
                               >
                                 {rp === 'front' ? 'קדמית' : rp === 'middle' ? 'אמצע' : rp === 'back' ? 'אחורית' : 'כלשהי'}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">העדפות מיוחדות</label>
                          <div className="flex gap-4">
                            <button
                              onClick={() => updateStudent('cornerPreference', !student.cornerPreference)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl text-xs font-black transition-all border-2",
                                student.cornerPreference
                                  ? "bg-amber-50 border-amber-200 text-amber-700"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                              )}
                            >
                              <Maximize2 className="w-4 h-4" />
                              פינה / קצה
                            </button>
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

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">תאריך לידה</label>
                          <input 
                            type="date"
                            value={student.birthday || ''}
                            onChange={(e) => updateStudent('birthday', e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-black text-slate-700 dark:text-slate-200 focus:border-brand-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-10 rounded-[3.5rem] space-y-8">
                       <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white flex items-center gap-3">
                          <Cake className="w-6 h-6 text-brand-600" />
                          ימי הולדת קרובים
                       </h3>

                       {upcomingBirthdays.length > 0 ? (
                         <div className="space-y-4">
                           {upcomingBirthdays.map(s => (
                             <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-brand-600 shadow-sm border border-slate-100 dark:border-slate-700">
                                   {s.name[0]}
                                 </div>
                                 <div>
                                   <div className="font-black text-slate-800 dark:text-white text-sm">{s.name}</div>
                                   <div className="text-[10px] font-bold text-slate-400 capitalize">
                                     {new Date(s.birthday!).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                                   </div>
                                 </div>
                               </div>
                               <div className={cn(
                                 "px-3 py-1 rounded-full text-[10px] font-black",
                                 s.daysUntil === 0 
                                   ? "bg-rose-500 text-white animate-pulse" 
                                   : s.daysUntil <= 7 
                                     ? "bg-brand-100 text-brand-700" 
                                     : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                               )}>
                                 {s.daysUntil === 0 ? 'היום!' : s.daysUntil === 1 ? 'מחר' : `בעוד ${s.daysUntil} ימים`}
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-10">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                               <Cake className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">אין ימי הולדת קרובים ב-60 הימים הקרובים</p>
                         </div>
                       )}
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
                           <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-white leading-tight">פרמטרים לאופטימיזציית AI</h3>
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
                            <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-white capitalize">הערות ותיעוד פדגוגי</h3>
                         </div>
                         <div className="text-sm font-black text-slate-400 tracking-widest uppercase">מעודכן לאחרונה: היום</div>
                      </div>

                      <div className="space-y-8 w-full mt-8">
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                          <label className="text-sm font-black text-slate-500 uppercase tracking-widest block mb-4">תגיות אפיון (לפי פסיק או Enter)</label>
                          <div className="flex items-center flex-wrap gap-2 mb-4">
                            {(student.tags || []).map((tag: string, index: number) => (
                              <div key={index} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300">
                                <span>{tag}</span>
                                <button
                                  onClick={() => {
                                    const newTags = student.tags.filter((_: any, i: number) => i !== index);
                                    updateStudent('tags', newTags);
                                  }}
                                  className="text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <input 
                            type="text" 
                            placeholder="הוסף תגית (לדוגמה: מתקשה למקד קשב, פוטנציאל גבוה...)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const newTag = e.currentTarget.value.trim();
                                if (newTag) {
                                  const currentTags = student.tags || [];
                                  if (!currentTags.includes(newTag)) {
                                    updateStudent('tags', [...currentTags, newTag]);
                                  }
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-medium text-slate-800 dark:text-slate-200 focus:border-emerald-300 outline-none transition-all shadow-sm"
                          />
                        </div>

                        {student.ai_pedagogy_recommendation && (
                          <div className="bg-brand-50 dark:bg-brand-900/10 p-8 rounded-[3rem] border border-brand-200 dark:border-brand-900/50 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                               <Sparkles className="w-8 h-8 text-brand-600" />
                               <h4 className="font-black text-brand-800 dark:text-brand-300 text-xl">תוכנית קידום והספקים מבוססת AI</h4>
                            </div>
                            <p className="text-brand-800 dark:text-brand-200 leading-relaxed font-medium whitespace-pre-line relative z-10 text-lg">{student.ai_pedagogy_recommendation}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div className="space-y-4 p-8 bg-sky-50 dark:bg-sky-900/10 rounded-[3rem] border border-sky-100 dark:border-sky-900/30">
                            <label className="text-sm font-black text-sky-700 dark:text-sky-300 uppercase tracking-widest block mb-4">רמת עניין ומעורבות</label>
                            <div className="flex bg-white dark:bg-slate-800 rounded-2xl border border-sky-200 dark:border-sky-800 p-1">
                               {['low', 'medium', 'high'].map(level => (
                                 <button 
                                   key={level}
                                   onClick={() => updateStudent('interestLevel', level)}
                                   className={cn(
                                     "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
                                     student.interestLevel === level ? "bg-sky-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                                   )}
                                 >
                                    {level === 'low' ? 'נמוכה' : level === 'medium' ? 'בינונית' : 'גבוהה'}
                                 </button>
                               ))}
                            </div>
                          </div>

                          <div className="space-y-4 p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] border border-indigo-100 dark:border-indigo-900/30">
                            <label className="text-sm font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest block mb-4">צורך בתמיכה לימודית</label>
                            <div className="flex bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-1">
                               {['none', 'low', 'medium', 'high'].map(level => (
                                 <button 
                                   key={level}
                                   onClick={() => updateStudent('supportNeeded', level)}
                                   className={cn(
                                     "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
                                     student.supportNeeded === level ? "bg-indigo-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                                   )}
                                 >
                                    {level === 'none' ? 'ללא' : level === 'low' ? 'מועטה' : level === 'medium' ? 'בינונית' : 'רבה'}
                                 </button>
                               ))}
                            </div>
                          </div>
                          
                          <div className="space-y-4 p-8 bg-rose-50 dark:bg-rose-900/10 rounded-[3rem] border border-rose-100 dark:border-rose-900/30 md:col-span-2">
                            <label className="text-sm font-black text-rose-700 dark:text-rose-300 uppercase tracking-widest block mb-4">העדפות סביבת לימוד (לפי פסיק או Enter)</label>
                            <div className="flex items-center flex-wrap gap-2 mb-4">
                              {(student.environmentPreferences || []).map((pref: string, index: number) => (
                                <div key={index} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300">
                                  <span>{pref}</span>
                                  <button
                                    onClick={() => {
                                      const newPrefs = student.environmentPreferences.filter((_: any, i: number) => i !== index);
                                      updateStudent('environmentPreferences', newPrefs);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <input 
                              type="text" 
                              placeholder="הוסף העדפה (לדוגמה: שקט, תאורה חזקה, קירבה ללוח...)"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault();
                                  const newPref = e.currentTarget.value.trim();
                                  if (newPref) {
                                    const currentPrefs = student.environmentPreferences || [];
                                    if (!currentPrefs.includes(newPref)) {
                                      updateStudent('environmentPreferences', [...currentPrefs, newPref]);
                                    }
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-medium text-slate-800 dark:text-slate-200 focus:border-rose-300 outline-none transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                              <Star className="w-4 h-4" /> הצלחות וחוזקות
                            </label>
                            <textarea
                              value={student.successes || ''}
                              onChange={(e) => updateStudent('successes', e.target.value)}
                              placeholder="נקודות חוזק, תחביבים..."
                              className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/50 rounded-3xl p-6 font-medium min-h-[150px] text-slate-800 dark:text-slate-200 focus:border-emerald-300 outline-none transition-all resize-none shadow-sm placeholder:text-emerald-600/40"
                            />
                          </div>

                          <div className="space-y-3 flex flex-col">
                            <label className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center justify-between">
                              <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> תיעוד חופשי / אתגרים</span>
                              <div className="flex items-center gap-3">
                                {student.notesLastUpdated && (
                                  <span className="text-xs font-medium text-amber-500/70 border-r border-amber-200 dark:border-amber-800/50 pr-3">
                                    עודכן: {new Date(student.notesLastUpdated).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                )}
                                <button
                                  disabled={isGeneratingAI}
                                  onClick={async () => {
                                    if (isGeneratingAI) return;
                                    setIsGeneratingAI(true);
                                    updateStudent('ai_pedagogy_recommendation', '🤖 ה-AI מנתח לעומק את נתוני התלמיד ומגבש תובנות פדגוגיות...');
                                    
                                    const avg = student.grades && student.grades.length > 0
                                      ? Math.round(student.grades.reduce((a:number, b:any)=>a+b.grade,0) / student.grades.length)
                                      : 'לא הוזנו ציונים';
                                    
                                    const tags = student.tags?.length > 0 ? student.tags.join(', ') : 'אין תגיות אפיון';
                                    const noteTags = student.noteTags?.length > 0 ? student.noteTags.join(', ') : 'אין תגיות הערות';
                                    const interest = student.interestLevel === 'low' ? 'נמוכה' : student.interestLevel === 'medium' ? 'בינונית' : student.interestLevel === 'high' ? 'גבוהה' : 'טרם הוגדרה';
                                    const support = student.supportNeeded === 'none' ? 'ללא' : student.supportNeeded === 'low' ? 'מועטה' : student.supportNeeded === 'medium' ? 'בינונית' : student.supportNeeded === 'high' ? 'רבה' : 'טרם הוגדר';
                                    const envPrefs = student.environmentPreferences?.length > 0 ? student.environmentPreferences.join(', ') : 'אין העדפות סביבתיות';
                                    const successes = student.successes || 'לא צוינו חוזקות';
                                    const notes = student.notes || 'אין הערות נוספות';
  
                                    try {
                                      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
                                      const prompt = `${aiWeights.customSystemPrompt || 'אתה יועץ פדגוגי מומחה ומלווה מקצועי של צוותי הוראה.'} 
משוב פדגוגי והמלצות לקידום אישי עבור התלמיד/ה: ${student.name}.

נתונים נוכחיים:
- ממוצע ציונים: ${avg}
- רמת עניין ומעורבות: ${interest}
- צורך בתמיכה לימודית: ${support}
- העדפות סביבת לימוד: ${envPrefs}
- תגיות אפיון: ${tags}
- תגיות הערות ואבחון: ${noteTags}
- חוזקות והצלחות: ${successes}
- אתגרים והערות: ${notes}

משימה:
כתוב המלצה פדגוגית ממוקדת, מעשית ומעודדת ב-4-6 משפטים.
התייחס ספציפית לשילוב בין רמת העניין, הצורך בתמיכה והעדפות הסביבה כדי לייצר אסטרטגיית למידה אופטימלית.
השב בעברית בלבד.`;
  
                                      const response = await ai.models.generateContent({
                                        model: "gemini-3-flash-preview",
                                        contents: [{ parts: [{ text: prompt }] }],
                                      });
  
                                      const rec = response.text || 'מצטערים, לא ניתן היה להפיק המלצה ברגע זה. נסה שנית.';
                                      updateStudent('ai_pedagogy_recommendation', rec);
                                    } catch (error) {
                                      console.error("AI Error:", error);
                                      updateStudent('ai_pedagogy_recommendation', '❌ חלה שגיאה בחיבור ל-AI. אנא ודא שהמערכת מחוברת לאינטרנט ונסה שוב.');
                                    } finally {
                                      setIsGeneratingAI(false);
                                    }
                                  }}
                                  className={cn(
                                    "px-4 py-2 text-white rounded-xl transition-all font-black text-[10px] flex items-center gap-2 shadow-sm",
                                    isGeneratingAI ? "bg-slate-400 cursor-not-allowed" : "bg-brand-600 hover:bg-brand-700"
                                  )}
                                >
                                  {isGeneratingAI ? (
                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <Brain className="w-3 h-3" />
                                  )}
                                  {isGeneratingAI ? 'מפיק המלצה...' : 'הפק המלצת AI'}
                                </button>
                              </div>
                            </label>
                            <label className="relative block flex-1">
                              <textarea 
                                 value={student.notes || ''}
                                 onChange={(e) => {
                                   updateStudent('notes', e.target.value);
                                   updateStudent('notesLastUpdated', new Date().toISOString());
                                 }}
                                 placeholder="רשמו תצפיות פדגוגיות, נקודות לשמירה, קשיי למידה או הערות התנהגותיות..."
                                 className="w-full h-full bg-amber-50/50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/50 rounded-3xl p-6 font-medium outline-none focus:border-amber-300 min-h-[150px] resize-y transition-all text-slate-800 dark:text-slate-200 shadow-sm placeholder:text-amber-600/40"
                              />
                            </label>
                            <div className="mt-2 p-4 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                              <label className="text-xs font-bold text-amber-600/80 dark:text-amber-400/80 block mb-3">תגיות להערות (הפרד בפסיק או שורה חדשה)</label>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {(student.noteTags || []).map((tag: string, idx: number) => (
                                  <span key={idx} className="bg-amber-200/50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-bold shadow-sm">
                                    {tag}
                                    <button onClick={() => updateStudent('noteTags', student.noteTags.filter((_:any, i:number) => i !== idx))} className="hover:text-rose-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                  </span>
                                ))}
                              </div>
                              <input 
                                  type="text"
                                  placeholder="הוסף תגית הערה ולחץ Enter..."
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        const newTags = e.currentTarget.value.split(/[,\n]/).map(t => t.trim()).filter(Boolean);
                                        if (newTags.length > 0) {
                                          const currentTags = student.noteTags || [];
                                          const uniqueNewTags = newTags.filter((t: string) => !currentTags.includes(t));
                                          if (uniqueNewTags.length > 0) {
                                             updateStudent('noteTags', [...currentTags, ...uniqueNewTags]);
                                          }
                                          e.currentTarget.value = '';
                                        }
                                      }
                                  }}
                                  className="w-full bg-white dark:bg-slate-800 border-2 border-amber-100 dark:border-amber-900/50 rounded-xl p-3 text-sm focus:border-amber-300 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="lg:col-span-3">
                  <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                           <div className="p-5 bg-sky-50 dark:bg-sky-900/20 rounded-[2.5rem]">
                              <GraduationCap className="w-10 h-10 text-sky-600" />
                           </div>
                           <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-white capitalize">ציונים והישגים</h3>
                        </div>
                        <div className="flex gap-2">
                           <button
                             onClick={() => {
                               const printContent = `
                                  <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
                                     <h2>גיליון ציונים - ${student.name}</h2>
                                     <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                        <thead>
                                           <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                              <th style="padding: 10px; text-align: right;">מקצוע</th>
                                              <th style="padding: 10px; text-align: right;">שם המבחן/מטלה</th>
                                              <th style="padding: 10px; text-align: right;">הציון</th>
                                              <th style="padding: 10px; text-align: right;">תאריך</th>
                                           </tr>
                                        </thead>
                                        <tbody>
                                           ${(student.grades || []).map((g: any) => `
                                              <tr style="border-bottom: 1px solid #e2e8f0;">
                                                 <td style="padding: 10px;">${g.subject}</td>
                                                 <td style="padding: 10px;">${g.testName || '-'}</td>
                                                 <td style="padding: 10px; font-weight: bold;">${g.grade}</td>
                                                 <td style="padding: 10px;">${new Date(g.date).toLocaleDateString('he-IL')}</td>
                                              </tr>
                                           `).join('')}
                                        </tbody>
                                     </table>
                                     <div style="margin-top: 20px; text-align:left;">
                                       <strong>ממוצע כללי: </strong>
                                       ${student.grades?.length ? Math.round(student.grades.reduce((a:number, b:any)=>a+b.grade,0) / student.grades.length) : '-'}
                                     </div>
                                  </div>
                               `;
                               const w = window.open('', '_blank');
                               w?.document.write(printContent);
                               w?.document.close();
                               w?.print();
                             }}
                             disabled={!(student.grades && student.grades.length > 0)}
                             className="px-6 py-3 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-colors font-bold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
                           >
                             <Printer className="w-4 h-4" />
                             הדפס תעודה
                           </button>
                           <button
                             onClick={() => {
                               const subject = prompt('מקצוע:');
                               if(!subject) return;
                               const categoryRaw = prompt('קטגוריה (quiz / midterm / final / homework / other):', 'other');
                               const category = ['quiz', 'midterm', 'final', 'homework', 'other'].includes(categoryRaw || '') ? categoryRaw : 'other';
                               const testName = prompt('שם המבחן/מטלה:');
                               if(!testName) return;
                               const gradeStr = prompt('ציון (0-100):');
                               if(!gradeStr) return;
                               const grade = parseInt(gradeStr, 10);
                               const dateRaw = prompt('תאריך (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                               const date = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();
                               const grades = student.grades || [];
                               updateStudent('grades', [{ id: Date.now(), subject, category, testName, grade, date }, ...grades]);
                             }}
                             className="px-6 py-3 bg-sky-600 text-white rounded-2xl hover:bg-sky-700 transition-colors font-bold text-sm flex items-center gap-2 shadow-sm"
                           >
                             <Plus className="w-4 h-4" />
                             הזן ציון חדש
                           </button>
                        </div>
                     </div>

                     <div className="space-y-8">
                       {(student.grades || []).length === 0 ? (
                          <div className="p-10 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                             טרם הוזנו ציונים לתלמיד זה.
                          </div>
                       ) : (
                         <div className="space-y-10">
                           {/* Quick Stats */}
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
                                <div>
                                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">ממוצע כללי</p>
                                   <p className="text-4xl font-black text-slate-800 dark:text-white">
                                     {Math.round((student.grades || []).reduce((acc: number, g: any) => acc + g.grade, 0) / Math.max(1, (student.grades || []).length))}
                                   </p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                  <GraduationCap className="w-6 h-6 text-slate-400" />
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
                                <div>
                                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">מספר ההערכות</p>
                                   <p className="text-4xl font-black text-slate-800 dark:text-white">{(student.grades || []).length}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                  <FileText className="w-6 h-6 text-slate-400" />
                                </div>
                              </div>
                           </div>

                           {/* Subject Breakdown */}
                           <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 space-y-6">
                               <h4 className="text-xl font-black text-slate-800 dark:text-white opacity-80">ממוצעים לפי מקצוע</h4>
                               <div className="space-y-5">
                                 {Object.entries((student.grades || []).reduce((acc: any, g: any) => {
                                   if (!acc[g.subject]) acc[g.subject] = { sum: 0, count: 0 };
                                   acc[g.subject].sum += g.grade;
                                   acc[g.subject].count++;
                                   return acc;
                                 }, {})).map(([subject, data]: [string, any]) => {
                                   const avg = Math.round(data.sum / data.count);
                                   return (
                                     <div key={subject} className="space-y-2">
                                       <div className="flex items-center justify-between text-sm font-bold">
                                         <span className="text-slate-700 dark:text-slate-300">{subject}</span>
                                         <span className={cn(avg >= 90 ? "text-emerald-500" : avg >= 70 ? "text-amber-500" : "text-rose-500")}>{avg}</span>
                                       </div>
                                       <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                         <div 
                                           className={cn("h-full rounded-full transition-all", avg >= 90 ? "bg-emerald-400" : avg >= 70 ? "bg-amber-400" : "bg-rose-400")} 
                                           style={{ width: `${avg}%` }} 
                                         />
                                       </div>
                                     </div>
                                   );
                                 })}
                               </div>
                           </div>

                           {/* Recent Grades List */}
                           <h4 className="text-xl font-black text-slate-800 dark:text-white pt-4">הערכות אחרונות</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {(student.grades || []).map((g: any) => (
                               <div key={g.id} className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                 <div>
                                   <div className="flex items-center gap-2">
                                     <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-black">{g.subject}</span>
                                     {g.category && <span className="px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-black uppercase">{g.category}</span>}
                                     <span className="text-xs text-slate-400">{new Date(g.date).toLocaleDateString('he-IL')}</span>
                                   </div>
                                   <p className="font-bold text-slate-800 dark:text-white mt-3 text-lg leading-tight">{g.testName}</p>
                                 </div>
                                 <div className="text-right flex flex-col items-end">
                                   <div className={cn("text-4xl font-black tracking-tighter", g.grade >= 90 ? "text-emerald-500" : g.grade >= 70 ? "text-amber-500" : "text-rose-500")}>
                                     {g.grade}
                                   </div>
                                   <button onClick={()=>updateStudent('grades', student.grades.filter((x:any)=>x.id!==g.id))} className="text-[10px] text-slate-400 font-bold hover:text-rose-500 uppercase mt-1 transition-colors">מחק ציון</button>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'lessons' && (
                <div className="lg:col-span-3">
                  <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-6">
                         <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem]">
                            <BookOpen className="w-10 h-10 text-indigo-600" />
                         </div>
                         <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">שיעורים ומערכת שעות אישית</h3>
                       </div>
                       <button 
                         onClick={() => setIsAddingLesson(!isAddingLesson)}
                         className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                       >
                         {isAddingLesson ? <X className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                         {isAddingLesson ? 'ביטול' : 'הוספת שיעור'}
                       </button>
                    </div>

                    {isAddingLesson && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900 shadow-xl space-y-6"
                      >
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h4 className="text-xl font-black text-slate-800 dark:text-white">שיבוץ לשיעור או הקבצה</h4>
                            <div className="flex gap-2">
                               {availableLessons.length > 0 && (
                                  <select 
                                    onChange={(e) => {
                                       const selectedId = e.target.value;
                                       if (!selectedId) return;
                                       const lesson = availableLessons.find((l: any) => l.id === selectedId);
                                       if (lesson) {
                                          setNewLesson({ 
                                             name: lesson.name, 
                                             day: lesson.day, 
                                             time: lesson.time, 
                                             room: lesson.room || '', 
                                             category: lesson.category || 'regular' 
                                          });
                                       }
                                    }}
                                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-800 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="">בחירה משיעורי המערכת...</option>
                                    {availableLessons.map((l: any) => <option key={l.id} value={l.id}>{l.name} (יום {l.day}, {l.time})</option>)}
                                  </select>
                               )}
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שם השיעור / הקבצה</label>
                               <input 
                                 value={newLesson.name}
                                 onChange={e => setNewLesson(prev => ({...prev, name: e.target.value}))}
                                 className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-none font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500 transition-all shadow-sm"
                                 placeholder="למשל: תגבור מתמטיקה"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">יום בשבוע</label>
                               <select 
                                 value={newLesson.day}
                                 onChange={e => setNewLesson(prev => ({...prev, day: e.target.value}))}
                                 className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-none font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500 transition-all shadow-sm"
                               >
                                 {['א', 'ב', 'ג', 'ד', 'ה', 'ו'].map(d => <option key={d} value={d}>יום {d}</option>)}
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שעה</label>
                               <input 
                                 type="time"
                                 value={newLesson.time}
                                 onChange={e => setNewLesson(prev => ({...prev, time: e.target.value}))}
                                 className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-none font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500 transition-all shadow-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">קטגוריה</label>
                               <select 
                                 value={newLesson.category}
                                 onChange={e => setNewLesson(prev => ({...prev, category: e.target.value as any}))}
                                 className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-none font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500 transition-all shadow-sm"
                               >
                                 {lessonCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">חדר / מיקום (אופציונלי)</label>
                               <input 
                                 value={newLesson.room}
                                 onChange={e => setNewLesson(prev => ({...prev, room: e.target.value}))}
                                 className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-none font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500 transition-all shadow-sm"
                                 placeholder="למשל: ספריה"
                               />
                            </div>
                         </div>
                         <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button 
                              onClick={() => {
                                if (!newLesson.name) return;
                                const existsGlobally = availableLessons.some((l: any) => l.name === newLesson.name && l.day === newLesson.day && l.time === newLesson.time);
                                 if (!existsGlobally) {
                                    if (confirm("האם ברצונך לשמור את השיעור הזה כשיעור זמין לכלל התלמידים במערכת?")) {
                                       updateCurrentConfig((prev: any) => ({
                                          ...prev,
                                          availableLessons: [...(prev.availableLessons || []), { ...newLesson, id: Date.now().toString() }]
                                       }));
                                    }
                                 }
                                 const lessonToSave = { ...newLesson, id: Date.now().toString() };
                                updateStudent('lessons', [...(student.lessons || []), lessonToSave]);
                                setIsAddingLesson(false);
                                setNewLesson({ name: '', day: 'א', time: '08:00', room: '', category: 'regular' });
                              }}
                              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all"
                            >
                              שמירת שיעור ושיבוץ
                            </button>
                         </div>
                      </motion.div>
                    )}

                    {(!student.lessons || student.lessons.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        התלמיד עדיין לא משובץ לשיעורים או הקבצות ספציפיות.
                      </div>
                    ) : (
                      <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {student.lessons.map((lesson: any) => {
                             const category = lessonCategories.find(c => c.id === (lesson.category || 'regular'));
                             return (
                               <div key={lesson.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative group overflow-hidden transition-all hover:shadow-md">
                                 <div className={cn("absolute top-0 right-0 w-16 h-1", category?.color || "bg-indigo-500")} />
                                 <div className="flex items-start justify-between mb-4">
                                   <h4 className="font-black text-lg text-slate-800 dark:text-white leading-tight">{lesson.name}</h4>
                                   {category && (
                                     <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase", category.bgColor, category.textColor)}>
                                       {category.label}
                                     </span>
                                   )}
                                 </div>
                                 <div className="flex items-center gap-4 text-sm text-slate-500 font-bold">
                                   <div className="flex items-center gap-1.5">
                                     <CalendarDays className="w-4 h-4 text-slate-400" />
                                     יום {lesson.day}
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                     <Clock className="w-4 h-4 text-slate-400" />
                                     {lesson.time}
                                   </div>
                                    {lesson.room && (
                                       <div className="flex items-center gap-1.5">
                                         <div className="w-1 h-1 rounded-full bg-slate-300" />
                                         <span className="text-slate-400">{lesson.room}</span>
                                       </div>
                                    )}
                                 </div>
                                 <button 
                                   onClick={() => updateStudent('lessons', student.lessons.filter((l: any) => l.id !== lesson.id))}
                                   className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             );
                          })}
                        </div>

                        {/* Visual Schedule Grid */}
                        <div className="space-y-6">
                           <h4 className="text-xl font-black text-slate-800 dark:text-white opacity-80 flex items-center gap-3">
                              <Calendar className="w-6 h-6 text-indigo-500" />
                              מבט שבועי
                           </h4>
                           <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-x-auto">
                              <div className="min-w-[600px] grid grid-cols-6 gap-4">
                                 <div className="col-span-1" /> {/* Spacer for time column */}
                                 {['א', 'ב', 'ג', 'ד', 'ה'].map(day => (
                                    <div key={day} className="text-center font-black text-slate-400 uppercase tracking-widest text-xs py-2">
                                       יום {day}
                                    </div>
                                 ))}

                                 {/* Example Time Slots */}
                                 {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map(time => (
                                    <React.Fragment key={time}>
                                       <div className="flex flex-col justify-center text-[10px] font-black text-slate-400 border-r border-slate-200 dark:border-slate-800 pr-4">
                                          {time}
                                       </div>
                                       {['א', 'ב', 'ג', 'ד', 'ה'].map(day => {
                                          const lessonAtTime = student.lessons?.find((l: any) => l.day === day && l.time.startsWith(time.split(':')[0]));
                                          const category = lessonAtTime ? lessonCategories.find(c => c.id === (lessonAtTime.category || 'regular')) : null;
                                          
                                          return (
                                             <div key={day} className="min-h-[60px] bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-2 flex items-center justify-center relative group">
                                                {lessonAtTime ? (
                                                   <motion.div 
                                                      initial={{ scale: 0.9, opacity: 0 }}
                                                      animate={{ scale: 1, opacity: 1 }}
                                                      className={cn(
                                                         "w-full h-full rounded-xl flex flex-col items-center justify-center text-center p-1.5 shadow-sm border",
                                                         category?.bgColor || "bg-indigo-50",
                                                         category?.textColor || "text-indigo-700",
                                                         "border-white/50 dark:border-slate-800/50"
                                                      )}
                                                   >
                                                      <span className="text-[10px] font-black leading-tight mb-0.5">{lessonAtTime.name}</span>
                                                      <span className="text-[8px] font-bold opacity-60 leading-none">{lessonAtTime.time}</span>
                                                   </motion.div>
                                                ) : (
                                                   <button 
                                                      onClick={() => {
                                                         setIsAddingLesson(true);
                                                         setNewLesson({ name: '', day, time, category: 'regular' });
                                                      }}
                                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-300 hover:text-indigo-500"
                                                   >
                                                      <Plus className="w-4 h-4" />
                                                   </button>
                                                )}
                                             </div>
                                          );
                                       })}
                                    </React.Fragment>
                                 ))}
                              </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="lg:col-span-3">
                  <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-6">
                         <div className="p-5 bg-brand-50 dark:bg-brand-900/20 rounded-[2.5rem]">
                            <ClipboardList className="w-10 h-10 text-brand-600" />
                         </div>
                         <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">מטלות ותזכורות אישיות</h3>
                       </div>
                       <button 
                         onClick={() => {
                           const title = prompt("כותרת המשימה:");
                           if (!title) return;
                           let dueDateStr = prompt("תאריך יעד (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
                           if (!dueDateStr) dueDateStr = new Date().toISOString().split('T')[0];
                           let priorityRaw = prompt("עדיפות (low / medium / high):", "medium");
                           const priority = ['low', 'medium', 'high'].includes(priorityRaw || '') ? priorityRaw : 'medium';
                           const newTask = { id: Date.now().toString(), title, status: 'pending', dueDate: dueDateStr, priority };
                           updateStudent('tasks', [...(student.tasks || []), newTask]);
                         }}
                         className="px-5 py-3 bg-brand-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-700 transition-colors"
                       >
                         <Plus className="w-5 h-5"/>
                         משימה חדשה
                       </button>
                    </div>

                    {(!student.tasks || student.tasks.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        אין משימות פתוחות לתלמיד זה.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {student.tasks.map((task: any) => (
                           <div key={task.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group">
                             <div className="flex items-center gap-4">
                               <button 
                                 onClick={() => updateStudent('tasks', student.tasks.map((t: any) => t.id === task.id ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t))}
                                 className={cn(
                                   "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
                                   task.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 hover:border-brand-500"
                                 )}
                               >
                                 {task.status === 'completed' && <Check className="w-5 h-5" />}
                               </button>
                               <div>
                                 <h4 className={cn("font-black text-lg text-slate-800 dark:text-white", task.status === 'completed' && "line-through opacity-50")}>{task.title}</h4>
                                 <p className="text-xs font-bold text-slate-400">יעד: {new Date(task.dueDate).toLocaleDateString('he-IL')}</p>
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                               <span className={cn(
                                 "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                                 task.priority === 'high' ? "bg-rose-100 text-rose-600" : task.priority === 'medium' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                               )}>
                                 {task.priority === 'high' ? 'דחוף' : task.priority === 'medium' ? 'בינוני' : 'נמוך'}
                               </span>
                               <button 
                                 onClick={() => updateStudent('tasks', student.tasks.filter((t: any) => t.id !== task.id))}
                                 className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

               {activeTab === 'rewards' && (
                <div className="lg:col-span-3 space-y-8">
                  <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-[2.5rem]">
                          <Trophy className="w-10 h-10 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white">נקודות ופרסים</h3>
                          <p className="text-slate-500 font-medium">ניהול המאזן האישי והישגי התלמיד.</p>
                        </div>
                      </div>
                      <div className="text-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">יתרה נוכחית</p>
                         <p className="text-5xl font-display font-black text-brand-600">
                           {currentConfig.student_points?.[student.id] || 0}
                         </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <h4 className="text-xl font-bold dark:text-white flex items-center gap-2">
                           <Zap className="w-5 h-5 text-brand-600" />
                           הענקת נקודות בונוס
                         </h4>
                         <div className="grid grid-cols-3 gap-3">
                           {[5, 10, 25, 50, 100, 250].map(val => (
                             <button
                               key={val}
                               onClick={() => {
                                 const reason = prompt("מה סיבת הענקת הנקודות?", "השתתפות יפה בשיעור");
                                 if (!reason) return;
                                 updateCurrentConfig((prev: any) => {
                                   const newPoints = { ...prev.student_points, [student.id]: (prev.student_points[student.id] || 0) + val };
                                   const newLog = [...(prev.analytics_log || []), {
                                     type: 'points',
                                     studentId: student.id,
                                     reason,
                                     value: val,
                                     timestamp: Date.now()
                                   }].slice(-1000);
                                   return { ...prev, student_points: newPoints, analytics_log: newLog };
                                 });
                               }}
                               className="py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all shadow-sm"
                             >
                               +{val}
                             </button>
                           ))}
                         </div>
                      </div>

                      <div className="space-y-6">
                         <h4 className="text-xl font-bold dark:text-white flex items-center gap-2">
                           <Target className="w-5 h-5 text-indigo-600" />
                           מבצעים פעילים
                         </h4>
                         <div className="space-y-3">
                           {(currentConfig.campaigns || []).filter((c: any) => c.status === 'active').map((c: any) => {
                             const progress = c.progress?.[student.id] || 0;
                             const percent = Math.min(100, (progress / c.target) * 100);
                             return (
                               <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                 <div className="flex justify-between items-center mb-2">
                                   <span className="font-bold text-sm dark:text-white">{c.title}</span>
                                   <span className="text-[10px] font-black text-slate-400">{progress} / {c.target}</span>
                                 </div>
                                 <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
                                 </div>
                               </div>
                             );
                           })}
                           {(currentConfig.campaigns || []).filter((c: any) => c.status === 'active').length === 0 && (
                             <p className="text-xs text-slate-400 italic text-center py-4">אין מבצעים פעילים כרגע</p>
                           )}
                         </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                       <div className="flex-1 space-y-4">
                          <h4 className="text-lg font-black text-slate-400 uppercase tracking-widest px-1">היסטוריית פרסים</h4>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                             {(currentConfig.student_rewards?.[student.id] || []).slice().reverse().map((r: any, idx: number) => (
                               <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                  <div className="flex items-center gap-3">
                                     <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-brand-600">
                                        {r.icon === 'Clock' && <Clock className="w-4 h-4" />}
                                        {r.icon === 'Zap' && <Zap className="w-4 h-4" />}
                                        {r.icon === 'Map' && <Map className="w-4 h-4" />}
                                        {r.icon === 'CheckCircle2' && <CheckCircle2 className="w-4 h-4" />}
                                     </div>
                                     <span className="font-bold dark:text-white text-sm">{r.title}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400">{new Date(r.purchasedAt).toLocaleDateString('he-IL')}</span>
                               </div>
                             ))}
                             {(!currentConfig.student_rewards?.[student.id] || currentConfig.student_rewards?.[student.id].length === 0) && (
                               <div className="p-8 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">טרם נרכשו פרסים</div>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="lg:col-span-3">
                   <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <div className="p-5 bg-brand-50 dark:bg-brand-900/20 rounded-[2.5rem]">
                              <Calendar className="w-10 h-10 text-brand-600" />
                           </div>
                           <h3 className="text-3xl font-black text-slate-900 dark:text-white">רישום נוכחות (היום)</h3>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                         <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">נוכחות מוזנת ישירות למערכת מכאן או מרשימת התלמידים.</p>
                         <div className="flex items-center gap-4">
                            <button
                              onClick={() => {
                                const newHistory = [{ date: new Date().toISOString(), status: 'present' }, ...(student.attendanceHistory || [])];
                                updateStudent('status', 'present');
                                updateStudent('attendanceHistory', newHistory);
                              }}
                              className={cn("flex-1 py-4 rounded-2xl font-black text-sm flex flex-col items-center gap-2 transition-all border-2", student.status === 'present' || !student.status ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border-emerald-500 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-200")}
                            >
                               <CheckCircle2 className="w-6 h-6" />
                               נוכח
                            </button>
                            <button
                              onClick={() => {
                                const newHistory = [{ date: new Date().toISOString(), status: 'late' }, ...(student.attendanceHistory || [])];
                                updateStudent('status', 'late');
                                updateStudent('attendanceHistory', newHistory);
                              }}
                              className={cn("flex-1 py-4 rounded-2xl font-black text-sm flex flex-col items-center gap-2 transition-all border-2", student.status === 'late' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 border-amber-500 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-200")}
                            >
                               <Clock className="w-6 h-6" />
                               באיחור
                            </button>
                            <button
                              onClick={() => {
                                const newHistory = [{ date: new Date().toISOString(), status: 'absent' }, ...(student.attendanceHistory || [])];
                                updateStudent('status', 'absent');
                                updateStudent('attendanceHistory', newHistory);
                              }}
                              className={cn("flex-1 py-4 rounded-2xl font-black text-sm flex flex-col items-center gap-2 transition-all border-2", student.status === 'absent' ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 border-rose-500 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-rose-200")}
                            >
                               <XCircle className="w-6 h-6" />
                               חסר
                            </button>
                         </div>
                      </div>

                      <div className="mt-10">
                        <h4 className="text-xl font-black text-slate-800 dark:text-white mb-6">היסטוריית נוכחות</h4>
                        {(!student.attendanceHistory || student.attendanceHistory.length === 0) ? (
                          <div className="p-8 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                             אין רישומי נוכחות קודמים. סמן נוכחות מעלה כדי להתחיל.
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                            {student.attendanceHistory.map((record: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm group">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {new Date(record.date).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-black",
                                    record.status === 'present' ? "bg-emerald-100 text-emerald-700" :
                                    record.status === 'late' ? "bg-amber-100 text-amber-700" :
                                    "bg-rose-100 text-rose-700"
                                  )}>
                                    {record.status === 'present' ? 'נוכח' : record.status === 'late' ? 'איחור' : 'חסר'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const newHistory = student.attendanceHistory.filter((_: any, i: number) => i !== idx);
                                      updateStudent('attendanceHistory', newHistory);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'diagnostics' && (
                <div className="lg:col-span-3">
                  <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-6">
                         <div className="p-5 bg-teal-50 dark:bg-teal-900/20 rounded-[2.5rem]">
                            <Stethoscope className="w-10 h-10 text-teal-600" />
                         </div>
                         <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">אבחונים והתאמות</h3>
                       </div>
                       <button onClick={() => setIsAddingDiag(!isAddingDiag)} className="px-5 py-3 bg-teal-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors">
                         {isAddingDiag ? 'ביטול' : (
                           <>
                             <Plus className="w-5 h-5"/>
                             הוספת תיעוד
                           </>
                         )}
                       </button>
                    </div>

                    {isAddingDiag && (
                      <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">סוג האבחון/התאמה <span className="text-rose-500">*</span></label>
                            <input 
                              type="text" 
                              value={newDiag.type} 
                              onChange={(e) => setNewDiag(prev => ({...prev, type: e.target.value}))} 
                              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none" 
                              placeholder="לדוגמה: אבחון דידקטי"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">תאריך האבחון</label>
                            <input 
                              type="date" 
                              value={newDiag.date} 
                              onChange={(e) => setNewDiag(prev => ({...prev, date: e.target.value}))} 
                              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">תיאור ופרטים נוספים</label>
                          <textarea 
                            value={newDiag.description} 
                            onChange={(e) => setNewDiag(prev => ({...prev, description: e.target.value}))} 
                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none min-h-[100px]" 
                            placeholder="תיאור האבחון..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">התאמות שניתנו (מופרדות בפסיקים)</label>
                          <input 
                            type="text" 
                            value={newDiag.accommodations} 
                            onChange={(e) => setNewDiag(prev => ({...prev, accommodations: e.target.value}))} 
                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none" 
                            placeholder="לדוגמה: תוספת זמן, הקראת שאלון"
                          />
                        </div>
                        <div className="flex justify-end pt-2">
                          <button 
                            disabled={!newDiag.type.trim()}
                            onClick={() => {
                              const diagnosticEntry = {
                                type: newDiag.type,
                                date: newDiag.date || new Date().toISOString().split('T')[0],
                                description: newDiag.description,
                                accommodations: newDiag.accommodations.split(',').map(s => s.trim()).filter(s => s)
                              };
                              updateStudent('diagnostics', [...(student.diagnostics || []), diagnosticEntry]);
                              setNewDiag({ type: '', date: '', description: '', accommodations: '' });
                              setIsAddingDiag(false);
                            }}
                            className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            שמירת תיעוד
                          </button>
                        </div>
                      </div>
                    )}

                    {(!student.diagnostics || student.diagnostics.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        אין אבחונים מתועדים לתלמיד זה.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {student.diagnostics.map((diag: any, idx: number) => (
                           <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative group">
                             <div className="flex justify-between items-start mb-2">
                               <h4 className="font-bold text-lg text-slate-800 dark:text-white">{diag.type}</h4>
                               <div className="flex items-center gap-2">
                                 <span className="text-xs text-slate-400">{new Date(diag.date).toLocaleDateString('he-IL')}</span>
                                 <button 
                                   onClick={() => {
                                      if (confirm('האם אתה בטוח שברצונך למחוק תיעוד זה?')) {
                                        updateStudent('diagnostics', student.diagnostics.filter((_:any, i:number) => i !== idx));
                                      }
                                   }}
                                   className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-rose-500 hover:bg-rose-50 rounded"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             </div>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{diag.description}</p>
                             {diag.accommodations?.length > 0 && (
                               <div className="flex flex-wrap gap-2 mt-4">
                                 {diag.accommodations.map((acc:string, i:number) => (
                                   <Badge key={i} variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">{acc}</Badge>
                                 ))}
                               </div>
                             )}
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'communications' && (
                <div className="lg:col-span-3">
                  <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-6 mb-8">
                       <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-[2.5rem]">
                          <PhoneCall className="w-10 h-10 text-purple-600" />
                       </div>
                       <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">תקשורת עם הורים</h3>
                    </div>
                    {(!student.communications || student.communications.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        אין תיעוד תקשורת לתלמיד זה. (אפשר לבקש מהסייעת להוסיף רשומה)
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {student.communications.map((comm: any, idx: number) => (
                           <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                             <div className="flex justify-between items-start mb-2">
                               <div className="flex gap-2 items-center">
                                 <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-none">{comm.type}</Badge>
                                 <h4 className="font-bold text-slate-800 dark:text-white">{comm.toParent ? 'נשלח להורה' : 'התקבל מהורה'}</h4>
                               </div>
                               <span className="text-xs text-slate-400">{new Date(comm.date).toLocaleDateString('he-IL')}</span>
                             </div>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-wrap">{comm.summary}</p>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

               {activeTab === 'history' && (
                <div className="lg:col-span-3">
                  <div className="glass-card p-12 rounded-[4rem] space-y-10 shadow-sm bg-white/40 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-6">
                          <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-[2.5rem]">
                             <History className="w-10 h-10 text-amber-600" />
                          </div>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">יומן אירועי התנהגות</h3>
                       </div>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        const logs = (currentConfig.analytics_log || [])
                          .filter((l: any) => l.studentId === student.id)
                          .sort((a: any, b: any) => b.timestamp - a.timestamp);
                        
                        if (logs.length === 0) {
                          return (
                            <div className="p-16 text-center text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                               <p className="font-bold">לא נמצאו אירועים מתועדים לתלמיד זה</p>
                            </div>
                          );
                        }

                        return logs.map((l: any) => {
                          const category = BEHAVIOR_CATEGORIES.find(c => c.id === l.categoryId);
                          return (
                            <div key={l.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-6 hover:shadow-md transition-all">
                               <div className="flex items-center gap-6">
                                  <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                     {category?.icon || '📝'}
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-3">
                                        <h4 className="font-black text-slate-800 dark:text-white">{category?.label || 'אירוע'}</h4>
                                        <span className={cn("text-xs font-black px-2 py-0.5 rounded-full", l.value >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                           {l.value >= 0 ? `+${l.value}` : l.value} נקודות
                                        </span>
                                     </div>
                                     <p className="text-sm font-medium text-slate-500 mt-1">{l.reason || 'ללא פירוט נוסף'}</p>
                                  </div>
                               </div>
                               <div className="text-left">
                                  <div className="text-xs font-black text-slate-400">{new Date(l.timestamp).toLocaleDateString('he-IL')}</div>
                                  <div className="text-xs font-bold text-slate-400 mt-0.5">{new Date(l.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                               </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

               {activeTab === 'documents' && (
                 <div className="lg:col-span-3 space-y-8">
                    <div className="glass-card p-12 rounded-[4rem] text-center bg-slate-50 dark:bg-slate-900/50 border-dashed border-2 border-slate-300 dark:border-slate-800 transition-all hover:border-brand-300 relative group overflow-hidden">
                       <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                       <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-6 group-hover:scale-110 transition-transform" />
                       <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-2">מרכז מסמכים וחומרים</h4>
                       <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">כאן תוכלו לנהל את כל הקבצים הרלוונטיים לתלמיד - אבחונים, אישורים רפואיים, עבודות נבחרות או תעודות.</p>
                       
                       <label className="inline-flex items-center gap-3 px-8 py-4 bg-brand-600 text-white rounded-[2rem] font-black text-sm shadow-xl hover:bg-brand-700 transition-all cursor-pointer">
                          <Upload className="w-5 h-5" />
                          העלאת קובץ חדש
                          <input 
                             type="file" 
                             className="hidden" 
                             onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (!file) return;
                               const reader = new FileReader();
                               reader.onload = (ev) => {
                                 const data = ev.target?.result as string;
                                 const newDoc = {
                                   id: Date.now().toString(),
                                   name: file.name,
                                   type: file.type,
                                   size: Math.round(file.size / 1024),
                                   date: new Date().toISOString(),
                                   data: data
                                 };
                                 updateStudent('documents', [...(student.documents || []), newDoc]);
                               };
                               reader.readAsDataURL(file);
                             }}
                          />
                       </label>
                    </div>

                    {student.documents && student.documents.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {student.documents.map((doc: any) => (
                             <motion.div 
                                key={doc.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all"
                             >
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                                   {doc.type.includes('pdf') ? <FileText className="w-7 h-7" /> : <File className="w-7 h-7" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <h5 className="font-black text-slate-800 dark:text-white truncate text-base mb-1" title={doc.name}>{doc.name}</h5>
                                   <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      <span>{doc.size} KB</span>
                                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                                      <span>{new Date(doc.date).toLocaleDateString('he-IL')}</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <button 
                                      onClick={() => {
                                         const link = document.createElement('a');
                                         link.href = doc.data;
                                         link.download = doc.name;
                                         link.click();
                                      }}
                                      className="p-3 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all"
                                   >
                                      <Download className="w-5 h-5" />
                                   </button>
                                   <button 
                                      onClick={() => {
                                         if (confirm('האם אתה בטוח שברצונך למחוק מסמך זה?')) {
                                            updateStudent('documents', student.documents.filter((d: any) => d.id !== doc.id));
                                         }
                                      }}
                                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                   >
                                      <Trash2 className="w-5 h-5" />
                                   </button>
                                </div>
                             </motion.div>
                          ))}
                       </div>
                    ) : null}
                 </div>
               )}

              {activeTab === 'history' && (
                <div className="lg:col-span-3">
                   <div className="glass-card p-12 rounded-[4rem] text-center bg-slate-50 border border-slate-200">
                      <Clock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                      <h4 className="text-xl font-bold text-slate-700 mb-2">היסטוריה משנים קודמות</h4>
                      <p className="text-sm text-slate-500 mb-4">ייבוא נתונים אוטומטי ממשוב או ממערכות בית ספריות אחרות (בפיתוח)</p>
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
    </div>
  );
};

const DashboardView = ({ activeConfig, stats, students, onBack, updateCurrentConfig, isDarkMode, teacherProfile, setIsTeacherModalOpen, setViewType }: any) => {
  const today = new Date();
  const options = {
    start: today,
    end: today,
    isHebrewYear: false,
    candlelighting: true,
    location: Location.lookup('Jerusalem'),
    sedrot: true,
    omer: true,
  };
  const events = HebrewCalendar.calendar(options);
  const eventsToday = events.map(ev => ev.render('he'));

  const overdueTasks = (students || []).flatMap((s: any) => 
    (s.tasks || []).filter((t: any) => t.status !== 'done' && new Date(t.dueDate).getTime() < Date.now())
    .map((t: any) => ({ ...t, studentName: s.name, studentId: s.id }))
  );

  const presentCount = (students || []).filter((s:any) => s.status === 'present' || !s.status).length;
  const lateCount = (students || []).filter((s:any) => s.status === 'late').length;
  const absentCount = (students || []).filter((s:any) => s.status === 'absent').length;
  const totalAttendance = (students || []).length || 1;
  const attendancePercentage = Math.round(((presentCount + lateCount) / totalAttendance) * 100);
 
  const upcomingEvents = ((activeConfig as any).events || []).filter((e: any) => new Date(e.date).getTime() >= new Date().setHours(0,0,0,0)).slice(0, 3);
  const activeReminders = ((activeConfig as any).reminders || []).slice(0, 3);

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex items-center gap-6">
        <div className="flex items-center justify-between flex-1">
          <div className="space-y-1">
            <h2 className="text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">ברוכים הבאים ל-CLass&scool pro-manager</h2>
            <p className="text-slate-500 font-medium">המערכת ההוליסטית לניהול פדגוגי והתאמת כיתה.</p>
          </div>
          <button 
            onClick={() => setIsTeacherModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white border-brand-700 px-6 py-2.5 rounded-full text-sm font-display font-bold shadow-lg shadow-brand-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
          >
            <UserCircle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="font-display">פרופיל מורה: {teacherProfile.name}</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'תלמידים רשומים', value: stats.studentCount, icon: <Users />, color: 'brand' },
          { label: 'שביעות רצון', value: `${stats.satisfaction}%`, icon: <Sparkles />, color: 'amber', badge: `${attendancePercentage}% נוכחות` },
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
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1.5">{card.label}</h3>
              <p className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tighter">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-10 rounded-[3rem] bg-indigo-50 border-2 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 text-center flex flex-col items-center justify-center space-y-4 relative overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <JewishTimeline />
          <div className="mt-4 p-4 bg-white/50 dark:bg-indigo-900/40 rounded-2xl w-full text-center border-2 border-indigo-50/50 dark:border-indigo-800/50 backdrop-blur-sm">
             <p className="text-indigo-600 dark:text-indigo-400 font-bold opacity-80">מועדים, שבתות וחגים יסונכרנו למערכת השעות והנוכחות שלך באופן אוטומטי.</p>
          </div>
        </div>

        <div className="glass-card p-10 rounded-[3rem] bg-white border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-sm relative overflow-hidden group">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mb-2 transform -rotate-6 group-hover:rotate-0 transition-transform">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">בקרת סידור מרחב</h3>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-md hover:bg-brand-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              <Layout className="w-4 h-4" />
              מפה
            </button>
            <button onClick={() => setViewType('groups-management')} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-brand-500" />
              קבוצות
            </button>
          </div>
          <button onClick={() => setViewType('campaigns')} className="w-full px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold shadow-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 mt-2">
            <Trophy className="w-4 h-4" />
            ניהול מבצעים
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col items-center justify-center relative overflow-hidden">
           <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-8 self-start w-full tracking-tight">סטטוס נוכחות כיתתי (היום)</h3>
           <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                 <circle strokeDasharray="100, 100" className="text-emerald-500 stroke-current opacity-20" strokeWidth="4" fill="none" cx="18" cy="18" r="16" />
                 <circle strokeDasharray={`${attendancePercentage}, 100`} className="text-emerald-500 stroke-current animate-[dash_1s_ease-out_forwards]" strokeWidth="4" fill="none" cx="18" cy="18" r="16" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-5xl font-black text-slate-800 dark:text-white">{attendancePercentage}%</span>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">נוכחות</span>
              </div>
           </div>
           <div className="flex gap-4 w-full">
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
                 <p className="text-xs font-bold text-slate-500 uppercase">נוכחים</p>
                 <p className="text-2xl font-black text-emerald-600 mt-1">{presentCount}</p>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
                 <p className="text-xs font-bold text-slate-500 uppercase">באיחור</p>
                 <p className="text-2xl font-black text-amber-600 mt-1">{lateCount}</p>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
                 <p className="text-xs font-bold text-slate-500 uppercase">חסרים</p>
                 <p className="text-2xl font-black text-rose-600 mt-1">{absentCount}</p>
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                 <Bell className="w-6 h-6 text-indigo-500" />
                 תזכורות פעילות
                 <Badge className="bg-indigo-100 text-indigo-600 border-none">{activeReminders.length}</Badge>
              </h3>
              <button onClick={() => setViewType('reminders')} className="text-xs font-black text-slate-400 hover:text-brand-600 uppercase tracking-widest">צפה בהכל</button>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {activeReminders.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Clock className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="font-bold text-slate-500">אין תזכורות קרובות</p>
                 </div>
              ) : (
                 activeReminders.map((r: any, i: number) => (
                    <div key={i} className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center shadow-sm">
                             <span className="text-[10px] font-black text-brand-600 leading-none">{new Date(r.date).getDate()}</span>
                             <span className="text-[8px] font-medium text-slate-400 uppercase">{new Date(r.date).toLocaleDateString('he-IL', { month: 'short' })}</span>
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 dark:text-slate-200">{r.title}</p>
                             <p className="text-xs font-medium text-slate-500">{r.time}</p>
                          </div>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                 <History className="w-6 h-6 text-brand-500" />
                 אירועים קרובים
                 <Badge className="bg-brand-100 text-brand-600 border-none">{upcomingEvents.length}</Badge>
              </h3>
              <button onClick={() => setViewType('events')} className="text-xs font-black text-slate-400 hover:text-brand-600 uppercase tracking-widest">כל האירועים</button>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {upcomingEvents.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Sparkles className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="font-bold text-slate-500">יומן אירועים פנוי</p>
                 </div>
              ) : (
                 upcomingEvents.map((e: any, i: number) => (
                    <div key={i} className="p-5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black text-white uppercase", e.type === 'trip' ? 'bg-emerald-500' : e.type === 'meeting' ? 'bg-amber-500' : 'bg-brand-500')}>
                             {e.type}
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 dark:text-slate-200">{e.title}</p>
                             <p className="text-xs font-medium text-slate-500">{new Date(e.date).toLocaleDateString('he-IL')}</p>
                          </div>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                 <AlertCircle className="w-6 h-6 text-rose-500" />
                 משימות באיחור
                 <Badge className="bg-rose-100 text-rose-600 border-none">{overdueTasks.length}</Badge>
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {overdueTasks.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
                    <p className="font-bold text-slate-500">אין משימות באיחור</p>
                    <p className="text-sm font-medium text-slate-400">כל התלמידים עומדים ביעדים.</p>
                 </div>
              ) : (
                 overdueTasks.map((t: any, i: number) => (
                    <div key={i} className="p-5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-between">
                       <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{t.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs font-black text-rose-500 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">{t.studentName}</span>
                             <span className="text-xs font-bold text-slate-500 dark:text-slate-400">יעד: {new Date(t.dueDate).toLocaleDateString('he-IL')}</span>
                          </div>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-500" />
              חמשת המקצועות הנפוצים ביותר
            </h3>
            <p className="text-sm font-medium text-slate-500">התפלגות כמות המבחנים והערכות לפי מקצוע</p>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <BarChart
              data={Object.entries((students || []).flatMap((s: any) => s.grades || [])
                .reduce((acc: any, g: any) => {
                  if (g.subject) {
                    acc[g.subject] = (acc[g.subject] || 0) + 1;
                  }
                  return acc;
                }, {}))
                .map(([subject, count]) => ({ subject, count }))
                .sort((a: any, b: any) => b.count - a.count)
                .slice(0, 5)
              }
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
              <XAxis 
                dataKey="subject" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: 900 }}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc', radius: 16 }}
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                  padding: '16px'
                }}
                itemStyle={{ color: '#6366f1', fontWeight: 900 }}
                labelStyle={{ fontWeight: 900, marginBottom: '4px', color: isDarkMode ? '#f8fafc' : '#0f172a' }}
                formatter={(value: any) => [`${value} הערכות`, 'כמות']}
              />
              <Bar 
                dataKey="count" 
                radius={[12, 12, 0, 0]}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {
                  Object.entries((students || []).flatMap((s: any) => s.grades || [])
                    .reduce((acc: any, g: any) => {
                      if (g.subject) {
                        acc[g.subject] = (acc[g.subject] || 0) + 1;
                      }
                      return acc;
                    }, {}))
                    .map(([subject, count]) => ({ subject, count }))
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 5)
                    .map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b'][index % 5]} />
                    ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    updateCurrentConfig((prev: any) => ({
      ...prev,
      groups: prev.groups.filter((g: any) => g.id !== id)
    }));
    setConfirmDeleteId(null);
    setNotifications((prev: any) => [{ id: Date.now(), text: `הקבוצה נמחקה בהצלחה`, type: 'info' }, ...prev]);
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
          <div key={group.id} className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] space-y-4 hover:shadow-lg transition-all group relative overflow-hidden">
            {confirmDeleteId === group.id ? (
              <div className="absolute inset-0 bg-rose-600 z-10 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-8 h-8 text-white mb-2" />
                <p className="text-white font-black text-sm mb-4">למחוק את קבוצת {group.name}?</p>
                <div className="flex gap-2">
                  <button onClick={() => removeGroup(group.id)} className="px-5 py-2 bg-white text-rose-600 rounded-xl font-black text-xs">מחק</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2 bg-rose-700 text-white rounded-xl font-black text-xs">ביטול</button>
                </div>
                <p className="text-rose-200 text-[9px] mt-4 font-bold">שימו לב: שיוכי תלמידים לקבוצה זו יוסרו</p>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <input 
                value={group.name}
                onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                className="bg-transparent font-black text-slate-800 dark:text-slate-100 focus:ring-0 border-0 p-0 text-base flex-1"
              />
              <button 
                onClick={() => setConfirmDeleteId(group.id)}
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

const StudentCard = ({ student, currentConfig, updateCurrentConfig, setNotifications, isSelected, onClick, onEdit, onDelete }: any) => {
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
             <div className="flex -space-x-1 rtl:space-x-reverse ml-auto">
              {student.groups?.map((gId: string) => {
                 const group = currentConfig.groups?.find((g: any) => g.id === gId);
                 const groupIndex = (currentConfig.groups || []).findIndex((g: any) => g.id === gId);
                 const colors = ['bg-brand-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-sky-500', 'bg-purple-500'];
                 return (
                   <div 
                     key={gId} 
                     title={group?.name || `קבוצה ${gId}`}
                     className={cn(
                       "w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm transition-transform hover:scale-125 cursor-help",
                       colors[groupIndex % colors.length] || 'bg-slate-400'
                     )}
                   />
                 );
              })}
             </div>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => {
               e.stopPropagation();
               if (onEdit) onEdit();
             }}
             title="פרופיל מלא"
             className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-xl transition-all"
           >
             <Settings2 className="w-4 h-4" />
           </button>
           <button 
             onClick={(e) => {
               e.stopPropagation();
               if (onDelete) {
                 onDelete();
               } else {
                 if (confirm(`האם למחוק את ${student.name}?`)) {
                   updateCurrentConfig((prev: any) => ({ 
                     ...prev, 
                     students: prev.students.filter((s:any) => s.id !== student.id),
                     grid: prev.grid.map((id: string | null) => id === student.id ? null : id)
                   }));
                   setNotifications((prev: any) => [{ id: Date.now(), text: `התלמיד ${student.name} נמחק`, type: 'info' }, ...prev]);
                 }
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
  exportToJSON,
  isAddStudentOpen,
  setIsAddStudentOpen,
  newStudent,
  setNewStudent,
  teacherProfile,
  setTeacherProfile,
  isTeacherModalOpen,
  setIsTeacherModalOpen,
  setIsBulkUpdateOpen
}: any) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHeight, setFilterHeight] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  
  const filteredStudents = useMemo(() => {
    let result = currentConfig.students.filter((s: any) => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filterHeight !== 'all') {
      result = result.filter((s: any) => s.height === filterHeight);
    }
    
    if (filterGroup !== 'all') {
      if (filterGroup === 'none') {
        result = result.filter((s: any) => !s.groups || s.groups.length === 0);
      } else {
        result = result.filter((s: any) => s.groups?.includes(filterGroup));
      }
    }
    
    if (sortBy === 'newest') {
      result = [...result].reverse();
    } else if (sortBy === 'name') {
      result = [...result].sort((a: any, b: any) => a.name.localeCompare(b.name, 'he'));
    }
    
    return result;
  }, [currentConfig.students, searchQuery, filterHeight, filterGroup, sortBy]);

  const loadExampleData = () => {
    if (confirm("פעולה זו תחליף את כל נתוני התלמידים והמבנה הנוכחיים בנתוני הדוגמה המלאים. האם להמשיך?")) {
      const demoStudents = [
        "נתי אורדמן", "אוריאל אנסבכר", "חיים בן פורת", "דניאל גוטרמן",
        "חיים גולדמן", "ניסים דיין", "מוישי הריסון", "אברימי זיאת",
        "ציקי יורקוביץ", "מיכאל יעקובי", "אלחנן כהן", "כתריאל לוי",
        "מלאכי לינצר", "אליהו מויאל", "מאיר מיימון", "נדב מלול",
        "איתמר משולם", "אביתר עמר", "מנחם פודור", "גידי פולסקי",
        "יהונתן פז", "ישי כוחלני", "יוסף קמחי", "בן ציון קצב",
        "נדב רובין", "יהונתן רוזן", "אברהם ריין", "אריאל שטאובר"
      ].map((name, i) => ({
        id: (i + 1).toString(),
        name,
        preferred: [] as string[],
        forbidden: [] as string[],
        height: (i % 3 === 0 ? 'short' : i % 3 === 1 ? 'medium' : 'tall') as any,
        groups: (i < 8 ? ['קבוצת אומנות'] : i < 16 ? ['נבחרת כדורסל'] : []) as string[],
        areaPref: {} as any,
        notes: i === 0 ? 'תלמיד מצטיין, עוזר לאחרים' : ''
      }));

      // Set some point balances
      const student_points: Record<string, number> = {};
      demoStudents.forEach(s => {
        student_points[s.id] = Math.floor(Math.random() * 500);
      });

      // Create a 6x6 grid
      const rows = 6;
      const cols = 6;
      const grid = Array(rows * cols).fill(null);
      
      // Place students in the grid
      demoStudents.forEach((s, i) => {
        if (i < 30) {
          // Fill from front to back, leaving some gaps
          const row = Math.floor(i / 5);
          const col = i % 5;
          grid[row * cols + col] = s.id;
        }
      });

      const demoCampaigns = [
        {
          id: 'camp-demo-1',
          title: 'מבצע ניקיון כיתתי',
          target: 100,
          status: 'active',
          type: 'points',
          progress: {} as Record<string, number>
        },
        {
          id: 'camp-demo-2',
          title: 'אלוף הקריאה',
          target: 50,
          status: 'active',
          type: 'points',
          progress: {} as Record<string, number>
        }
      ];

      // Add progress to some students
      demoStudents.forEach(s => {
        if (Math.random() > 0.5) {
          demoCampaigns[0].progress[s.id] = Math.floor(Math.random() * 80);
        }
      });

      const demoFurniture = [
        { id: 'f-demo-1', type: 'board', x: 100, y: -20, width: 400, height: 100, rotation: 0 },
        { id: 'f-demo-2', type: 'cabinet', x: -150, y: 300, width: 80, height: 150, rotation: 10 },
        { id: 'f-demo-3', type: 'plant', x: 600, y: 100, width: 100, height: 100, rotation: 0 },
        { id: 'f-demo-4', type: 'rug', x: 150, y: 400, width: 300, height: 200, rotation: 0 }
      ];

      const demoGroups = [
        { id: 'קבוצת אומנות', name: 'קבוצת אומנות', constraint: 'together' },
        { id: 'נבחרת כדורסל', name: 'נבחרת כדורסל', constraint: 'separate' }
      ];

      updateCurrentConfig({
        id: Date.now().toString(),
        name: "כיתת הדגמה מקצועית",
        rows,
        cols,
        grid,
        students: demoStudents,
        groups: demoGroups,
        hiddenDesks: [35], // Hide bottom-right corner for example
        rowGaps: [2],
        columnGaps: [3],
        campaigns: demoCampaigns,
        furniture: demoFurniture,
        student_points,
        analytics_log: [
          { type: 'points', studentId: '1', value: 50, timestamp: Date.now() - 86400000 },
          { type: 'points', studentId: '2', value: 30, timestamp: Date.now() - 172800000 }
        ],
        rewards: [
          { id: 'rev-1', title: '15 דקות הפסקה נוספת', price: 100, stock: 5, icon: 'Clock' },
          { id: 'rev-2', title: 'ממתק קטן', price: 50, stock: 20, icon: 'Zap' },
          { id: 'rev-3', title: 'בחירת מקום ישיבה ליום', price: 200, stock: 3, icon: 'Map' },
          { id: 'rev-4', title: 'פטור משיעורי בית', price: 500, stock: 2, icon: 'CheckCircle2' }
        ]
      });

      setNotifications((prev: any) => [{ id: Date.now(), text: "נתוני ההדגמה המלאים נטענו בהצלחה!", type: 'success' }, ...prev]);
    }
  };


  return (
    <div className="p-8 space-y-10 h-full overflow-y-auto max-w-5xl mx-auto custom-scrollbar">
      <input type="file" ref={fileRef} className="hidden" accept=".xlsx, .xls, .csv, .json" onChange={handleFileImport} />
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
            טען נתוני דמו
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
            {Object.entries(aiWeights).filter(([k]) => ['preferred', 'forbidden', 'separateFrom'].includes(k)).map(([key, val]: [string, any]) => (
              <div key={key} className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-black text-slate-500 uppercase">
                  <span>{key === 'preferred' ? 'עדיפות חברים' : key === 'forbidden' ? 'מניעת חיכוך' : 'מרחק פיזי'}</span>
                  <span className="text-brand-600">{val}/10</span>
                </div>
                <input 
                  type="range" min="0" max="10" value={val} 
                  onChange={(e) => setAiWeights((prev: any) => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-brand-500"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  {key === 'preferred' && 'ככל שהערך גבוה יותר, ה-AI ייתן עדיפות עליונה לישיבה של חברים יחד.'}
                  {key === 'forbidden' && 'ככל שהערך גבוה יותר, ה-AI ישקיע מאמץ רב יותר להפריד בין תלמידים שאמורים לשבת בנפרד.'}
                  {key === 'separateFrom' && 'קובע את עוצמת ההנחיה להרחיק פיזית תלמידים הזקוקים למרחב אישי רב יותר.'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced AI */}
        <div className="glass-card p-8 rounded-[3rem] space-y-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-brand-500" />
            <h3 className="text-lg font-black text-slate-800">הגדרות AI מתקדמות</h3>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-black text-slate-500 uppercase">
                <span>תעדוף: חברתי vs מרחבי</span>
                <span className="text-brand-600">
                  {aiWeights.socialWeight > 5 ? 'יותר חברתי' : aiWeights.socialWeight < 5 ? 'יותר מרחבי' : 'מאוזן'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400">מרחבי</span>
                <input 
                  type="range" min="0" max="10" value={aiWeights.socialWeight} 
                  onChange={(e) => {
                    const social = parseInt(e.target.value);
                    setAiWeights((prev: any) => ({ ...prev, socialWeight: social, spatialWeight: 10 - social }));
                  }}
                  className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-brand-500"
                />
                <span className="text-[10px] font-bold text-slate-400">חברתי</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">כוונון המשקל היחסי בין צרכים מרחביים (מיקום בכיתה, שורות קדמיות לתלמידים נמוכים) לבין צרכים חברתיים (קרבה לחברים והתרחקות מחיכוכים).</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">פרומפט מערכת (AI System Prompt)</label>
              <textarea 
                value={aiWeights.customSystemPrompt}
                onChange={(e) => setAiWeights((prev: any) => ({ ...prev, customSystemPrompt: e.target.value }))}
                placeholder="הזן הוראות מיוחדות ל-AI..."
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-medium text-slate-800 dark:text-slate-200 focus:border-brand-300 outline-none transition-all min-h-[100px] resize-none"
              />
            </div>
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
                onClick={() => setIsBulkUpdateOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-white text-brand-600 rounded-3xl text-sm font-black shadow-lg border-2 border-brand-100 hover:bg-brand-50 transition-all active:scale-95"
              >
                <Edit3 className="w-5 h-5 text-brand-600" />
                עדכון מרובה
              </button>

              <div className="w-px h-10 bg-slate-200 mx-2 hidden md:block" />

              <button 
                onClick={() => setIsAddStudentOpen(true)}
                className="flex items-center gap-3 px-10 py-5 bg-brand-600 text-white rounded-3xl text-base font-bold shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-1 active:translate-y-0"
              >
                <UserPlus className="w-6 h-6" />
                הוספת תלמיד
              </button>
            </div>
          </div>

          {isAddStudentOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl w-full max-w-md space-y-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">הוספת תלמיד חדש</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">שם מלא</label>
                    <input 
                      type="text" 
                      value={newStudent.name}
                      onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="הזן שם..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">גובה תלמיד</label>
                    <select 
                      value={newStudent.height}
                      onChange={e => setNewStudent({...newStudent, height: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand-500"
                    >
                      <option value="short">נמוך - קדמת הכיתה</option>
                      <option value="average">ממוצע - כל מקום</option>
                      <option value="tall">גבוה - אחורי הכיתה</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      if (newStudent.name.trim()) {
                        updateCurrentConfig((prev: any) => ({
                          ...prev,
                          students: [...prev.students, { id: Date.now().toString(), name: newStudent.name.trim(), preferred: [], forbidden: [], height: newStudent.height, groups: [], interestLevel: 'medium', supportNeeded: 'none', tags: [], environmentPreferences: [] }]
                        }));
                        setNotifications((prev: any) => [{id: Date.now(), text: 'התלמיד נוסף בהצלחה', type: 'success'}, ...prev]);
                        setNewStudent({ name: '', height: 'average' });
                        setIsAddStudentOpen(false);
                      }
                    }}
                    className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors"
                  >
                    הוסף תלמיד
                  </button>
                  <button 
                    onClick={() => setIsAddStudentOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teacher Profile Modal */}
          {isTeacherModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl w-full max-w-lg space-y-8 border-2 border-brand-100 dark:border-brand-900"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-3xl flex items-center justify-center text-brand-600">
                    <UserCircle2 className="w-10 h-10" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">פרופיל אישי</h3>
                    <p className="text-slate-500 font-bold">ערוך את פרטי המורה ופרטי הכיתה</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest text-right">שם המורה</label>
                    <input 
                      type="text" 
                      value={teacherProfile.name}
                      onChange={e => setTeacherProfile({...teacherProfile, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-brand-500 font-bold transition-all text-right"
                      placeholder="מה שמך?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest text-right">תפקיד / כיתה / מקצוע</label>
                    <input 
                      type="text" 
                      value={teacherProfile.role}
                      onChange={e => setTeacherProfile({...teacherProfile, role: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-brand-500 font-bold transition-all text-right"
                      placeholder="למשל: מחנך כיתה י' 1 / מתמטיקה"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest text-right">שם בית ספר</label>
                    <input 
                      type="text" 
                      value={teacherProfile.school}
                      onChange={e => setTeacherProfile({...teacherProfile, school: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-brand-500 font-bold transition-all text-right"
                      placeholder="הזן את שם בית הספר"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsTeacherModalOpen(false)}
                    className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-1 active:translate-y-0"
                  >
                    שמור שינויים
                  </button>
                  <button 
                    onClick={() => setIsTeacherModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold"
                  >
                    ביטול
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {currentConfig.students.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="חיפוש תלמידים לפי שם..."
                   className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-none transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-black text-slate-500 uppercase">מיון לפי:</span>
                  <select 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="newest">תאריך הוספה (חדש קודם)</option>
                    <option value="oldest">תאריך הוספה (ישן קודם)</option>
                    <option value="name">א"ב</option>
                  </select>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500 uppercase">קבוצה:</span>
                  <select 
                    value={filterGroup} 
                    onChange={e => setFilterGroup(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">כל הקבוצות</option>
                    {currentConfig.groups?.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                    <option value="none">ללא קבוצה</option>
                  </select>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500 uppercase">העדפת ישיבה:</span>
                  <select 
                    value={filterHeight} 
                    onChange={e => setFilterHeight(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">הכל</option>
                    <option value="short">קדמי</option>
                    <option value="medium">בינוני</option>
                    <option value="tall">אחורי</option>
                  </select>
                </div>
              </div>
            </div>
          )}

              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                (currentConfig.students.length === 0 || filteredStudents.length === 0) && "md:col-span-1 md:flex md:justify-center"
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
                ) : filteredStudents.length === 0 ? (
                   <div className="md:col-span-2 lg:col-span-3 w-full mt-8">
                     <EmptyState 
                       icon={<Search className="w-12 h-12" />}
                       title="לא נמצאו תלמידים"
                       description="לא נמצאו תלמידים התואמים את אפשרויות הסינון והחיפוש."
                     />
                   </div>
                ) : (
                  filteredStudents.map((student: any, idx: number) => (
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
                      onEdit={() => {
                        setSelectedStudentId(student.id);
                        setViewType('studentDetail');
                      }}
                      onDelete={() => setStudentToDelete(student)}
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

        {/* Save & Load Configurations */}
        <div className="md:col-span-2 glass-card p-10 rounded-[3rem] space-y-6 bg-white/40 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
             <Save className="w-8 h-8 text-brand-500" />
             <h3 className="text-2xl font-black text-slate-800">שמירה וטעינה לדפדפן (Local Storage)</h3>
          </div>
          <p className="text-slate-500 font-medium mb-6">שמרו מספר גרסאות של הכיתה וטענו אותן מאוחר יותר ישירות מהדפדפן.</p>
          <div className="flex flex-wrap gap-4">
             <button
               onClick={() => {
                 const name = prompt("הזן שם עבור שמירת תצורה זו:");
                 if(name) {
                    const saved = JSON.parse(localStorage.getItem('classManager_savedConfigs') || '{}');
                    saved[name] = currentConfig;
                    localStorage.setItem('classManager_savedConfigs', JSON.stringify(saved));
                    setNotifications((prev:any) => [{id: Date.now(), text: `התצורה "${name}" נשמרה בהצלחה`, type: 'success'}, ...prev]);
                 }
               }}
               className="flex items-center gap-2 px-6 py-4 bg-brand-50 hover:bg-brand-100 text-brand-700 font-black rounded-2xl transition-colors border border-brand-200"
             >
               <Save className="w-5 h-5" />
               שמור תצורה נוכחית
             </button>
             <button
               onClick={() => {
                 const saved = JSON.parse(localStorage.getItem('classManager_savedConfigs') || '{}');
                 const names = Object.keys(saved);
                 if(names.length === 0) {
                    alert('אין תצורות שמורות בזיכרון הדפדפן.');
                    return;
                 }
                 const name = prompt("הזן שם תצורה לטעינה:\n" + names.join("\n"));
                 if(name && saved[name]) {
                    updateCurrentConfig(() => saved[name]);
                    setNotifications((prev:any) => [{id: Date.now(), text: `התצורה "${name}" נטענה בהצלחה`, type: 'success'}, ...prev]);
                 } else if (name) {
                    alert('לא נמצאה תצורה בשם זה.');
                 }
               }}
               className="flex items-center gap-2 px-6 py-4 bg-white hover:bg-slate-50 text-slate-700 font-black rounded-2xl transition-colors border border-slate-200 shadow-sm"
             >
               <Download className="w-5 h-5" />
               טען תצורה שמורה
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
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setStudentToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 mx-4"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">מחיקת תלמיד</h3>
              <p className="text-center text-slate-500 mb-8 font-medium">האם אתם בטוחים שברצונכם למחוק את {studentToDelete.name}? פעולה זו תוציא את התלמיד גם ממפת ההושבה ולא ניתנת לביטול.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setStudentToDelete(null)}
                  className="flex-1 px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button 
                  onClick={() => {
                    updateCurrentConfig((prev: any) => ({ 
                      ...prev, 
                      students: prev.students.filter((s:any) => s.id !== studentToDelete.id),
                      grid: prev.grid.map((id: string | null) => id === studentToDelete.id ? null : id)
                    }));
                    setNotifications((prev: any) => [{ id: Date.now(), text: `התלמיד ${studentToDelete.name} נמחק`, type: 'info' }, ...prev]);
                    setStudentToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-lg shadow-rose-200"
                >
                  כן, מחק
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


// --- Main App Component ---

const ExamsView = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack}
          className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center justify-between flex-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">מבחנים אינטראקטיביים</h2>
          <Badge className="bg-brand-600 text-white border-brand-700 px-4 py-2 text-sm shadow-md">חדש!</Badge>
        </div>
      </div>
      
      <div className="glass-card p-12 rounded-[4rem] text-center bg-white border border-slate-200 max-w-4xl mx-auto dark:bg-slate-900 dark:border-slate-800 shadow-xl">
        <FileText className="w-20 h-20 text-brand-500 mx-auto mb-6" />
        <h3 className="text-3xl font-black mb-4 dark:text-white">בניית מבחנים חכמה</h3>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
          מערכת חדשנית המאפשרת יצירת מבחנים באמצעות בינה מלאכותית, בדיקה אוטומטית של תשובות, והזנה ישירה של ציונים לכרטיסי התלמידים.
        </p>
        <div className="flex justify-center gap-4">
           <button className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg hover:bg-brand-700 hover:-translate-y-1 transition-all">
             צור מבחן חדש באמצעות AI
           </button>
           <button className="px-8 py-4 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 hover:-translate-y-1 transition-all">
             מאגר מבחנים (בקרוב)
           </button>
        </div>
      </div>
    </div>
  );
};

const CampaignsView = ({ students, campaigns = [], updateCurrentConfig, onBack, setViewType }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    targetGoal: 10,
    unit: 'נקודות',
    type: 'individual' as 'individual' | 'class',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const addCampaign = () => {
    if (!newCampaign.title) return;
    const campaign = {
      ...newCampaign,
      id: `camp-${Date.now()}`,
      status: 'active',
      progress: {}
    };
    updateCurrentConfig((prev: any) => ({
      ...prev,
      campaigns: [...(prev.campaigns || []), campaign]
    }));
    setIsAdding(false);
  };

  const updateProgress = (campaignId: string, studentId: string, val: number) => {
    updateCurrentConfig((prev: any) => {
      const oldVal = prev.campaigns?.find((c: any) => c.id === campaignId)?.progress?.[studentId] || 0;
      const diff = val - oldVal;
      
      const newCampaigns = (prev.campaigns || []).map((c: any) => 
        c.id === campaignId ? { ...c, progress: { ...c.progress, [studentId]: val } } : c
      );
      
      const newPoints = { ...(prev.student_points || {}) };
      newPoints[studentId] = (newPoints[studentId] || 0) + diff;

      // Log to analytics
      const newLog = [...(prev.analytics_log || []), {
        type: 'points',
        studentId,
        campaignId,
        value: diff,
        timestamp: Date.now()
      }].slice(-1000); // Keep last 1000 entries
      
      return { ...prev, campaigns: newCampaigns, student_points: newPoints, analytics_log: newLog };
    });
  };

  return (
     <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
             <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ניהול מבצעים כיתתיים</h2>
             <p className="text-slate-500 font-medium">יצירת אתגרים, מוקדי עניין ותמריצים כיתתיים למינוף הפדגוגיה.</p>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={() => setViewType('campaign-display')}
               className="px-6 py-4 bg-white border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
             >
               <Monitor className="w-5 h-5 text-brand-600" />
               מסך הקרנה
             </button>
             <button 
               onClick={() => setIsAdding(true)}
               className="px-6 py-4 bg-brand-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-700 transition-all shadow-lg active:scale-95"
             >
               <Plus className="w-5 h-5" />
               מבצע חדש
             </button>
          </div>
        </div>

        {isAdding && (
           <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-xl space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <h3 className="text-2xl font-black dark:text-white">פרקטיקה חדשה לכיתה</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">שם המבצע</label>
                    <input 
                      type="text" 
                      value={newCampaign.title} 
                      onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                      placeholder="למשל: תולעת ספרים, אלוף הניקיון..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">סוג המבצע</label>
                    <select 
                      value={newCampaign.type}
                      onChange={e => setNewCampaign({...newCampaign, type: e.target.value as any})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                       <option value="individual">אישי (כל תלמיד לעצמו)</option>
                       <option value="class">כיתתי (כולם יחד ליעד)</option>
                    </select>
                 </div>
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">תיאור והוראות</label>
                    <textarea 
                      value={newCampaign.description} 
                      onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-medium focus:ring-2 focus:ring-brand-500 outline-none h-24 custom-scrollbar"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">יעד סיום (מספרי)</label>
                    <input 
                      type="number" 
                      value={newCampaign.targetGoal} 
                      onChange={e => setNewCampaign({...newCampaign, targetGoal: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">יחידת מידה</label>
                    <input 
                      type="text" 
                      value={newCampaign.unit} 
                      onChange={e => setNewCampaign({...newCampaign, unit: e.target.value})}
                      placeholder="כוכבים, נקודות, דפים..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                 </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                 <button onClick={() => setIsAdding(false)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold">ביטול</button>
                 <button onClick={addCampaign} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200">הפעלה</button>
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 gap-8">
           {campaigns.length === 0 && !isAdding && (
             <div className="py-20 text-center space-y-6">
                <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto text-brand-600">
                   <Target className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-slate-800 dark:text-white">אין מבצעים פעילים</h3>
                   <p className="text-slate-500 max-w-sm mx-auto">זה הזמן ליזום אתגר חדש לכיתה ולראות את המוטיבציה עולה!</p>
                </div>
             </div>
           )}

           {campaigns.map((c: any) => (
              <div key={c.id} className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50/50 dark:bg-brand-900/10 rounded-bl-[5rem] -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                 
                 <div className="flex flex-col md:flex-row gap-10 relative z-10">
                    <div className="flex-1 space-y-6">
                       <div className="space-y-2">
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                <Trophy className="w-6 h-6" />
                             </div>
                             <div>
                                <h3 className="text-2xl font-black dark:text-white">{c.title}</h3>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", c.type === 'class' ? "text-indigo-600":"text-emerald-600")}>
                                   {c.type === 'class' ? 'מבצע כיתתי משותף' : 'מבצע אישי תחרותי'}
                                </span>
                             </div>
                          </div>
                          <p className="text-slate-500 font-medium leading-relaxed">{c.description}</p>
                       </div>

                       {c.type === 'class' ? (
                          <div className="space-y-4">
                             <div className="flex justify-between items-end">
                                <span className="text-sm font-black text-slate-800 dark:text-white">התקדמות כיתתית כוללת</span>
                                <span className="text-sm font-display font-black text-brand-600">
                                   {Object.values(c.progress || {}).reduce((a: any, b: any) => a + (b as number), 0) as number} / {c.targetGoal} {c.unit}
                                </span>
                             </div>
                             <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, ((Object.values(c.progress || {}).reduce((a: any, b: any) => a + (b as number), 0) as number) / c.targetGoal) * 100)}%` }}
                                  className="h-full bg-brand-600 shadow-sm"
                                />
                             </div>
                          </div>
                       ) : (
                          <div className="space-y-4">
                             <h4 className="text-sm font-black text-slate-800 dark:text-white">מובילים במבצע:</h4>
                             <div className="flex flex-wrap gap-3">
                                {students.slice(0, 5).map((s: any) => {
                                   const prog = c.progress?.[s.id] || 0;
                                   const percent = Math.min(100, (prog / c.targetGoal) * 100);
                                   return (
                                      <div key={s.id} className="bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-32 flex flex-col gap-1">
                                         <span className="text-xs font-bold truncate">{s.name}</span>
                                         <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-brand-600">{prog} {c.unit}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{Math.round(percent)}%</span>
                                         </div>
                                      </div>
                                   );
                                })}
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="w-full md:w-80 space-y-6">
                       <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">עדכון ידני של נקודות</h4>
                       <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                          {students.slice().sort((a: any, b: any) => a.name.localeCompare(b.name, 'he')).map((s: any) => (
                             <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <span className="text-sm font-bold truncate pr-2">{s.name}</span>
                                <div className="flex items-center gap-2">
                                   <button 
                                      onClick={() => updateProgress(c.id, s.id, Math.max(0, (c.progress?.[s.id] || 0) - 1))}
                                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-colors"
                                   >-</button>
                                   <span className="w-10 text-center font-display font-black text-brand-600">{c.progress?.[s.id] || 0}</span>
                                   <button 
                                      onClick={() => updateProgress(c.id, s.id, (c.progress?.[s.id] || 0) + 1)}
                                      className="w-8 h-8 rounded-lg bg-brand-600 text-white shadow-sm flex items-center justify-center transition-transform active:scale-95"
                                   >+</button>
                                </div>
                             </div>
                          ))}
                       </div>
                       <button 
                          onClick={() => {
                             updateCurrentConfig((prev: any) => ({
                                ...prev,
                                campaigns: prev.campaigns.filter((camp: any) => camp.id !== c.id)
                             }));
                          }}
                          className="w-full py-3 text-rose-500 font-bold text-sm bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 transition-colors"
                       >סיום ומחיקה</button>
                    </div>
                 </div>
              </div>
           ))}
        </div>
     </div>
  );
};

const CampaignDisplayView = ({ campaigns = [], students = [], onBack }: any) => {
   const activeCamps = (campaigns || []).filter((c: any) => c.status === 'active');

   return (
      <div className="fixed inset-0 z-[500] bg-slate-900 flex flex-col items-center justify-center p-12 overflow-hidden rtl" dir="rtl">
         <button 
           onClick={onBack}
           className="absolute top-8 right-8 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all z-10"
         >
           <X className="w-8 h-8" />
         </button>

         <div className="max-w-7xl w-full h-full flex flex-col gap-12">
            <div className="text-center space-y-4">
               <h2 className="text-6xl font-black text-white tracking-widest uppercase">לוח הישגים כיתתי</h2>
               <div className="h-1 w-40 bg-brand-500 mx-auto rounded-full" />
            </div>

            {activeCamps.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-white/30 space-y-6">
                  <Monitor className="w-32 h-32" />
                  <p className="text-3xl font-bold uppercase tracking-widest">ממתין להפעלת מבצע...</p>
               </div>
            ) : (
               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 overflow-y-auto p-4 custom-scrollbar">
                  {activeCamps.map((c: any) => (
                     <div key={c.id} className="bg-white/5 border-4 border-white/10 rounded-[4rem] p-12 flex flex-col gap-8 relative overflow-hidden backdrop-blur-xl">
                        <div className="flex items-center gap-6">
                           <div className="w-24 h-24 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/20">
                              <Trophy className="w-12 h-12 text-white" />
                           </div>
                           <div className="space-y-1">
                              <h3 className="text-5xl font-black text-white">{c.title}</h3>
                              <p className="text-2xl text-white/50 font-medium">{c.unit} של הצלחה</p>
                           </div>
                        </div>

                        {c.type === 'class' ? (
                           <div className="space-y-10 flex-1 flex flex-col justify-center">
                              <div className="space-y-6">
                                 <div className="flex justify-between items-end text-white">
                                    <span className="text-4xl font-black">התקדמות משותפת</span>
                                    <span className="text-4xl font-display font-black text-brand-500">
                                       {Object.values(c.progress || {}).reduce((a: any, b: any) => a + (b as number), 0) as number} / {c.targetGoal}
                                    </span>
                                 </div>
                                 <div className="h-16 bg-white/10 rounded-3xl overflow-hidden p-2 border-2 border-white/5">
                                    <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${Math.min(100, ((Object.values(c.progress || {}).reduce((a: any, b: any) => a + (b as number), 0) as number) / c.targetGoal) * 100)}%` }}
                                       className="h-full bg-brand-600 rounded-2xl shadow-[0_0_50px_rgba(37,99,235,0.4)] relative"
                                    >
                                       <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                    </motion.div>
                                 </div>
                              </div>
                              <p className="text-2xl text-center text-white/80 font-bold leading-relaxed bg-white/5 p-8 rounded-3xl border border-white/10">
                                 {c.description}
                              </p>
                           </div>
                        ) : (
                           <div className="space-y-8 flex-1">
                              <div className="grid grid-cols-1 gap-4">
                                 {Object.entries(c.progress || {})
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .slice(0, 8)
                                    .map(([sId, val]: [string, any], idx) => {
                                       const student = students.find((s:any)=>s.id===sId);
                                       return (
                                          <div key={sId} className="flex items-center gap-6 bg-white/5 p-5 rounded-[2rem] border border-white/5">
                                             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-black text-2xl text-white">
                                                {idx + 1}
                                             </div>
                                             <div className="flex-1">
                                                <div className="flex justify-between items-center mb-2">
                                                   <span className="text-2xl font-black text-white">{student?.name || `תלמיד #${sId}`}</span>
                                                   <span className="text-2xl font-display font-black text-brand-500">{val}</span>
                                                </div>
                                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                                   <motion.div 
                                                      initial={{ width: 0 }}
                                                      animate={{ width: `${Math.min(100, ((val as number) / c.targetGoal) * 100)}%` }}
                                                      className="h-full bg-brand-600"
                                                   />
                                                </div>
                                             </div>
                                          </div>
                                       );
                                    })
                                 }
                              </div>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
   );
};

const RewardsView = ({ rewards = [], student_points = {}, updateCurrentConfig, onBack }: any) => {
  const buyReward = (rewardId: string, studentId: string) => {
    updateCurrentConfig((prev: any) => {
      const reward = prev.rewards.find((r: any) => r.id === rewardId);
      const points = prev.student_points[studentId] || 0;
      
      if (!reward || points < reward.price || reward.stock <= 0) return prev;
      
      const newPoints = { ...prev.student_points, [studentId]: points - reward.price };
      const newRewards = prev.rewards.map((r: any) => r.id === rewardId ? { ...r, stock: r.stock - 1 } : r);
      
      const studentInventory = [...(prev.student_rewards?.[studentId] || []), { ...reward, purchasedAt: Date.now() }];
      const newStudentRewards = { ...(prev.student_rewards || {}), [studentId]: studentInventory };
      
      return { ...prev, student_points: newPoints, rewards: newRewards, student_rewards: newStudentRewards };
    });
  };

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">חנות הפרסים הכיתתית</h2>
          <p className="text-slate-500 font-medium">המקום שבו המאמץ הופך למתנה. קנו פרסים בעזרת הנקודות שצברתם!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {(rewards || []).map((r: any) => (
          <div key={r.id} className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50/50 dark:bg-brand-900/10 rounded-bl-[4rem] flex items-center justify-center -mr-4 -mt-4">
               {r.icon === 'Clock' && <Clock className="w-8 h-8 text-brand-600" />}
               {r.icon === 'Zap' && <Zap className="w-8 h-8 text-brand-600" />}
               {r.icon === 'Map' && <Map className="w-8 h-8 text-brand-600" />}
               {r.icon === 'CheckCircle2' && <CheckCircle2 className="w-8 h-8 text-brand-600" />}
            </div>
            
            <div className="space-y-2 pr-12">
               <h3 className="text-2xl font-black dark:text-white">{r.title}</h3>
               <div className="flex items-center gap-2">
                  <Badge className="bg-brand-600 text-white font-display">{r.price} נקודות</Badge>
                  <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500">נותרו {r.stock}</Badge>
               </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <div className="space-y-4">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">בחרו תלמיד למימוש:</p>
               <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-wrap gap-2">
                  {Object.entries(student_points).filter(([, p]) => (p as number) >= r.price).map(([sId, p]) => (
                    <button 
                      key={sId}
                      onClick={() => buyReward(r.id, sId)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-600 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors"
                    >
                      {sId} ({p})
                    </button>
                  ))}
               </div>
               {Object.values(student_points).every((p: any) => p < r.price) && (
                 <p className="text-xs text-slate-400 italic font-medium p-4 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl">טרם נצברו מספיק נקודות על ידי אף תלמיד.</p>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaderboardView = ({ students = [], student_points = {}, onBack }: any) => {
  const sorted = [...students].sort((a, b) => (student_points[b.id] || 0) - (student_points[a.id] || 0));

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="flex items-center gap-6">
        <button onClick={onBack} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">טבלת ליגה והישגים</h2>
          <p className="text-slate-500 font-medium">דירוג התלמידים לפי צבירת נקודות והישיגים אישיים.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm">
         <div className="grid grid-cols-1 gap-4">
            {sorted.map((s, idx) => (
               <div key={s.id} className={cn(
                 "flex items-center justify-between p-6 rounded-3xl border-2 transition-all",
                 idx === 0 ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/50" : 
                 idx === 1 ? "bg-slate-50 border-slate-200 dark:bg-slate-800/50" :
                 idx === 2 ? "bg-orange-50 border-orange-200 dark:bg-orange-900/10" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
               )}>
                  <div className="flex items-center gap-6">
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm",
                       idx === 0 ? "bg-amber-400 text-white" :
                       idx === 1 ? "bg-slate-300 text-slate-600" :
                       idx === 2 ? "bg-orange-400 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                     )}>
                        {idx + 1}
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-slate-600 text-xl">
                           {s.name[0]}
                        </div>
                        <div>
                           <h4 className="text-xl font-black text-slate-800 dark:text-white">{s.name}</h4>
                           <p className="text-xs font-bold text-slate-400">נקודות מצטברות: {student_points[s.id] || 0}</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-8">
                     <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">נקודות</p>
                        <p className="text-3xl font-display font-black text-brand-600">{student_points[s.id] || 0}</p>
                     </div>
                     <div className="flex gap-1">
                        {[1,2,3].map(i => <Star key={i} className={cn("w-5 h-5", i <= (idx === 0 ? 3 : idx === 1 ? 2 : 1) ? "text-amber-400 fill-amber-400" : "text-slate-200")} />)}
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const AnalyticsDashboardView = ({ currentConfig, onBack }: { currentConfig: any, onBack: () => void }) => {
  const { analytics_log = [], students = [], groups = [] } = currentConfig;

  const pointsTimeline = useMemo(() => {
    const entries: Record<string, number> = {};
    (analytics_log || []).filter((l: any) => l.type === 'points').forEach((l: any) => {
      const date = new Date(l.timestamp).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
      entries[date] = (entries[date] || 0) + l.value;
    });
    return Object.entries(entries).map(([date, val]) => ({ date, points: val })).slice(-10);
  }, [analytics_log]);

  const groupDistribution = useMemo(() => {
    return groups.map((g: any) => {
      const groupStudents = students.filter((s: any) => s.groups?.includes(g.id));
      const totalPoints = groupStudents.reduce((acc: number, s: any) => acc + (currentConfig.student_points?.[s.id] || 0), 0);
      return { name: g.name, value: totalPoints };
    }).filter((g: any) => g.value > 0);
  }, [groups, students, currentConfig.student_points]);

  const topStudents = useMemo(() => {
    return students.map((s: any) => ({
      name: s.name,
      points: currentConfig.student_points?.[s.id] || 0
    })).sort((a: any, b: any) => b.points - a.points).slice(0, 8);
  }, [students, currentConfig.student_points]);

  const rewardStats = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(currentConfig.student_rewards || {}).flat().forEach((r: any) => {
      counts[r.title] = (counts[r.title] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [currentConfig.student_rewards]);

  const COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="flex items-center gap-6">
        <button onClick={onBack} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">אנליטיקה ושיפור כיתתי</h2>
          <p className="text-slate-500 font-medium">מעקב אחר מגמות למידה, התנהגות והישגים בזמן אמת.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">סה"כ נקודות כיתתיות</p>
            <p className="text-3xl font-black text-brand-600">{Object.values(currentConfig.student_points || {}).reduce((a:any,b:any)=>a+(b as number),0) as number}</p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">פרסים שנרכשו</p>
            <p className="text-3xl font-black text-indigo-600">{Object.values(currentConfig.student_rewards || {}).flat().length}</p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">פעולות AI החודש</p>
            <p className="text-3xl font-black text-emerald-600">42</p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">שיעור נוכחות ממוצע</p>
            <p className="text-3xl font-black text-rose-600">94%</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm space-y-6">
            <h3 className="text-xl font-black dark:text-white">מגמת צבירת נקודות</h3>
            <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pointsTimeline}>
                     <defs>
                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#2563eb', fontWeight: 900 }}
                     />
                     <Area type="monotone" dataKey="points" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorPoints)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm space-y-6">
            <h3 className="text-xl font-black dark:text-white">שיאו של המאמץ הקבוצתי</h3>
            <div className="h-80 w-full flex items-center">
               <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                     <Pie
                        data={groupDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {groupDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </RechartsPieChart>
               </ResponsiveContainer>
               <div className="w-1/3 flex flex-col gap-2">
                  {groupDistribution.map((g, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                       <span className="text-xs font-bold dark:text-white">{g.name}: {g.value}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm space-y-6">
            <h3 className="text-xl font-black dark:text-white">דירוג עשרת המצטיינים</h3>
            <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStudents} layout="vertical" margin={{ left: 40 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#1e293b' }} />
                     <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                     />
                     <Bar dataKey="points" fill="#2563eb" radius={[0, 10, 10, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm space-y-6">
            <h3 className="text-xl font-black dark:text-white">פופולריות פרסים</h3>
            <div className="space-y-4">
               {rewardStats.map((r, idx) => {
                 const max = rewardStats[0].count;
                 const percent = (r.count / max) * 100;
                 return (
                   <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-end">
                         <span className="font-bold text-sm dark:text-white">{r.name}</span>
                         <span className="text-xs font-black text-slate-400">{r.count} מימושים</span>
                      </div>
                      <div className="h-3 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${percent}%` }}
                           className="h-full bg-indigo-500"
                         />
                      </div>
                   </div>
                 );
               })}
               {rewardStats.length === 0 && <p className="py-20 text-center text-slate-400 italic">טרם נרכשו פרסים</p>}
            </div>
         </div>
      </div>
    </div>
  );
};

const BehaviorLogView = ({ currentConfig, updateCurrentConfig, onBack }: any) => {
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  
  const categories = [
    { id: 'excellence', label: 'הצטיינות', icon: '🌟', color: 'bg-amber-500' },
    { id: 'good_learning', label: 'למידה טובה', icon: '📚', color: 'bg-emerald-500' },
    { id: 'correct_seating', label: 'ישיבה נכונה', icon: '🪑', color: 'bg-blue-500' },
    { id: 'success_campaign', label: 'הצלחה במבצע', icon: '🎯', color: 'bg-indigo-500' },
    { id: 'disruption', label: 'הפרעה', icon: '📢', color: 'bg-orange-500' },
    { id: 'bad_learning', label: 'חוסר למידה', icon: '📝', color: 'bg-rose-500' },
    { id: 'violence', label: 'אלימות', icon: '🚫', color: 'bg-red-600' },
    { id: 'missing_task', label: 'אי ביצוע משימה', icon: '❌', color: 'bg-slate-500' },
  ];

  const logs = useMemo(() => {
    let filtered = (currentConfig.analytics_log || []).filter((l: any) => l.type === 'behavior' || l.categoryId);
    
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    if (timeFilter === 'daily') {
      filtered = filtered.filter((l: any) => now - l.timestamp < day);
    } else if (timeFilter === 'weekly') {
      filtered = filtered.filter((l: any) => now - l.timestamp < day * 7);
    } else if (timeFilter === 'monthly') {
      filtered = filtered.filter((l: any) => now - l.timestamp < day * 30);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((l: any) => l.categoryId === selectedCategory);
    }

    return filtered.sort((a: any, b: any) => b.timestamp - a.timestamp);
  }, [currentConfig.analytics_log, timeFilter, selectedCategory]);

  return (
    <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white">יומן התנהגות כיתתי</h2>
              <p className="text-slate-500 font-medium">תיעוד ומעקב יומיומי אחר הישגי והתנהגות התלמידים.</p>
            </div>
          </div>
          
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shadow-indigo-100/50">
             {(['daily', 'weekly', 'monthly'] as const).map(t => (
               <button
                 key={t}
                 onClick={() => setTimeFilter(t)}
                 className={cn(
                   "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                   timeFilter === t ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                 )}
               >
                 {t === 'daily' ? 'יומי' : t === 'weekly' ? 'שבועי' : 'חודשי'}
               </button>
             ))}
          </div>
       </div>

       <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar no-scrollbar flex-nowrap">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={cn(
               "px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all border-2",
               selectedCategory === 'all' ? "bg-white border-brand-500 text-brand-600 shadow-lg shadow-brand-100" : "bg-white border-slate-100 text-slate-400"
            )}
          >
            הכל
          </button>
          {categories.map(c => (
             <button
               key={c.id}
               onClick={() => setSelectedCategory(c.id)}
               className={cn(
                  "px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all border-2 flex items-center gap-2",
                  selectedCategory === c.id ? "bg-white border-brand-500 text-brand-600 shadow-lg shadow-brand-100" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
               )}
             >
               <span className="text-xl">{c.icon}</span>
               <span>{c.label}</span>
             </button>
          ))}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {logs.map((l: any, idx: number) => {
             const student = currentConfig.students.find((s: any) => s.id === l.studentId);
             const category = categories.find(c => c.id === l.categoryId);
             return (
               <motion.div 
                 key={idx}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col gap-4 group"
               >
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        {new Date(l.timestamp).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                     </span>
                     {category && (
                        <div className={cn("px-4 py-1 rounded-full text-[10px] font-black text-white shadow-sm", category.color)}>
                           {category.label}
                        </div>
                     )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-2xl shadow-inner font-black text-brand-600">
                        {student?.name?.charAt(0)}
                     </div>
                     <div className="flex-1">
                        <h4 className="font-black text-slate-800 dark:text-white">{student?.name || 'תלמיד'}</h4>
                        <p className="text-xs text-slate-400 font-medium leading-tight">{l.reason || category?.label}</p>
                     </div>
                  </div>

                  <div className="mt-2 pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                     <div className="flex items-center gap-1.5">
                        <div className={cn("w-2 h-2 rounded-full", (l.value || 0) >= 0 ? "bg-emerald-500" : "bg-rose-500")} />
                        <span className={cn("font-black text-lg", (l.value || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                           {(l.value || 0) >= 0 ? `+${l.value}` : l.value}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">נק'</span>
                     </div>
                     <button 
                       onClick={() => {
                         if (!confirm("בטוח שברצונך למחוק תיעוד זה?")) return;
                         updateCurrentConfig((prev: any) => ({
                           ...prev,
                           analytics_log: prev.analytics_log.filter((_: any, i: number) => i !== (prev.analytics_log.length - 1 - idx))
                         }));
                       }}
                       className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </motion.div>
             );
          })}
          {logs.length === 0 && (
            <div className="col-span-full py-40 text-center space-y-6">
               <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto shadow-inner grayscale opacity-50">📓</div>
               <div className="space-y-1">
                  <p className="text-xl font-black text-slate-400">אין תיעודים התואמים את הסינון</p>
                  <p className="text-sm text-slate-300">נסה לשנות את טווח הזמן או את הקטגוריה.</p>
               </div>
            </div>
          )}
       </div>
    </div>
  );
};

const FurnitureManager = ({ furniture = [], updateCurrentConfig, onClose }: any) => {
  const [newFurniture, setNewFurniture] = useState({ type: 'cabinet', x: 100, y: 100, width: 100, height: 100, rotation: 0 });

  const addFurniture = () => {
    const item = { ...newFurniture, id: `f-${Date.now()}` };
    updateCurrentConfig((prev: any) => ({ ...prev, furniture: [...(prev.furniture || []), item] }));
  };

  const removeFurniture = (id: string) => {
    updateCurrentConfig((prev: any) => ({ ...prev, furniture: (prev.furniture || []).filter((f: any) => f.id !== id) }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-8 left-8 p-3 hover:bg-slate-100 rounded-2xl transition-all">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="mb-8">
           <h2 className="text-3xl font-black dark:text-white">עיצוב וריהוט הכיתה</h2>
           <p className="text-slate-500 font-medium">הוסיפו אלמנטים נוספים למפה כדי לדמות את המציאות בצורה הטובה ביותר.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-6 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold dark:text-white">הוספת רכיב חדש</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">סוג</label>
                    <select value={newFurniture.type} onChange={e => setNewFurniture({...newFurniture, type: e.target.value})} className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 font-bold border-2 border-slate-100 dark:border-slate-700">
                       <option value="cabinet">ארון</option>
                       <option value="plant">עציץ</option>
                       <option value="table">שולחן עבודה</option>
                       <option value="sofa">ספה / פוף</option>
                       <option value="rug">שטיח</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">רוחב (px)</label>
                    <input type="number" value={newFurniture.width} onChange={e => setNewFurniture({...newFurniture, width: parseInt(e.target.value)})} className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 font-bold border-2 border-slate-100 dark:border-slate-700" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">גובה (px)</label>
                    <input type="number" value={newFurniture.height} onChange={e => setNewFurniture({...newFurniture, height: parseInt(e.target.value)})} className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 font-bold border-2 border-slate-100 dark:border-slate-700" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">סיבוב (מעלות)</label>
                    <input type="number" value={newFurniture.rotation} onChange={e => setNewFurniture({...newFurniture, rotation: parseInt(e.target.value)})} className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 font-bold border-2 border-slate-100 dark:border-slate-700" />
                 </div>
              </div>
              <button 
                onClick={addFurniture}
                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                הוסף רהיט למפה
              </button>
           </div>

           <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              <h3 className="text-xl font-bold dark:text-white px-1">רשימת רהיטים ({furniture.length})</h3>
              {furniture.map((f: any) => (
                 <div key={f.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                          {f.type === 'board' ? <Monitor className="w-5 h-5" /> : 
                           f.type === 'plant' ? <Heart className="w-5 h-5 text-emerald-500" /> : <Box className="w-5 h-5" />}
                       </div>
                       <div>
                          <p className="font-bold dark:text-white">{f.type === 'cabinet' ? 'ארון' : f.type === 'plant' ? 'עציץ' : f.type === 'rug' ? 'שטיח' : f.type === 'board' ? 'לוח' : f.type}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{f.width}x{f.height} // {f.x},{f.y}</p>
                       </div>
                    </div>
                    <button onClick={() => removeFurniture(f.id)} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-lg transition-all">
                       <TrashIcon className="w-5 h-5" />
                    </button>
                 </div>
              ))}
              {furniture.length === 0 && <div className="py-20 text-center opacity-30 font-bold uppercase tracking-widest">אין רהיטים נוספים</div>}
           </div>
        </div>
      </motion.div>
    </div>
  );
};

const FurnitureItem = ({ item, is3DView, updateCurrentConfig }: any) => {
  const isDragging = useRef(false);

  return (
    <motion.div
      drag={!is3DView}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        updateCurrentConfig((prev: any) => ({
          ...prev,
          furniture: prev.furniture.map((f: any) => f.id === item.id ? { ...f, x: f.x + info.offset.x, y: f.y + info.offset.y } : f)
        }));
      }}
      className={cn(
        "absolute cursor-move select-none z-[5]",
        is3DView && "pointer-events-none"
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `rotate(${item.rotation}deg)`,
        transformStyle: 'preserve-3d'
      }}
    >
      <div className={cn(
        "w-full h-full relative transition-all",
        item.type === 'board' ? "bg-slate-800 border-x-4 border-slate-700" :
        item.type === 'cabinet' ? "bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-800 rounded-lg" :
        item.type === 'plant' ? "flex items-center justify-center" :
        item.type === 'rug' ? "bg-indigo-50 dark:bg-indigo-900/10 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-[3rem] opacity-40" :
        "bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg shadow-sm"
      )}>
        {item.type === 'plant' && <div className="w-full h-full bg-emerald-500 rounded-full blur-xl opacity-20" />}
        {item.type === 'plant' && <Heart className="w-1/2 h-1/2 text-emerald-600 absolute animate-pulse" />}
        {item.type === 'board' && <div className="absolute inset-0 flex items-center justify-center text-white/5 opacity-5 font-black text-4xl">לוח</div>}
        
        {is3DView && (
           <>
              <div 
                className="absolute inset-x-0 bottom-0 h-[80px] bg-inherit border-inherit opacity-70"
                style={{ transform: 'rotateX(-90deg)', transformOrigin: 'bottom' }}
              />
              <div 
                className="absolute inset-y-0 right-0 w-[80px] bg-inherit border-inherit opacity-60"
                style={{ transform: 'rotateY(90deg)', transformOrigin: 'right' }}
              />
           </>
        )}
      </div>
    </motion.div>
  );
};

const FloatingAIAssistant = ({ onCommand }: { onCommand: (text: string) => Promise<string> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'he-IL';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setIsOpen(true);
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSend = async (text: string = inputText) => {
    if (!text.trim()) return;
    setHistory(prev => [...prev, { role: 'user', text }]);
    setInputText("");
    setIsProcessing(true);
    
    try {
      const response = await onCommand(text);
      setHistory(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err: any) {
      setHistory(prev => [...prev, { role: 'assistant', text: "מצטער, הייתה שגיאה: " + err.message }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white dark:bg-slate-900 w-80 sm:w-96 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
            style={{ maxHeight: '60vh' }}
          >
            <div className="bg-brand-600 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-black">עוזר אישי AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-950">
              {history.length === 0 ? (
                <div className="text-center text-slate-400 font-medium text-sm mt-8">
                  אני כאן כדי לעזור! אפשר לבקש ממני להכניס ציונים, לתעד שיחות מפי הורים, או לעזור בניתוח נתונים.
                </div>
              ) : (
                history.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "max-w-[85%] rounded-2xl p-3 text-sm font-medium",
                    msg.role === 'user' ? "bg-brand-500 text-white mr-auto rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 ml-auto rounded-bl-sm shadow-sm"
                  )}>
                    {msg.text}
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm p-3 w-fit shadow-sm ml-auto flex gap-1">
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                </div>
              )}
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <button 
                onClick={toggleRecording}
                className={cn("p-2.5 rounded-full transition-all", isRecording ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-600")}
              >
                {isRecording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
              </button>
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="הקלד כאן בקשות חופשיות..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                className="p-2.5 bg-brand-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-brand-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all ring-4 ring-brand-100 dark:ring-brand-900"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    </div>
  );
};

const NameWheel = ({ students, isDarkMode }: { students: any[], isDarkMode: boolean }) => {
  const [spinning, setSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [lastSelected, setLastSelected] = useState<any>(null);

  const pickRandom = () => {
    if (spinning) return;
    if (!students || students.length === 0) return;
    setSpinning(true);
    setSelectedStudent(null);
    
    let count = 0;
    const maxCycles = 20;
    const interval = setInterval(() => {
      const random = students[Math.floor(Math.random() * students.length)];
      setLastSelected(random);
      count++;
      
      if (count > maxCycles) {
        clearInterval(interval);
        setSpinning(false);
        setSelectedStudent(random);
      }
    }, 100);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-10 w-full">
      <div className="relative w-64 h-64 flex items-center justify-center">
        <motion.div 
          animate={spinning ? { rotate: 360 * 5 } : { rotate: 0 }}
          transition={spinning ? { duration: 2, ease: "easeInOut" } : { duration: 0 }}
          className="absolute inset-0 rounded-full border-8 border-brand-500 border-t-transparent"
        />
        <div className="text-center z-10 px-4">
          {lastSelected ? (
            <motion.div
              key={lastSelected.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black text-slate-800 dark:text-white"
            >
              {lastSelected.name}
            </motion.div>
          ) : (
            <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">מוכן להגרלה</div>
          )}
        </div>
      </div>

      <button 
        onClick={pickRandom}
        disabled={spinning}
        className="px-12 py-4 bg-brand-600 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50"
      >
        {spinning ? 'מגריל...' : 'הגרל תלמיד!'}
      </button>

      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-8 bg-emerald-500 text-white rounded-[3rem] text-center shadow-2xl mt-4"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest mb-1 opacity-80">הנבחר/ת הוא/היא:</h3>
            <p className="text-5xl font-black">{selectedStudent.name}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditableText = ({ value, onSave, className, placeholder }: { value: string, onSave: (val: string) => void, className?: string, placeholder?: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  
  useEffect(() => {
    setTemp(value);
  }, [value]);

  if (isEditing) {
    return (
      <input 
        autoFocus
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onSave(temp); setIsEditing(false); }}
        onKeyDown={e => e.key === 'Enter' && (e.target as any).blur()}
        placeholder={placeholder}
        className={cn("bg-slate-100 dark:bg-slate-800 rounded px-1 outline-brand-500", className)}
      />
    );
  }
  
  return (
    <div className="flex items-center gap-2 group cursor-pointer inline-flex" onClick={() => setIsEditing(true)}>
       <span className={cn(className, !value && "text-slate-300 dark:text-slate-700 italic")}>{value || placeholder || 'לחץ לעריכה...'}</span>
       <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const ClassroomTimer = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [customMinutes, setCustomMinutes] = useState('');
  const [activityMode, setActivityMode] = useState<string>('');

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      clearInterval(interval);
      if (alertsEnabled) {
        try {
           const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
           const osc = ctx.createOscillator();
           const gainNode = ctx.createGain();
           osc.connect(gainNode);
           gainNode.connect(ctx.destination);
           osc.frequency.value = 587.33; // D5
           osc.type = "sine";
           gainNode.gain.setValueAtTime(0, ctx.currentTime);
           gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
           gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
           osc.start(ctx.currentTime);
           osc.stop(ctx.currentTime + 1.5);
        } catch(e) {
           console.error("Audio playback failed", e);
        }
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, alertsEnabled]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (mins: number, mode?: string) => {
    setInitialTime(mins * 60);
    setTimeLeft(mins * 60);
    setIsActive(true);
    if (mode) setActivityMode(mode);
    setCustomMinutes('');
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
  };

  return (
    <div className="flex flex-col items-center gap-10 py-10 w-full relative">
      <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full absolute top-0 left-0">
         <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">צליל סיום</span>
         <button 
           onClick={() => setAlertsEnabled(!alertsEnabled)}
           className={cn("w-10 h-5 rounded-full transition-colors relative shadow-inner", alertsEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}
         >
           <div className={cn("w-3 h-3 bg-white rounded-full absolute top-1 transition-all shadow", alertsEnabled ? "left-1" : "left-6")} />
         </button>
      </div>

      <div className="text-center space-y-4">
        {activityMode && (
          <div className="inline-block px-5 py-1.5 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full font-display font-bold text-sm tracking-wide border border-brand-100 dark:border-brand-800">
            {activityMode}
          </div>
        )}
        <div className={cn(
          "text-[8rem] md:text-[14rem] font-display font-black leading-none tracking-tighter tabular-nums drop-shadow-sm transition-all duration-1000",
          timeLeft < 60 && timeLeft > 0 ? "text-rose-500 animate-pulse" : "text-slate-800 dark:text-white"
        )}>
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={toggleTimer}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90",
              isActive ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-brand-600 hover:bg-brand-700 text-white"
            )}
          >
            {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          <button 
            onClick={resetTimer}
            className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all active:scale-90"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-4xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { m: 5, label: 'מעבר פעילות', mode: 'מעבר פעילות', icon: <ArrowRightLeft className="w-5 h-5" /> },
            { m: 15, label: 'זמן מיקוד', mode: 'זמן מיקוד', icon: <Brain className="w-5 h-5" /> },
            { m: 20, label: 'עבודה בקבוצות', mode: 'עבודה בקבוצות', icon: <Users className="w-5 h-5" /> },
            { m: 45, label: 'שיעור מלא', mode: 'שיעור', icon: <BookOpen className="w-5 h-5" /> },
          ].map(preset => (
            <button 
              key={preset.mode}
              onClick={() => startTimer(preset.m, preset.mode)}
              className="px-6 py-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-brand-500 hover:text-brand-600 active:scale-95 transition-all text-slate-700 dark:text-slate-300 shadow-sm relative overflow-hidden group"
            >
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-brand-50 transition-colors">
                 {preset.icon}
              </div>
              <div className="text-center">
                <span className="font-display font-bold text-sm block">{preset.label}</span>
                <span className="text-xs text-slate-400">{preset.m} דק׳</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 justify-center w-full max-w-md mx-auto p-2 bg-slate-100 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
          <input 
            type="number"
            min="1"
            max="120"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            disabled={isActive}
            className="w-full bg-transparent border-0 px-5 outline-none font-display font-bold text-lg text-right disabled:opacity-50"
            placeholder="דקות מותאמות..."
          />
          <button 
            onClick={() => {
              const m = parseInt(customMinutes);
              if (!isNaN(m) && m > 0) startTimer(m, 'התאמה אישית');
            }}
            disabled={isActive || !customMinutes}
            className="whitespace-nowrap px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all disabled:opacity-50"
          >
            הפעל
          </button>
        </div>
      </div>
    </div>
  );
};

const GroupGenerator = ({ students }: { students: any[] }) => {
  const [groupCount, setGroupCount] = useState(4);
  const [generatedGroups, setGeneratedGroups] = useState<{ id: string, name: string, members: any[] }[]>([]);

  const generate = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const groups: any[] = Array.from({ length: groupCount }, (_, i) => ({
      id: `group-${i}`,
      name: `קבוצה ${i + 1}`,
      members: []
    }));

    shuffled.forEach((s, i) => {
      groups[i % groupCount].members.push(s);
    });

    setGeneratedGroups(groups);
  };

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
        <div className="space-y-1 text-right">
          <h4 className="text-xl font-display font-bold text-slate-900 dark:text-white">הגדרות מחולל</h4>
          <p className="text-slate-500 font-medium">בחר כמה קבוצות תרצה ליצור מתוך {students.length} תלמידים</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
             <button onClick={() => setGroupCount(Math.max(2, groupCount - 1))} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><Minus className="w-5 h-5" /></button>
             <span className="px-6 font-display font-black text-xl tabular-nums">{groupCount}</span>
             <button onClick={() => setGroupCount(groupCount + 1)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><Plus className="w-5 h-5" /></button>
          </div>
          <button 
            onClick={generate}
            className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all flex items-center gap-2"
          >
            <Zap className="w-5 h-5 fill-current" />
            צור קבוצות
          </button>
        </div>
      </div>

      {generatedGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
          {generatedGroups.map(group => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={group.id} 
              className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 dark:border-slate-800 pb-4">
                <h5 className="font-display font-bold text-lg text-slate-900 dark:text-white">{group.name}</h5>
                <Badge className="bg-brand-50 text-brand-600 border-none">{group.members.length} תלמידים</Badge>
              </div>
              <div className="space-y-2 flex-grow">
                {group.members.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">{s.name[0]}</div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{s.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
           <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
           <p className="text-lg font-medium">לחץ על "צור קבוצות" כדי להתחיל</p>
        </div>
      )}
    </div>
  );
};

const StarsTracker = ({ students, config, updateConfig }: any) => {
  const handleAddStar = (studentId: string) => {
    updateConfig((prev: any) => ({
      ...prev,
      students: prev.students.map((s: any) => 
        s.id === studentId ? { ...s, stars: (s.stars || 0) + 1 } : s
      )
    }));
  };

  return (
    <div className="space-y-8 py-4 text-right">
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 p-6 rounded-3xl flex items-center gap-4">
         <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl text-amber-600">
            <Star className="w-8 h-8 fill-current" />
         </div>
         <div>
            <h4 className="text-lg font-display font-bold text-amber-900 dark:text-amber-100">מערכת חיזוקים חיוביים</h4>
            <p className="text-amber-700/70 dark:text-amber-300/50 font-medium">עודדו התנהגות חיובית ועזרו לתלמידים לצבור "כוכבי כיתה" על השקעה ושיתוף פעולה.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {students.map((s: any) => (
          <div key={s.id} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] flex flex-col items-center gap-4 hover:shadow-lg transition-all group">
             <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-display font-black text-2xl text-slate-400 group-hover:scale-110 transition-transform">
                {s.name[0]}
             </div>
             <div className="text-center">
                <h5 className="font-bold text-slate-900 dark:text-white">{s.name}</h5>
                <div className="flex items-center justify-center gap-1 mt-1">
                   <Star className="w-4 h-4 text-amber-500 fill-current" />
                   <span className="font-display font-black text-xl tabular-nums text-amber-600">{s.stars || 0}</span>
                </div>
             </div>
             <button 
               onClick={() => handleAddStar(s.id)}
               className="w-full py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 dark:shadow-none hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
             >
               <Plus className="w-4 h-4" />
               הענק כוכב
             </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const BirthdayTable = ({ students }: any) => {
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const today = new Date();
  
  const studentsWithBirthdays = students.map((s: any, i: number) => ({
    ...s,
    birthday: s.birthday || new Date(2015, (i % 12), (i * 7) % 28 + 1).toISOString().split('T')[0]
  }));

  const upcomingBirthdays = [...studentsWithBirthdays]
    .sort((a, b) => {
      const db_a = new Date(a.birthday);
      const db_b = new Date(b.birthday);
      return (db_a.getUTCMonth() - db_b.getUTCMonth()) || (db_a.getUTCDate() - db_b.getUTCDate());
    });

  return (
    <div className="space-y-8 py-4 text-right">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {months.map((month, mIdx) => {
          const monthStudents = upcomingBirthdays.filter(s => new Date(s.birthday).getUTCMonth() === mIdx);
          const isCurrentMonth = today.getUTCMonth() === mIdx;

          return (
            <div key={month} className={cn(
              "bg-white dark:bg-slate-900 border-2 rounded-[2.5rem] p-6 shadow-sm transition-all",
              isCurrentMonth ? "border-pink-300 ring-4 ring-pink-50 shadow-pink-100" : "border-slate-100 dark:border-slate-800"
            )}>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                <h5 className={cn("font-display font-bold text-xl", isCurrentMonth ? "text-pink-600" : "text-slate-800 dark:text-white")}>{month}</h5>
                {isCurrentMonth && <Badge className="bg-pink-100 text-pink-600 border-none">החודש!</Badge>}
              </div>
              <div className="space-y-3">
                {monthStudents.length > 0 ? monthStudents.map(s => {
                  const bDate = new Date(s.birthday);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                       <div className="flex items-center gap-3">
                          <Cake className={cn("w-4 h-4", isCurrentMonth ? "text-pink-500" : "text-slate-400")} />
                          <span className="font-bold text-slate-700 dark:text-slate-300">{s.name}</span>
                       </div>
                       <span className="text-xs font-black text-slate-400 tabular-nums">{bDate.getUTCDate()} לחודש</span>
                    </div>
                  );
                }) : (
                  <div className="py-8 text-center text-slate-300 text-xs font-medium italic">אין ימי הולדת החודש</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MeetingPlanner = ({ students }: any) => {
  const [segments, setSegments] = useState<any[]>([
    { id: '1', startTime: '16:00', endTime: '16:15', studentId: null },
    { id: '2', startTime: '16:15', endTime: '16:30', studentId: null },
    { id: '3', startTime: '16:30', endTime: '16:45', studentId: null },
    { id: '4', startTime: '16:45', endTime: '17:00', studentId: null },
    { id: '5', startTime: '17:00', endTime: '17:15', studentId: null },
    { id: '6', startTime: '17:15', endTime: '17:30', studentId: null },
  ]);

  const assign = (id: string, sId: string) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, studentId: sId } : seg));
  };

  return (
    <div className="space-y-8 py-4 text-right">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
             <h4 className="text-xl font-display font-bold text-slate-900 dark:text-white">לו"ז אסיפות הורים</h4>
             <button className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-sm font-bold border border-brand-100 hover:bg-brand-100 transition-colors">הוסף משבצת זמן</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {segments.map(seg => (
              <div key={seg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-32 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-center font-display font-black text-slate-700 dark:text-slate-300 tabular-nums">
                    {seg.startTime} - {seg.endTime}
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                  {seg.studentId ? (
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center font-bold">{students.find((s:any)=>s.id===seg.studentId)?.name[0]}</div>
                       <span className="font-bold text-slate-900 dark:text-white">{students.find((s:any)=>s.id===seg.studentId)?.name}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">ממתין לשיבוץ...</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                   <select 
                     onChange={(e) => assign(seg.id, e.target.value)}
                     className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none ring-2 ring-slate-100 dark:ring-slate-800"
                     value={seg.studentId || ''}
                   >
                     <option value="">בחר תלמיד/ה</option>
                     {students.map((s: any) => (
                       <option key={s.id} value={s.id}>{s.name}</option>
                     ))}
                   </select>
                   <button onClick={() => setSegments(prev => prev.filter(p => p.id !== seg.id))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full md:w-80 space-y-6">
           <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-6 rounded-[2.5rem] space-y-4">
              <h5 className="font-display font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                 <Info className="w-5 h-5" />
                 טיפ למורה
              </h5>
              <p className="text-sm text-blue-800/70 dark:text-blue-300 font-medium leading-relaxed">תכננו הפסקות של 5 דקות בין שיחה לשיחה כדי לאפשר לעצמכם זמן ריענון וסיכום רשמים מהפגישה.</p>
           </div>
           <div className="glass-card p-6 rounded-[2.5rem] space-y-4">
              <h5 className="font-display font-bold text-slate-800 dark:text-white">סיכום סטטוס</h5>
              <div className="space-y-3">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">משובצים:</span>
                    <span className="font-black tabular-nums">{segments.filter(s => s.studentId).length} / {segments.length}</span>
                 </div>
                 <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-500 transition-all duration-1000" 
                      style={{ width: `${(segments.filter(s => s.studentId).length / segments.length) * 100}%` }} 
                    />
                 </div>
              </div>
              <button className="w-full py-3 bg-brand-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-brand-100 transition-all flex items-center justify-center gap-2">
                 <Share2 className="w-4 h-4" />
                 שתף עם הורים
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const AIAppGenerator = ({ students }: any) => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const fullPrompt = `You are a pedagogical assistant for a teacher.
      The teacher wants: ${prompt}
      The class has ${students.length} students: ${students.map((s:any)=>s.name).join(', ')}.
      Generate a professional classroom task or material in Hebrew. Use markdown formatting if needed.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: fullPrompt
      });
      setResult(response.text || "לא התקבל תוכן.");
    } catch (error) {
      console.error("AI Generation failed", error);
      setResult("מצטערים, אך אירעה שגיאה בייצור התוכן. אנא בדקו את חיבור האינטרנט או נסו שנית מאוחר יותר.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 py-4 text-right">
      <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/50 p-10 rounded-[3rem] space-y-8">
        <div className="space-y-2">
           <h4 className="text-2xl font-display font-bold text-violet-900 dark:text-violet-100">מחולל משימות AI חכם</h4>
           <p className="text-violet-700/70 dark:text-violet-300/50 font-medium">הזינו הנחיה וקבלו מערך שיעור, מטלה או מבחן מותאם אישית לכיתה שלכם.</p>
        </div>

        <div className="relative">
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border-2 border-violet-100 dark:border-violet-800 rounded-[2.5rem] p-8 min-h-[150px] outline-none focus:border-violet-500 font-bold transition-all text-right resize-none shadow-sm"
            placeholder="מה תרצו ליצור היום? (למשל: מערך שיעור על מערכת השמש הכולל 3 רמות קושי)"
          />
          <button 
            onClick={generate}
            disabled={isGenerating || !prompt}
            className="absolute bottom-6 left-6 px-8 py-4 bg-violet-600 text-white rounded-2xl font-bold shadow-xl shadow-violet-200 dark:shadow-none hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isGenerating ? <Activity className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {isGenerating ? 'מעבד...' : 'ייצר עכשיו'}
          </button>
        </div>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-10 rounded-[3.5rem] shadow-xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6">
             <h5 className="text-xl font-display font-bold text-slate-800 dark:text-white">תוצר ה-AI שלך</h5>
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(result);
                 alert("התוכן הועתק ללוח!");
               }}
               className="flex items-center gap-2 text-brand-600 font-bold hover:scale-105 transition-transform"
             >
                <ClipboardList className="w-5 h-5" />
                העתק תוצאה
             </button>
          </div>
          <div className="prose prose-slate dark:prose-invert max-w-none text-right font-medium leading-relaxed whitespace-pre-wrap">
             {result}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const JewishTimeline = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const events = useMemo(() => {
        const hDates = [];
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const options = {
            start: startOfWeek,
            end: endOfWeek,
            holidays: true,
            sedrot: true,
        };
        const allEvents = HebrewCalendar.calendar(options);

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const hd = new HDate(d);
            
            const dayEvents = allEvents
                .filter(ev => ev.getDate().abs() === hd.abs());

            hDates.push({
                date: d,
                hDate: hd,
                holidays: dayEvents
            });
        }
        return hDates;
    }, [startOfWeek]);

    return (
        <div className="w-full space-y-4 text-right">
            <h4 className="text-sm font-display font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-widest flex items-center gap-2 justify-end">
                <CalendarDays className="w-4 h-4" />
                אירועים בלוח השבוע
            </h4>
            <div className="grid grid-cols-7 gap-2">
                {events.map((e, i) => {
                    const isToday = e.date.toDateString() === today.toDateString();
                    return (
                        <div key={i} className={cn(
                            "flex flex-col items-center p-2 rounded-xl border transition-all",
                            isToday ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-105" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                        )}>
                            <span className="text-[10px] font-black uppercase opacity-60 mb-1">
                                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][i]}
                            </span>
                            <span className="text-sm font-black tabular-nums">{e.date.getDate()}</span>
                            <span className="text-[10px] font-bold mt-1 text-center leading-tight">
                                {e.hDate.renderGematriya().split(' ').slice(0, 1)}
                            </span>
                            {e.holidays.length > 0 && (
                                <div className="mt-1 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" title={e.holidays[0].render('he')} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {events.some(e => e.holidays.length > 0) && (
                <div className="flex flex-wrap gap-2 justify-end">
                    {events.flatMap(e => e.holidays).filter((v, i, a) => a.findIndex(t => t.render('he') === v.render('he')) === i).map((h, i) => (
                        <Badge key={i} className="bg-amber-50 text-amber-700 border-amber-100 text-[10px] font-bold">{h.render('he')}</Badge>
                    ))}
                </div>
            )}
        </div>
    );
};

const EventLog = ({ config, updateConfig }: { config: any, updateConfig: any }) => {
  const [newEvent, setNewEvent] = useState('');
  const events = config.events || [];

  const addEvent = () => {
    if (!newEvent.trim()) return;
    const item = {
      id: Math.random().toString(36).substr(2, 9),
      text: newEvent,
      timestamp: new Date().toISOString(),
      type: 'general'
    };
    updateConfig((prev: any) => ({
      ...prev,
      events: [item, ...(prev.events || [])]
    }));
    setNewEvent('');
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 py-6 px-4">
      <div className="flex gap-4">
        <input 
          type="text"
          value={newEvent}
          onChange={(e) => setNewEvent(e.target.value)}
          placeholder="מה קרה בשיעור? (למשל: שיחת הבהרה, הצלחה מיוחדת, שינוי סידור)"
          className="flex-1 p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl font-bold focus:border-brand-500 outline-none transition-all shadow-sm text-slate-800 dark:text-white"
          onKeyDown={(e) => e.key === 'Enter' && addEvent()}
        />
        <button 
          onClick={addEvent}
          className="px-8 bg-brand-600 text-white rounded-3xl font-black shadow-lg hover:bg-brand-700 active:scale-95 transition-all"
        >
          הוסף
        </button>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
        {events.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">אין אירועים רשומים עדיין</p>
          </div>
        ) : (
          events.map((e: any) => (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              key={e.id} 
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-5 shadow-sm hover:border-brand-500 transition-colors"
            >
              <div className="p-3 bg-brand-50 dark:bg-brand-900/30 rounded-2xl">
                <Clock className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight underline decoration-brand-500/20 underline-offset-4">{e.text}</p>
                <div className="flex items-center gap-2 mt-2">
                   <p className="text-xs font-bold text-slate-400">
                      {new Date(e.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} • {new Date(e.timestamp).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <button 
                      onClick={() => updateConfig((prev: any) => ({ ...prev, events: prev.events.filter((x: any) => x.id !== e.id) }))}
                      className="text-xs font-black text-rose-500 hover:underline uppercase"
                    >
                      מחק
                    </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const ToolsView = ({ onBack, students, currentConfig, updateCurrentConfig, isDarkMode, exportToExcel, importFromCSV }: any) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const tools = [
    { id: 'groups', title: 'מחולל קבוצות אקראי', icon: <Users className="w-8 h-8 text-indigo-500" />, desc: 'יצירת קבוצות עבודה מעורבות באופן אוטומטי', status: 'פעיל' },
    { id: 'wheel', title: 'גלגל שמות למורה', icon: <UserPlus className="w-8 h-8 text-brand-500" />, desc: 'בחירה אקראית של תלמיד לתשובה או משימה', status: 'פעיל' },
    { id: 'templates', title: 'תבניות סידור מוכנות', icon: <LayoutGrid className="w-8 h-8 text-emerald-500" />, desc: 'שמירה וטעינה של תבניות למבנה פיזי (ח, קבוצות, מבחן)', status: 'פעיל' },
    { id: 'timer', title: 'טיימר משימות לכיתה', icon: <Activity className="w-8 h-8 text-amber-500" />, desc: 'שעון עצר מוגדל כולל התראות קוליות למשימות בכתה', status: 'פעיל' },
    { id: 'events', title: 'יומן אירועים ונוכחות', icon: <Calendar className="w-8 h-8 text-rose-500" />, desc: 'מעקב היעדרויות, איחורים וחיסורים', status: 'פעיל' },
    { id: 'stars', title: 'חיזוקים ונקודות אור', icon: <Star className="w-8 h-8 text-yellow-500" />, desc: 'הענקת נקודות חיוביות לתלמידים במהלך היום', status: 'פעיל' },
    { id: 'birthdays', title: 'טבלת ימי הולדת', icon: <Sparkles className="w-8 h-8 text-pink-500" />, desc: 'ימי הולדת הקרובים בכתה לתכנון חגיגות', status: 'פעיל' },
    { id: 'export-excel', title: 'ייצוא גיליונות אקסל', icon: <FileText className="w-8 h-8 text-emerald-600" />, desc: 'הורדת נתוני הכיתה והציונים בקובץ נתונים', status: 'פעיל' },
    { id: 'import-csv', title: 'ייבוא תלמידים מקובץ', icon: <Upload className="w-8 h-8 text-sky-500" />, desc: 'העלאת רשימת תלמידים מקובץ Excel או CSV', status: 'פעיל' },
    { id: 'meetings', title: 'תכנון אסיפות הורים', icon: <Users className="w-8 h-8 text-blue-500" />, desc: 'מנגנון לשיבוץ וקביעת פגישות ברצף אינטואיטיבי', status: 'פעיל' },
    { id: 'ai', title: 'מחולל משימות AI', icon: <Wrench className="w-8 h-8 text-violet-500" />, desc: 'יצירת מטלות וחומרי למידה בעזרת בינה מלאכותית', status: 'פעיל' }
  ];

  if (selectedTool) {
    const tool = tools.find(t => t.id === selectedTool);
    return (
      <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setSelectedTool(null)}
            className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                {tool?.icon}
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">{tool?.title}</h2>
              <p className="text-slate-500 font-medium">{tool?.desc}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 min-h-[600px] flex flex-col items-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             {React.cloneElement(tool?.icon as React.ReactElement, { className: "w-64 h-64" })}
          </div>
          
          <div className="w-full relative z-10">
            {selectedTool === 'wheel' && <NameWheel students={students} isDarkMode={isDarkMode} />}
            {selectedTool === 'timer' && <ClassroomTimer />}
            {selectedTool === 'events' && <EventLog config={currentConfig} updateConfig={updateCurrentConfig} />}
            {selectedTool === 'groups' && <GroupGenerator students={students} />}
            {selectedTool === 'stars' && <StarsTracker students={students} config={currentConfig} updateConfig={updateCurrentConfig} />}
            {selectedTool === 'birthdays' && <BirthdayTable students={students} />}
            {selectedTool === 'meetings' && <MeetingPlanner students={students} />}
            {selectedTool === 'ai' && <AIAppGenerator students={students} />}
            {selectedTool === 'templates' && (
              <div className="text-center space-y-8 py-10">
                 <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mx-auto text-emerald-600">
                    <LayoutGrid className="w-10 h-10" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">תבניות סידור מוכנות</h3>
                    <p className="text-slate-500 max-w-md mx-auto">כלי זה משתמש ב-Presets מובנים למבנה פיזי של הכיתה. הוא זמין דרך פאנל עריכת המבנה במסך המפה הראשי (לחצו על מקצוע המצפן).</p>
                 </div>
                 <button 
                   onClick={onBack}
                   className="px-8 py-3 bg-brand-600 text-white rounded-2xl font-bold shadow-lg hover:bg-brand-700 transition-all"
                 >
                   עבור למפה
                 </button>
              </div>
            )}
            {selectedTool === 'export-excel' && (
              <div className="text-center space-y-8 py-10">
                 <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mx-auto text-emerald-600">
                    <FileDown className="w-10 h-10" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">ייצוא נתונים מלא ל-Excel</h3>
                    <p className="text-slate-500 max-w-md mx-auto">הורד את כל נתוני הכיתה, התלמידים, הציונים והנוכחות בקובץ Excel מסודר הכולל שדות מורחבים.</p>
                 </div>
                 <button 
                   onClick={exportToExcel}
                   className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl hover:bg-brand-700 transition-all flex items-center gap-2 mx-auto"
                 >
                   <Download className="w-5 h-5" />
                   הורד קובץ Excel כעת
                 </button>
              </div>
            )}
            {selectedTool === 'import-csv' && (
              <div className="text-center space-y-8 py-10">
                 <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-3xl flex items-center justify-center mx-auto text-sky-600">
                    <FileUp className="w-10 h-10" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">ייבוא תלמידים מקובץ</h3>
                    <p className="text-slate-500 max-w-md mx-auto">העלו קובץ CSV או Excel עם רשימת תלמידים. וודאו שהקובץ כולל עמודת "שם מלא".</p>
                 </div>
                 <div className="flex flex-col items-center gap-4">
                    <label className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl hover:bg-brand-700 transition-all flex items-center gap-2 cursor-pointer">
                      <Upload className="w-5 h-5" />
                      בחר קובץ לייבוא
                      <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importFromCSV} />
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">תומך בפורמטים: .CSV, .XLSX, .XLS</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">כלי עזר פדגוגיים</h2>
            <p className="text-slate-500 font-medium">עריכה ופעולות זריזות המסייעות בניהול כיתה יעיל ותקין ברציפות.</p>
          </div>
          <div className="px-6 py-3 bg-brand-600 text-white rounded-2xl font-black shadow-lg">ארגז כלים</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool, i) => (
          <div 
            key={i} 
            onClick={() => setSelectedTool(tool.id)}
            className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer hover:border-brand-500 w-full flex flex-col h-64"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:scale-110 group-hover:bg-brand-50 transition-all">
                {tool.icon}
              </div>
              {tool.status === 'בקרוב' ? (
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-black rounded-lg uppercase tracking-widest">בקרוב</div>
              ) : (
                <div className="px-3 py-1 bg-brand-50 dark:bg-brand-900/40 text-brand-600 text-xs font-black rounded-lg border border-brand-100 dark:border-brand-800 uppercase tracking-widest">פעיל</div>
              )}
            </div>
            <div className="pt-2 flex-grow">
              <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-brand-600 transition-colors">{tool.title}</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed line-clamp-2">{tool.desc}</p>
            </div>
            <div className="flex items-center gap-2 text-brand-600 font-black text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity">
               פתח כלי <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [currentConfig, setCurrentConfig] = useState({
    id: '1',
    name: 'כיתת מצוינות א׳',
    rows: 6,
    cols: 9,
    grid: Array(54).fill(null) as (string | null)[],
    students: [
      { id: '1', name: 'יוני לוי', preferred: [], forbidden: [], separateFrom: ['2'], height: 'short', groups: ['א'], notes: '', birthday: '2015-05-14' },
      { id: '2', name: 'ענבר כהן', preferred: ['1'], forbidden: [], keepDistantFrom: ['1'], height: 'tall', groups: ['ב'], notes: '', birthday: '2015-06-20' },
      { id: '3', name: 'גיל שרון', preferred: [], forbidden: [], height: 'medium', groups: ['א'], notes: '', birthday: '2015-12-10' }
    ],
    hiddenDesks: [] as number[],
    rowGaps: [] as number[],
    columnGaps: [] as number[],
    teacherDesk: { index: -1, width: 2, height: 1 },
    groups: [
      { id: 'none', name: 'ללא קבוצה', constraint: 'none' },
      { id: 'א', name: 'קבוצה א', constraint: 'none' },
      { id: 'ב', name: 'קבוצה ב', constraint: 'none' },
      { id: 'ג', name: 'קבוצה ג', constraint: 'none' },
    ] as any[],
    furniture: [
       { id: 'f1', type: 'board', x: 300, y: -10, width: 600, height: 120, rotation: 0 },
       { id: 'f2', type: 'cabinet', x: 10, y: 200, width: 100, height: 250, rotation: 90 },
       { id: 'f3', type: 'plant', x: 1100, y: 600, width: 80, height: 80, rotation: 0 }
    ] as any[],
    availableLessons: [
      { id: 'math-adv', name: 'מתמטיקה מתקדם', day: 'א', time: '08:00', category: 'regular' },
      { id: 'english-ext', name: 'אנגלית מורחב', day: 'ב', time: '10:00', category: 'enrichment' },
      { id: 'science-lab', name: 'מעבדת מדעים', day: 'ד', time: '12:00', category: 'enrichment' },
    ] as any[],
    updatedAt: Date.now(),
    columnGapSize: 32,
    rowGapSize: 32,
    obstructions: [] as number[],
    lockedDesks: [] as number[],
    deskScales: {} as Record<number, number>,
    colSizes: [] as number[], // Default sizes for specific columns if not standard
    rowSizes: [] as number[], // Default sizes for specific rows if not standard
    events: [] as any[],
    reminders: [] as any[],
    campaigns: [] as any[],
    rewards: [
      { id: 'rev-1', title: '15 דקות הפסקה נוספת', price: 100, stock: 5, icon: 'Clock' },
      { id: 'rev-2', title: 'ממתק קטן', price: 50, stock: 20, icon: 'Zap' },
      { id: 'rev-3', title: 'בחירת מקום ישיבה ליום', price: 200, stock: 3, icon: 'Map' },
      { id: 'rev-4', title: 'פטור משיעורי בית', price: 500, stock: 2, icon: 'CheckCircle2' }
    ] as any[],
    student_points: {} as Record<string, number>,
    student_rewards: {} as Record<string, any[]>,
    achievements: [
      { id: 'ach-1', title: 'תולעת ספרים', description: 'קרא 5 ספרים מהספרייה הכיתתית', icon: 'BookOpen', points: 100 },
      { id: 'ach-2', title: 'עוזר נאמן', description: 'שימש כעוזר מורה במשך שבוע', icon: 'UserCircle2', points: 150 },
      { id: 'ach-3', title: 'אלוף הנוכחות', description: 'חודש שלם ללא איחורים או חיסורים', icon: 'CheckCircle2', points: 300 }
    ] as any[],
    student_achievements: {} as Record<string, string[]>,
    analytics_log: [] as any[]
  });

  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState<typeof currentConfig | null>(null);

  const activeConfig = useMemo(() => isPracticeMode && practiceConfig ? practiceConfig : currentConfig, [isPracticeMode, practiceConfig, currentConfig]);
  const [viewType, setViewType] = useState<'grid' | 'table' | 'history' | 'dashboard' | 'attendance' | 'grades' | 'progress' | 'settings' | 'studentDetail' | 'exams' | 'tools' | 'events' | 'reminders' | 'campaigns' | 'campaign-display' | 'analytics' | 'rewards' | 'leaderboard' | 'behaviorLog'>('dashboard');

  const setViewTypeWithTransition = (newView: typeof viewType) => {
    setIsViewLoading(true);
    setTimeout(() => {
      setViewType(newView);
      setIsViewLoading(false);
    }, 400);
  };
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [cameraAngle, setCameraAngle] = useState<'standard' | 'birdsEye' | 'studentLevel' | 'free'>('standard');
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(50);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(0.9);
  const [theme, setTheme] = useState<'default' | 'nature' | 'ocean' | 'sunset' | 'royal' | 'wood'>('default');
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const customConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  const ConfirmModal = () => (
    <AnimatePresence>
      {confirmDialog?.isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[1000] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-6"
           dir="rtl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6"
          >
             <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{confirmDialog.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed">{confirmDialog.message}</p>
             </div>
             <div className="flex gap-3">
                <button 
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-3 bg-brand-600 text-white rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg active:scale-95"
                >
                  כן, בצע
                </button>
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  ביטול
                </button>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [quickPrefsStudentId, setQuickPrefsStudentId] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({ name: '', height: 'average' as any });
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddHeight, setQuickAddHeight] = useState('medium');
  const [quickAddGroups, setQuickAddGroups] = useState<string[]>([]);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [editMode, setEditMode] = useState<'placement' | 'structure'>('placement');
  const [showDeskNumbers, setShowDeskNumbers] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [is3DView, setIs3DView] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGroupsPanelOpen, setIsGroupsPanelOpen] = useState(false);
  const [isIssuesPanelOpen, setIsIssuesPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'row' | 'col'>('name');
  const [accessibility, setAccessibility] = useState({ highContrast: false, fontSize: 'medium' });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [deskHistory, setDeskHistory] = useState<Record<number, string[]>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState({ name: 'שלום מנחם', role: 'מחנך כיתה ח\' 2', school: 'בית ספר לדוגמה' });
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [isFurnitureModalOpen, setIsFurnitureModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        setNotifications(prev => [{ id: Date.now(), text: `ברוך הבא, ${user.displayName || user.email}`, type: 'success' }, ...prev]);
        // Also update teacher profile from firebase user if available
        if (user.displayName) {
          setTeacherProfile(prev => ({ ...prev, name: user.displayName! }));
        }
      }
    });

    // Test connection as requested per constraints
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent, email: string, pass: string, name?: string) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        if (name) {
          await updateProfile(userCred.user, { displayName: name });
        }
        // Create user document
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          email: userCred.user.email,
          displayName: name || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setAuthError(err.message);
      setNotifications(prev => [{ id: Date.now(), text: "שגיאת התחברות: " + err.message, type: 'error' }, ...prev]);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setNotifications(prev => [{ id: Date.now(), text: "התנתקת בהצלחה", type: 'info' }, ...prev]);
  };
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 minutes default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(600);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [isBulkBehaviorModalOpen, setIsBulkBehaviorModalOpen] = useState(false);

  const handleUpdatePoints = (studentId: string, points: number, reason: string, categoryId: string) => {
    updateCurrentConfig((prev: any) => {
      const newPoints = { ...prev.student_points, [studentId]: (prev.student_points[studentId] || 0) + points };
      const newLog = [...(prev.analytics_log || []), {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'points',
        studentId,
        reason,
        categoryId,
        value: points,
        timestamp: Date.now()
      }].slice(-2000);
      return { ...prev, student_points: newPoints, analytics_log: newLog };
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const adjustTimer = () => {
    const time = prompt("הזן זמן בדקות (למשל: 5, 10, 15):", (timerDuration / 60).toString());
    if (time && !isNaN(Number(time))) {
      const secs = Math.max(1, Math.floor(Number(time) * 60));
      setTimerSeconds(secs);
      setTimerDuration(secs);
      setIsTimerRunning(false);
      setIsTimerFinished(false);
    }
  };

  const handleQuickAddStudent = () => {
    if (!quickAddName.trim()) return;
    const id = `student-${Date.now()}`;
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: [...prev.students, {
        id,
        name: quickAddName.trim(),
        height: quickAddHeight,
        groups: quickAddGroups,
        preferred: [],
        forbidden: [],
        notes: '',
        noteTags: [],
        successes: '',
        notesLastUpdated: null,
        interestLevel: 'medium',
        supportNeeded: 'none',
        tags: [],
        environmentPreferences: []
      }]
    }));
    setQuickAddName('');
    setQuickAddGroups([]);
    setNotifications(prev => [{ id: Date.now(), text: `התלמיד ${quickAddName} נוסף בהצלחה!`, type: 'success' }, ...prev]);
  };

  const handlePredefinedImport = () => {
    const predefined = [
      { name: 'אבי כהן', height: 'medium' },
      { name: 'מאיה לוי', height: 'short' },
      { name: 'ניקול אברהם', height: 'tall' },
      { name: 'דניאל יצחקי', height: 'medium' },
      { name: 'אורן מזרחי', height: 'tall' }
    ];
    
    updateCurrentConfig((prev: any) => ({
      ...prev,
      students: [
        ...prev.students,
        ...predefined.map(s => ({
          id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: s.name,
          height: s.height,
          groups: [],
          preferred: [],
          forbidden: [],
          notes: '',
          noteTags: [],
          successes: '',
          notesLastUpdated: null,
          interestLevel: 'medium',
          supportNeeded: 'none',
          tags: [],
          environmentPreferences: []
        }))
      ]
    }));
    
    setNotifications(prev => [{ id: Date.now(), text: `יובאו ${predefined.length} תלמידים מהרשימה המוכנה!`, type: 'success' }, ...prev]);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const importedStudents = json.map((row: any) => ({
          id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: row.name || row['שם'] || row['Full Name'] || row.Name || 'תלמיד חדש',
          height: row.height || row['גובה'] || 'medium',
          groups: row.group || row['קבוצה'] ? [String(row.group || row['קבוצה'])] : [],
          preferred: [],
          forbidden: [],
          notes: row.notes || row['הערות'] || '',
          noteTags: row.noteTags ? String(row.noteTags).split(',').map((t: string) => t.trim()) : [],
          successes: row.successes || '',
          notesLastUpdated: null,
          interestLevel: row.interestLevel || 'medium',
          supportNeeded: row.supportNeeded || 'none',
          tags: row.tags ? String(row.tags).split(',').map((t: string) => t.trim()) : [],
          environmentPreferences: row.environmentPreferences ? String(row.environmentPreferences).split(',').map((p: string) => p.trim()) : []
        }));

        if (importedStudents.length > 0) {
          updateCurrentConfig((prev: any) => ({
            ...prev,
            students: [...prev.students, ...importedStudents]
          }));
          setNotifications(prev => [{ id: Date.now(), text: `יובאו ${importedStudents.length} תלמידים מקובץ ה-CSV!`, type: 'success' }, ...prev]);
        } else {
          setNotifications(prev => [{ id: Date.now(), text: "לא נמצאו נתונים תואמים בקובץ", type: 'error' }, ...prev]);
        }
      } catch (err) {
        console.error('Import error:', err);
        setNotifications(prev => [{ id: Date.now(), text: "שגיאה בפענוח הקובץ", type: 'error' }, ...prev]);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    event.target.value = '';
  };

  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const conflicts = useMemo(() => calculateConflicts(activeConfig), [activeConfig]);

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
    { title: "ברוכים הבאים!", text: "בואו נכיר את CLass&scool pro-manager. המקום בו פדגוגיה פוגשת AI.", icon: <Sparkles className="w-10 h-10 text-brand-600" /> },
    { title: "גרירה ושחרור", text: "פשוט גררו תלמידים מהמאגר או בין השולחנות כדי לעצב את הכיתה.", icon: <MousePointer className="w-10 h-10 text-indigo-600" /> },
    { title: "אופטימיזציית AI Smart Sort", text: "אלגוריתם ה-AI שלנו סורק אלפי אפשרויות כדי למצוא את הסידור המושלם. הוא מאזן בין צרכים לימודיים, חברתיים ופיזיים בשניות.", icon: <Brain className="w-10 h-10 text-brand-600" /> },
    { title: "מנהל האילוצים", text: "ה-AI מתחשב באילוצים חכמים: גובה תלמידים (נמוכים מלפנים), הפרדת מפריעים, הצמדת חברים, ושמירה על הומוגניות קבוצתית בכל שולחן.", icon: <ListChecks className="w-10 h-10 text-sky-600" /> },
    { title: "פתרון קונפליקטים חכם", text: "כשיש סתירה בין אילוצים, ה-AI מדרג עדיפויות. המערכת תסמן לכם קונפליקטים שנותרו ותסביר בדיוק למה הם נוצרו ואיך ניתן לשפר.", icon: <Zap className="w-10 h-10 text-amber-500" /> },
    { title: "תצוגת 3D", text: "חדש! מעכשיו תוכלו לראות את הכיתה בפרספקטיבה תלת-ממדית.", icon: <Box className="w-10 h-10 text-amber-600" /> }
  ];

  const isPrinting = (currentConfig as any).isPrinting;

  const dashboardStats = useMemo(() => {
    const studentCount = activeConfig.students.length;
    const placedCount = activeConfig.grid.filter(s => s !== null).length;
    
    // Conflict calculation
    let conflictCount = 0;
    activeConfig.grid.forEach((sid, idx) => {
      if (!sid) return;
      const student = activeConfig.students.find(s => s.id === sid);
      if (!student || !student.forbidden) return;
      const r = Math.floor(idx / activeConfig.cols);
      const c = idx % activeConfig.cols;
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < activeConfig.rows && nc >= 0 && nc < activeConfig.cols) {
          const neighborId = activeConfig.grid[nr * activeConfig.cols + nc];
          if (neighborId && student.forbidden.includes(neighborId)) conflictCount++;
        }
      });
    });

    // Satisfaction calculation (simplified normalization of scoring)
    let totalScore = 0;
    const activeStudents = activeConfig.grid.filter(s => s !== null);
    if (activeStudents.length > 0) {
      activeConfig.grid.forEach((sid, idx) => {
        if (!sid) return;
        const student = activeConfig.students.find(s => s.id === sid);
        if (!student) return;
        const r = Math.floor(idx / activeConfig.cols);
        const c = idx % activeConfig.cols;
        
        let sScore = 100; // Base score
        // Height check
        if (student.height === 'short' && r >= 2) sScore -= 40;
        // Preferred check (very simple)
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < activeConfig.rows && nc >= 0 && nc < activeConfig.cols) {
            return activeConfig.grid[nr * activeConfig.cols + nc];
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
  }, [activeConfig]);

  const aiInsights = useMemo(() => {
    if (!activeConfig.grid) return [];
    const insights = [];
    const studentCount = activeConfig.grid.filter((s: any) => s !== null).length;
    
    if (studentCount > 0) {
      insights.push({ 
        type: 'pedagogical', 
        text: `הושבת ${studentCount} תלמידים. מומלץ לוודא שהתלמידים המאתגרים יושבים קרוב לשולחן המורה.` 
      });
    }

    const shortCount = activeConfig.students.filter(s => s.height === 'short').length;
    const shortInFront = activeConfig.grid.filter((sid: any, idx: number) => {
      if (!sid) return false;
      const s = activeConfig.students.find(st => st.id === sid);
      return s?.height === 'short' && Math.floor(idx / activeConfig.cols) < 2;
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
    activeConfig.grid.forEach((sid: any, idx: number) => {
      if (!sid) return;
      const student = activeConfig.students.find(s => s.id === sid);
      if (!student || !student.forbidden) return;

      const r = Math.floor(idx / activeConfig.cols);
      const c = idx % activeConfig.cols;
      
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < activeConfig.rows && nc >= 0 && nc < activeConfig.cols) {
          const neighborId = activeConfig.grid[nr * activeConfig.cols + nc];
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
  }, [activeConfig]);

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const playAlertSound = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime); // High pitch A
      oscillator.connect(gain);
      gain.connect(context.destination);

      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.8);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.8);
      
      // Play a second beep for better alert
      setTimeout(() => {
        const osc2 = context.createOscillator();
        const gain2 = context.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1109.12, context.currentTime); // C#6
        osc2.connect(gain2);
        gain2.connect(context.destination);
        gain2.gain.setValueAtTime(0, context.currentTime);
        gain2.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);
        osc2.start();
        osc2.stop(context.currentTime + 1);
      }, 200);
    } catch (e) {
      console.warn('Audio alert not supported or blocked:', e);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setIsTimerFinished(true);
      playAlertSound();
      setNotifications(prev => [{ id: Date.now(), text: "הטיימר הסתיים! 🔔", type: 'info' }, ...prev]);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, playAlertSound]);

  // Keyboard Navigation for Students
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewType !== 'grid' || isAIPanelOpen || isAddStudentOpen || quickPrefsStudentId) return;
      
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];
      if (!arrows.includes(e.key)) return;

      e.preventDefault();

      const studentIdsInGrid = activeConfig.grid.filter((id: string | null) => id !== null) as string[];
      if (studentIdsInGrid.length === 0) return;

      if (!selectedStudentId) {
        setSelectedStudentId(studentIdsInGrid[0]);
        return;
      }

      const currentIdx = activeConfig.grid.indexOf(selectedStudentId);
      if (currentIdx === -1) return;

      const rows = activeConfig.rows;
      const cols = activeConfig.cols;
      const r = Math.floor(currentIdx / cols);
      const c = currentIdx % cols;

      let nextIdx = currentIdx;
      
      if (e.key === 'Tab') {
        const currentIdxInPlaced = studentIdsInGrid.indexOf(selectedStudentId);
        let nextPlacedIdx = 0;
        if (e.shiftKey) {
          nextPlacedIdx = (currentIdxInPlaced - 1 + studentIdsInGrid.length) % studentIdsInGrid.length;
        } else {
          nextPlacedIdx = (currentIdxInPlaced + 1) % studentIdsInGrid.length;
        }
        setSelectedStudentId(studentIdsInGrid[nextPlacedIdx]);
        return;
      }

      if (e.key === 'ArrowRight') {
        // Move right, find next student
        for (let i = currentIdx + 1; i < activeConfig.grid.length; i++) {
          if (activeConfig.grid[i]) {
            nextIdx = i;
            break;
          }
        }
      } else if (e.key === 'ArrowLeft') {
        // Move left, find prev student
        for (let i = currentIdx - 1; i >= 0; i--) {
          if (activeConfig.grid[i]) {
            nextIdx = i;
            break;
          }
        }
      } else if (e.key === 'ArrowDown') {
        // Move down row
        for (let row = r + 1; row < rows; row++) {
          const targetIdx = row * cols + c;
          if (activeConfig.grid[targetIdx]) {
            nextIdx = targetIdx;
            break;
          }
          // Scan row for nearest student if target is empty? For now just direct check
        }
      } else if (e.key === 'ArrowUp') {
        // Move up row
        for (let row = r - 1; row >= 0; row--) {
          const targetIdx = row * cols + c;
          if (activeConfig.grid[targetIdx]) {
            nextIdx = targetIdx;
            break;
          }
        }
      }

      if (nextIdx !== currentIdx) {
        setSelectedStudentId(activeConfig.grid[nextIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewType, selectedStudentId, activeConfig, isAIPanelOpen, isAddStudentOpen, quickPrefsStudentId]);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [redoHistory, setRedoHistory] = useState<any[]>([]);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [undoHistory, setUndoHistory] = useState<any[]>([]);
  const [aiResponse, setAiResponse] = useState("");
  const [aiWeights, setAiWeights] = useState({ 
    preferred: 8, 
    forbidden: 10, 
    separateFrom: 6,
    socialWeight: 5,
    spatialWeight: 5,
    customSystemPrompt: "אתה יועץ פדגוגי מומחה. השב בעברית בלבד."
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [hoveredColGap, setHoveredColGap] = useState<number | null>(null);
  const [hoveredRowGap, setHoveredRowGap] = useState<number | null>(null);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);

  const handleAICommand = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `
אתה עוזר וירטואלי חכם למורה בבית הספר. קרא את הפקודה של המורה הבאה:
"${text}"

רשימת התלמידים בכיתה:
${activeConfig.students.map((s: any) => `- ${s.name} (id: ${s.id})`).join('\n')}

פלט רק JSON מערך של פעולות לביצוע לפי הפקודה. יש להשתמש ב-ID של התלמיד.
פורמט מותר:
[
  { "action": "recordGrade", "studentId": "...", "subject": "...", "grade": 90, "testName": "..." },
  { "action": "recordAttendance", "studentId": "...", "status": "present|absent|late" },
  { "action": "addNote", "studentId": "...", "note": "..." },
  { "action": "recordDiagnostic", "studentId": "...", "type": "...", "description": "...", "accommodations": ["..."] },
  { "action": "recordCommunication", "studentId": "...", "type": "phone|email|letter|meeting", "summary": "...", "toParent": true },
  { "action": "updatePedagogy", "studentId": "...", "interestLevel": "low|medium|high", "supportNeeded": "none|low|medium|high", "environmentPreferences": ["..."] },
  { "action": "showToast", "message": "...", "type": "success|info|error" }
]
אם הפקודה לא מובנת, החזר מערך ריק והוסף showToast עם שגיאה שיאמר למורה שלא הבנת.
הקפד להחזיר JSON תקין בלבד (ללא ציטוט סוג).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const commands = JSON.parse(responseText);
      let acted = false;
      let replyMessage = "הפעולות בוצעו בהצלחה!";

      updateCurrentConfig(prev => {
        let updatedStudents = [...prev.students];
        commands.forEach((cmd: any) => {
          if (cmd.action === 'recordGrade') {
            const studentIdx = updatedStudents.findIndex(s => String(s.id) === String(cmd.studentId));
            if (studentIdx !== -1) {
              const currentGrades = updatedStudents[studentIdx].grades || [];
              updatedStudents[studentIdx] = {
                ...updatedStudents[studentIdx],
                grades: [{ id: Date.now(), subject: cmd.subject || 'כללי', grade: cmd.grade || 0, testName: cmd.testName || '', date: new Date().toISOString() }, ...currentGrades]
              };
              acted = true;
            }
          }
          if (cmd.action === 'recordAttendance') {
            const studentIdx = updatedStudents.findIndex(s => String(s.id) === String(cmd.studentId));
            if (studentIdx !== -1) {
              updatedStudents[studentIdx] = {
                ...updatedStudents[studentIdx],
                status: cmd.status
              };
              acted = true;
            }
          }
          if (cmd.action === 'addNote') {
            const studentIdx = updatedStudents.findIndex(s => String(s.id) === String(cmd.studentId));
            if (studentIdx !== -1) {
              const currentNotes = updatedStudents[studentIdx].notes || "";
              updatedStudents[studentIdx] = {
                ...updatedStudents[studentIdx],
                notes: currentNotes + '\\n' + cmd.note
              };
              acted = true;
            }
          }
          if (cmd.action === 'recordDiagnostic') {
            const studentIdx = updatedStudents.findIndex(s => String(s.id) === String(cmd.studentId));
            if (studentIdx !== -1) {
              const diags = updatedStudents[studentIdx].diagnostics || [];
              updatedStudents[studentIdx] = {
                ...updatedStudents[studentIdx],
                diagnostics: [{ id: String(Date.now()), type: cmd.type, description: cmd.description, date: new Date().toISOString(), accommodations: cmd.accommodations || [] }, ...diags]
              };
              acted = true;
            }
          }
          if (cmd.action === 'recordCommunication') {
            const studentIdx = updatedStudents.findIndex(s => String(s.id) === String(cmd.studentId));
            if (studentIdx !== -1) {
              const comms = updatedStudents[studentIdx].communications || [];
              updatedStudents[studentIdx] = {
                ...updatedStudents[studentIdx],
                communications: [{ id: String(Date.now()), type: cmd.type, summary: cmd.summary, date: new Date().toISOString(), toParent: cmd.toParent }, ...comms]
              };
              acted = true;
            }
          }
          if (cmd.action === 'updatePedagogy') {
            const studentIdx = updatedStudents.findIndex(s => String(s.id) === String(cmd.studentId));
            if (studentIdx !== -1) {
              updatedStudents[studentIdx] = {
                ...updatedStudents[studentIdx],
                interestLevel: cmd.interestLevel || updatedStudents[studentIdx].interestLevel,
                supportNeeded: cmd.supportNeeded || updatedStudents[studentIdx].supportNeeded,
                environmentPreferences: cmd.environmentPreferences || updatedStudents[studentIdx].environmentPreferences
              };
              acted = true;
            }
          }
          if (cmd.action === 'showToast') {
             setNotifications(prevNotif => [{ id: Date.now(), text: cmd.message, type: cmd.type || 'info' }, ...prevNotif]);
             if (cmd.type === 'error') replyMessage = cmd.message;
          }
        });
        return { ...prev, students: updatedStudents };
      });

      return acted ? "הפקודה נרשמה בהצלחה. איך אפשר לעזור עוד?" : replyMessage;
    } catch (error: any) {
      console.error(error);
      return "מצטער, הייתה בעיה לעבד את הבקשה. תוכל לנסח שוב?";
    }
  };

  useEffect(() => {
    if (activeConfig.students) {
      const today = new Date();
      const birthdaysToday = activeConfig.students.filter((s: any) => {
        if (!s.birthday) return false;
        const bday = new Date(s.birthday);
        return bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
      });

      if (birthdaysToday.length > 0) {
        setNotifications((prev: any) => {
          const newItems = birthdaysToday
            .map((s: any) => ({
              id: `birthday-${s.id}-${today.toDateString()}`,
              title: `יום הולדת שמח! 🎂`,
              text: `היום חל יום ההולדת של ${s.name}. אל תשכחו לברך!`,
              type: 'info',
              time: 'עכשיו'
            }))
            .filter(newItem => !prev.some((n: any) => n.id === newItem.id));

          if (newItems.length === 0) return prev;
          return [...newItems, ...prev];
        });
      }
    }
  }, [activeConfig.students]);

  const runAIShuffle = async () => {
    setIsLoadingAI(true);
    
    const rows = activeConfig.rows;
    const cols = activeConfig.cols;
    const validSeats: number[] = [];
    const lockedAssignments: Record<number, string> = {};

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        // Exclude hidden, obstructions
        if (!activeConfig.hiddenDesks.includes(idx) && !(activeConfig.obstructions || []).includes(idx)) {
          // If locked, we fix the student there if any
          if (activeConfig.lockedDesks?.includes(idx)) {
            const sid = activeConfig.grid[idx];
            if (sid) {
              lockedAssignments[idx] = sid;
            }
          } else {
            validSeats.push(idx);
          }
        }
      }
    }

    if (validSeats.length === 0 && Object.keys(lockedAssignments).length === 0) {
      setNotifications(prev => [{ id: Date.now(), text: "אין מקומות פנויים לסידור", type: 'error' }, ...prev]);
      setIsLoadingAI(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const seatsDescription = validSeats.map(idx => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        return `SeatIndex: ${idx} (Row: ${r}, Col: ${c})`;
      }).join(', ');

      const lockedDescription = Object.entries(lockedAssignments).map(([idx, sid]) => {
        const student = activeConfig.students.find((s:any) => s.id === sid);
        return `Student ${student?.name} (ID: ${sid}) is FIXED at SeatIndex ${idx}`;
      }).join('\n');

      const unplacedStudents = activeConfig.students.filter(s => !Object.values(lockedAssignments).includes(s.id));

      const studentsDescription = unplacedStudents.map((s: any) => {
        const friends = s.preferred?.map((id:string) => activeConfig.students.find((st:any)=>st.id === id)?.name).join(', ') || 'None';
        const conflicts = s.forbidden?.map((id:string) => activeConfig.students.find((st:any)=>st.id === id)?.name).join(', ') || 'None';
        const groups = s.groups?.map((id:string) => activeConfig.groups.find((g:any)=>g.id === id)?.name).join(', ') || 'None';
        
        // Pedagogic factors
        const interest = s.interestLevel ? `Interest: ${s.interestLevel}` : '';
        const support = s.supportNeeded ? `Support Needed: ${s.supportNeeded}` : '';
        const envPrefs = s.environmentPreferences?.length ? `Env Prefs: ${s.environmentPreferences.join(', ')}` : '';
        const gradesAvg = s.grades && s.grades.length > 0 
          ? `Avg Grade: ${Math.round(s.grades.reduce((a:number, b:any)=>a+b.grade,0) / s.grades.length)}` 
          : '';
        
        // Location constraints
        const height = s.height || 'medium';
        const rowPref = s.rowPreference || 'any';
        const cornerPref = s.cornerPreference ? 'Prefers corners/edges' : 'No corner preference';
        const successes = s.successes || 'None mentioned';
        const notes = s.notes || 'No further notes';
        const noteTags = s.noteTags?.length > 0 ? s.noteTags.join(', ') : 'None';

        return `- ID: ${s.id}, Name: ${s.name}, Height: ${height} (Short means must be rows 0-1), RowPreference: ${rowPref}, CornerPreference: ${cornerPref}, Friends: ${friends}, Conflicts: ${conflicts}, Groups: ${groups}, ${interest}, ${support}, ${envPrefs}, ${gradesAvg}, Successes: ${successes}, Teacher Notes: ${notes}, Note Tags: ${noteTags}`;
      }).join('\n');

      const prompt = `You are an expert AI pedagogical advisor and classroom manager. You need to assign an optimal seating arrangement for a classroom.
There are ${rows} rows and ${cols} columns.
Available seats (MUST USE ONLY THESE):
${seatsDescription}

FIXED Assignments (Do NOT move these students):
${lockedDescription}

Student Data to assign:
${studentsDescription}

Instructions:
1. Assign each student ID to EXACTLY ONE unique SeatIndex from the available list.
2. Height matching: Students marked 'short' MUST be in Row 0 or 1 to see the board.
3. Row Preferences: 
   - 'front' (Row 0-1)
   - 'middle' (Row 2-3) 
   - 'back' (Row 4+)
4. Corner Preference: If a student prefers corners, try to place them on Column 0 or Column ${cols - 1}.
5. Pedagogical Needs (CRITICAL):
   - Support Needed: Students with 'high' support needed MUST be in the front (Row 0-1).
   - Interest/Engagement: Strategically place students with 'low' interest closer to the teacher (front) or amongst 'high' interest peers to boost engagement.
   - Environment Preferences: If a student prefers 'quiet', place them away from high-traffic indices. If they prefer 'near window', assume columns near index ${cols - 1} are windows.
   - Clinical/Behavioral Cues: Analyze 'Teacher Notes' and 'Note Tags' for any additional location requirements mentioned by the teacher (e.g., "must sit near board", "needs easy access to teacher").
6. Social Constraints:
   - Near Friends: Group students with their 'preferred' friends.
   - Far from Conflicts: Ensure students are NOT adjacent (including diagonals) to their 'forbidden' peers.
   - Groups: Keep students of the same group in the same general area of the grid.
7. Return ONLY a JSON array: [ { "studentId": "...", "seatIndex": ... } ]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const assignments = JSON.parse(responseText);
      
      updateCurrentConfig((prev: any) => {
        const newGrid = Array(prev.rows * prev.cols).fill(null);
        
        // Apply locked first
        Object.entries(lockedAssignments).forEach(([idx, sid]) => {
          newGrid[Number(idx)] = sid;
        });

        let placedCount = Object.keys(lockedAssignments).length;
        
        assignments.forEach((assignment: any) => {
          if (assignment.seatIndex !== undefined && assignment.studentId && validSeats.includes(assignment.seatIndex)) {
             // Don't overwrite locked seats (AI should respect prompt but safety first)
             if (newGrid[assignment.seatIndex] === null) {
               newGrid[assignment.seatIndex] = assignment.studentId;
               placedCount++;
             }
          }
        });
        
        // Safety: If AI failed to place someone, place them in empty valid seats
        if (placedCount < prev.students.length) {
           const currentlyPlacedIds = newGrid.filter(id => id !== null);
           const unplaced = prev.students.filter((s:any) => !currentlyPlacedIds.includes(s.id));
           let emptyIdx = 0;
           unplaced.forEach((s:any) => {
              while (emptyIdx < prev.rows * prev.cols && (!validSeats.includes(emptyIdx) || newGrid[emptyIdx] !== null)) {
                emptyIdx++;
              }
              if (emptyIdx < prev.rows * prev.cols) {
                newGrid[emptyIdx] = s.id;
              }
           });
        }
        
        return { ...prev, grid: newGrid };
      });
      
      setNotifications(prev => [{ id: Date.now(), text: `ה-AI ניתח סנטימנט בהערות המורה ויצר סידור ישיבה מתקדם במיוחד!`, type: 'success' }, ...prev]);
    } catch (error: any) {
      console.error("AI Gen Error, falling back to simulated annealing", error);
      setNotifications(prev => [{ id: Date.now(), text: `שגיאה ב-AI: ${error.message || "בעיה בתקשורת"}. מפעיל אלגוריתם חלופי...`, type: 'warning' }, ...prev]);
      fallbackSimulatedAnnealing(validSeats, rows, cols, lockedAssignments);
    } finally {
      setIsLoadingAI(false);
      setIsAIPanelOpen(false);
    }
  };

  const fallbackSimulatedAnnealing = (validSeats: number[], rows: number, cols: number, lockedAssignments: Record<number, string> = {}) => {
    const unplacedStudents = activeConfig.students.filter(s => !Object.values(lockedAssignments).includes(s.id));
    const students = [...activeConfig.students];
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
          // All desks contribute to score regardless if they are active in THIS annealing
          neighbors.push(nIdx); 
        }
      });
      return neighbors;
    };

    // Scoring function
    const scoreAssignment = (assignment: (string | null)[]) => {
      let score = 0;
      const socialMultiplier = (weights.socialWeight ?? 5) / 5;
      const spatialMultiplier = (weights.spatialWeight ?? 5) / 5;
      
      assignment.forEach((sid, idx) => {
        if (!sid) return;
        const student = students.find(s => s.id === sid);
        if (!student) return;

        const neighbors = getNeighbors(idx);
        const r = Math.floor(idx / cols);
        const c = idx % cols;

        // 1. Social Score (Personal + Groups)
        let socialScore = 0;
        neighbors.forEach(nIdx => {
          const neighborId = assignment[nIdx];
          if (!neighborId) return;
          const neighbor = students.find(s => s.id === neighborId);
          if (!neighbor) return;

          // Personal prefs
          if (student.preferred?.includes(neighborId)) socialScore += weights.preferred;
          if (student.forbidden?.includes(neighborId)) socialScore -= weights.forbidden;

          // Group constraints
          student.groups?.forEach((gId: string) => {
            const group = (activeConfig as any).groups?.find((g: any) => g.id === gId);
            if (!group) return;

            if (neighbor.groups?.includes(gId)) {
              // Same group
              if (group.constraint === 'together') socialScore += 15; 
              if (group.constraint === 'separate') socialScore -= 20;
            }
          });
        });

        // 1.5 Together isolation penalty
        student.groups?.forEach((gId: string) => {
          const group = (activeConfig as any).groups?.find((g: any) => g.id === gId);
          if (group?.constraint === 'together') {
            const hasGroupMemberAdjacent = neighbors.some(nIdx => {
               const neighborId = assignment[nIdx];
               if (!neighborId) return false;
               const neighbor = students.find(s => s.id === neighborId);
               return neighbor?.groups?.includes(gId);
            });
            if (!hasGroupMemberAdjacent) {
               const otherMembers = students.filter(s => s.id !== sid && s.groups?.includes(gId));
               if (otherMembers.length > 0) socialScore -= 50;
            }
          }
        });

        if (student.groups && student.groups.length > 0) {
          student.groups.forEach((groupId: string) => {
            const groupConfig = activeConfig.groups.find(g => g.id === groupId);
            if (!groupConfig || groupConfig.constraint === 'none') return;

            neighbors.forEach(nIdx => {
              const neighborId = assignment[nIdx];
              if (!neighborId) return;
              const neighbor = students.find(s => s.id === neighborId);
              if (!neighbor) return;

              const inSameGroup = neighbor.groups?.includes(groupId);
              if (inSameGroup) {
                if (groupConfig.constraint === 'together') socialScore += 100;
                if (groupConfig.constraint === 'separate') socialScore -= 200;
              }
            });
          });
        }
        
        score += socialScore * socialMultiplier;

        // 2. Spatial / Area Prefs
        let spatialScore = 0;
        const pref = (student as any).areaPref;
        if (pref) {
          if (pref.row !== undefined && r === pref.row) spatialScore += (pref.weight || 20);
          if (pref.col !== undefined && c === pref.col) spatialScore += (pref.weight || 20);
          if (pref.row_range && r >= pref.row_range[0] && r <= pref.row_range[1]) spatialScore += (pref.weight || 10);
          if (pref.col_range && c >= pref.col_range[0] && c <= pref.col_range[1]) spatialScore += (pref.weight || 10);
          
          if (pref.special === "window_or_microwave" && (c === 0 || c === cols - 1)) spatialScore += 60;
          
          if (pref.isolated) {
            const hasNeighbor = neighbors.some(nIdx => assignment[nIdx] !== null);
            if (!hasNeighbor) spatialScore += (pref.weight || 300);
            else spatialScore -= (pref.weight || 300);
          }
        }

        // Height constraint
        if (student.height === 'short') {
          if (r < 2) spatialScore += 80;
          else spatialScore -= 150;
        }

        // Row Preference
        if (student.rowPreference === 'front') {
          if (r < 2) spatialScore += 60;
          else spatialScore -= 100;
        } else if (student.rowPreference === 'middle') {
          const totalRows = Math.ceil(assignment.length / cols);
          if (r >= 1 && r <= totalRows - 2) spatialScore += 40;
          else spatialScore -= 60;
        } else if (student.rowPreference === 'back') {
          const totalRows = Math.ceil(assignment.length / cols);
          if (r >= totalRows - 2) spatialScore += 60;
          else spatialScore -= 100;
        }

        // Corner Preference
        if (student.cornerPreference) {
          if (c === 0 || c === cols - 1) spatialScore += 70;
          else spatialScore -= 50;
        }

        // Support Needed (Pedagogical)
        if (student.supportNeeded === 'high') {
          if (r === 0) spatialScore += 100; // Front row is priority
          else if (r === 1) spatialScore += 60;
          else spatialScore -= 100;
        } else if (student.supportNeeded === 'medium') {
          if (r <= 2) spatialScore += 30;
          else spatialScore -= 20;
        }

        // Interest Level / Engagement
        if (student.interestLevel === 'low') {
          // Low interest students should be closer to teacher OR near high interest students
          if (r <= 1) spatialScore += 40;
          
          const hasHighInterestNeighbor = neighbors.some(nIdx => {
             const neighborId = assignment[nIdx];
             if (!neighborId) return false;
             const neighbor = students.find(s => s.id === neighborId);
             return neighbor?.interestLevel === 'high';
          });
          if (hasHighInterestNeighbor) spatialScore += 30;
        }

        // Environment Preferences
        if (student.environmentPreferences && student.environmentPreferences.length > 0) {
          student.environmentPreferences.forEach((pref: string) => {
            if (pref === 'חלון' || pref === 'window') {
               if (c === cols - 1) spatialScore += 50;
            } else if (pref === 'דלת' || pref === 'door') {
               if (c === 0) spatialScore += 50;
            } else if (pref === 'שקט' || pref === 'quiet') {
               // Assuming quiet areas are back corners
               if (r >= rows - 2 && (c === 0 || c === cols - 1)) spatialScore += 50;
            }
          });
        }
        
        score += spatialScore * spatialMultiplier;
      });
      return score;
    };

    // Simulated Annealing
    setTimeout(() => {
      let currentAssignment: (string | null)[] = Array(rows * cols).fill(null);
      
      // Apply locked assignments
      Object.entries(lockedAssignments).forEach(([idx, sid]) => {
        currentAssignment[Number(idx)] = sid;
      });

      const shuffledStudents = [...unplacedStudents].sort(() => Math.random() - 0.5);
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
      setNotifications(prev => [{ id: Date.now(), text: `ה-AI סיים אופטימיזציה לסדרי הישיבה!`, type: 'success' }, ...prev]);
      
      // Request Gemini explanation in background
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const prompt = `אתה יועץ פדגוגי. הכיתה הרגע סודרה מחדש באמצעות אלגוריתם (Simulated Annealing) בהתחשב באילוצים החברתיים והלימודיים.
אנא כתוב משפט אחד קצרצר ומעודד בלבד שיקפוץ למורה ויאמר שהסידור בוצע בהצלחה ולקח בחשבון את העדפות התלמידים.`;
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt
        }).then(res => {
          if (res.text) {
             setNotifications(prev => [{ id: Date.now() + 1, text: res.text as string, type: 'info' }, ...prev]);
          }
        }).catch(err => console.error(err));
      } catch (e) {
        console.error(e);
      }
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
    
    const student = activeConfig.students.find(s => s.id === draggedStudentId);
    if (student) {
      setDeskHistory(prev => ({
        ...prev,
        [deskIdx]: [student.name, ...(prev[deskIdx] || [])].slice(0, 5)
      }));
    }

    updateCurrentConfig((prev: any) => {
      // Prevent dropping into a locked desk
      if (prev.lockedDesks?.includes(deskIdx)) {
        setNotifications((prevN: any) => [{ id: Date.now(), text: "המקום הזה נעול לשינויים", type: 'error' }, ...prevN]);
        return prev;
      }

      const newGrid = [...prev.grid];
      const oldIdx = newGrid.indexOf(draggedStudentId);
      
      // Prevent moving out of a locked desk
      if (oldIdx !== -1 && prev.lockedDesks?.includes(oldIdx)) {
        setNotifications((prevN: any) => [{ id: Date.now(), text: "לא ניתן להזיז תלמיד ממקום נעול", type: 'error' }, ...prevN]);
        return prev;
      }

      const studentAtTarget = newGrid[deskIdx];
      
      if (oldIdx !== -1) {
        // Swap between two desks
        newGrid[oldIdx] = studentAtTarget;
        newGrid[deskIdx] = draggedStudentId;
      } else {
        // From pool
        newGrid[deskIdx] = draggedStudentId;
      }
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
          let json;
          try {
            json = JSON.parse(content.toString());
          } catch(e) {
            throw new Error("קובץ JSON לא תקין. וודא שהפורמט נכון.");
          }
          
          if (!json || typeof json !== 'object') {
             throw new Error("קובץ JSON ריק או במבנה לא תואם.");
          }
          
          if (Array.isArray(json)) {
            // Format 3: Array of students with constraints
            const mapped = json.map((s, idx) => ({
              id: (s.student_id || s.id || `json-${idx}-${Date.now()}`).toString(),
              name: s.name,
              preferred: (s.preferred || []).map((id: any) => id?.toString()).filter(Boolean),
              forbidden: (s.not_preferred || s.forbidden || []).map((id: any) => id?.toString()).filter(Boolean),
              height: s.height || 'medium',
              groups: s.groups || [],
              notes: s.notes || ''
            }));
            
            updateCurrentConfig((prev: any) => {
              const groups = [...(prev.groups || [])];
              mapped.forEach(s => {
                s.groups.forEach((gName: string) => {
                  if (!groups.find(g => g.name === gName || g.id === gName)) {
                    groups.push({ id: gName, name: gName, constraint: 'none' });
                  }
                });
              });
              return { ...prev, students: [...prev.students, ...mapped], groups };
            });
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
              preferred: s.preferred || [],
              forbidden: s.forbidden || [],
              height: s.height || 'medium',
              groups: s.groups || [],
              notes: s.notes || ''
            }));
            
            updateCurrentConfig((prev: any) => {
              const groups = [...(prev.groups || [])];
              mapped.forEach(s => {
                s.groups.forEach((gName: string) => {
                  if (!groups.find(g => g.name === gName || g.id === gName)) {
                    groups.push({ id: gName, name: gName, constraint: 'none' });
                  }
                });
              });
              return { ...prev, students: [...prev.students, ...mapped], groups };
            });
          }
        } else {
          // Excel/CSV logic
          const bstr = content;
          let wb;
          try {
            wb = XLSX.read(bstr as string, { type: 'binary' });
          } catch(e) {
            throw new Error("קריאת קובץ האקסל נכשלה. וודא שהפורמט תקין.");
          }
          
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          if (data.length <= 1) {
            setNotifications(prev => [{ id: Date.now(), text: "הקובץ ריק או לא תקין.", type: 'error' }, ...prev]);
            return;
          }

          const rawData = data.slice(1);
          const nameToIdMap = new Map<string, string>();
          
          // First pass: Map names to new IDs
          const studentStubs = rawData.map((row, idx) => {
            const name = (row[0] || '').toString().trim();
            if (!name) return null;
            const id = `imported-${idx}-${Date.now()}`;
            nameToIdMap.set(name, id);
            return { row, id, name };
          }).filter(Boolean) as any[];

          const importedGroups = new Set<string>();

          // Second pass: Create full student objects with resolved references
          const newStudents = studentStubs.map(({ row, id, name }) => {
            const preferred = row[1] ? row[1].toString().split(',').map((s: string) => s.trim()).map((s: string) => nameToIdMap.get(s) || s) : [];
            const forbidden = row[2] ? row[2].toString().split(',').map((s: string) => s.trim()).map((s: string) => nameToIdMap.get(s) || s) : [];
            const rawGroups = row[4] ? row[4].toString().split(',').map((s: string) => s.trim()) : [];
            rawGroups.forEach(g => importedGroups.add(g));

            let height = 'medium';
            const hVal = (row[3] || '').toString().toLowerCase();
            if (hVal.includes('קצר') || hVal.includes('short') || hVal.includes('קדמי') || hVal.includes('front')) height = 'short';
            else if (hVal.includes('אחורי') || hVal.includes('back') || hVal.includes('tall') || hVal.includes('גבוה')) height = 'tall';

            return {
              id,
              name,
              preferred,
              forbidden,
              height,
              groups: rawGroups,
              notes: row[5] || ''
            };
          });

          if (newStudents.length > 0) {
            updateCurrentConfig((prev: any) => {
              const existingGroups = prev.groups || [];
              const nextGroups = [...existingGroups];
              
              importedGroups.forEach(gName => {
                const exists = nextGroups.find((g: any) => g.name === gName || g.id === gName);
                if (!exists) {
                  nextGroups.push({ id: gName, name: gName, constraint: 'none' });
                }
              });

              return {
                ...prev,
                students: [...prev.students, ...newStudents],
                groups: nextGroups
              };
            });
          }
        }
        setNotifications(prev => [{ id: Date.now(), text: `הנתונים יובאו בהצלחה!`, type: 'success' }, ...prev]);
      } catch (err: any) {
        console.error("Import error:", err);
        setNotifications(prev => [{ id: Date.now(), text: `שגיאה בייבוא: ${err.message || "קובץ לא תקין"}`, type: 'error' }, ...prev]);
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

  // Check for reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('he-IL', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const currentDate = now.toISOString().split('T')[0];
      
      const reminders = activeConfig.reminders || [];
      reminders.forEach((r: any) => {
        if (r.notify && r.date === currentDate && r.time === currentTime) {
          // Trigger notification only if not already triggered in the last minute
          const triggerKey = `reminder-${r.id}-${currentDate}-${currentTime}`;
          if (!sessionStorage.getItem(triggerKey)) {
            setNotifications(prev => [
              { id: Date.now(), text: `תזכורת: ${r.title}`, type: 'info' },
              ...prev
            ]);
            sessionStorage.setItem(triggerKey, 'true');
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [activeConfig.reminders]);

  useEffect(() => {
    const timer = setTimeout(checkViolations, 1000);
    return () => clearTimeout(timer);
  }, [currentConfig.grid, checkViolations]);

  const updateCurrentConfig = useCallback((update: any) => {
    const setter = isPracticeMode ? setPracticeConfig : setCurrentConfig;
    setter((prev: any) => {
      const actualPrev = prev || currentConfig;
      let next = typeof update === 'function' ? update(actualPrev) : update;
      if (JSON.stringify(next) !== JSON.stringify(actualPrev)) {
        setUndoHistory(h => [actualPrev, ...h].slice(0, 30));
        setRedoHistory([]); 
        next = { ...next, updatedAt: Date.now() };
      }
      return next;
    });
  }, [isPracticeMode, currentConfig]);

  const undo = () => {
    if (undoHistory.length === 0) return;
    const [prev, ...rest] = undoHistory;
    const setter = isPracticeMode ? setPracticeConfig : setCurrentConfig;
    
    setter((current: any) => {
       const actualCurrent = current || currentConfig;
       setRedoHistory(h => [actualCurrent, ...h].slice(0, 50));
       return prev;
    });
    setUndoHistory(rest);
    setNotifications(prevNotif => [{ id: Date.now(), text: "פעולת Undo בוצעה", type: 'info' }, ...prevNotif]);
  };

  const redo = () => {
    if (redoHistory.length === 0) return;
    const [next, ...rest] = redoHistory;
    const setter = isPracticeMode ? setPracticeConfig : setCurrentConfig;
    
    setter((current: any) => {
       const actualCurrent = current || currentConfig;
       setUndoHistory(h => [actualCurrent, ...h].slice(0, 50));
       return next;
    });
    setRedoHistory(rest);
    setNotifications(prevNotif => [{ id: Date.now(), text: "פעולת Redo בוצעה", type: 'info' }, ...prevNotif]);
  };

  const confirmCustom = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };


  const exportLayoutToImage = async () => {
    const gridElement = document.querySelector('.classroom-grid-container');
    if (!gridElement) {
       setNotifications(prev => [{ id: Date.now(), text: "לא נמצא אלמנט לייצוא", type: 'error' }, ...prev]);
       return;
    }
    
    setNotifications(prev => [{ id: Date.now(), text: "מפיק תמונה...", type: 'info' }, ...prev]);

    try {
      const canvas = await html2canvas(gridElement as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
        windowWidth: gridElement.scrollWidth,
        windowHeight: gridElement.scrollHeight,
      });
      
      const link = document.createElement('a');
      link.download = `Classroom-Layout-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setNotifications(prev => [{ id: Date.now(), text: "תמונה נשמרה בהצלחה", type: 'success' }, ...prev]);
    } catch (error) {
      console.error(error);
      setNotifications(prev => [{ id: Date.now(), text: "שגיאה בייצוא התמונה", type: 'error' }, ...prev]);
    }
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

      const newHiddenDesks: number[] = [];
      const newObstructions: number[] = [];
      const newLockedDesks: number[] = [];
      const newDeskScales: Record<number, number> = {};

      for (let r = 0; r < Math.min(prev.rows, newRows); r++) {
        for (let c = 0; c < Math.min(prev.cols, newCols); c++) {
          const oldIdx = r * prev.cols + c;
          const newIdx = r * newCols + c;
          if (prev.hiddenDesks.includes(oldIdx)) newHiddenDesks.push(newIdx);
          if (prev.obstructions?.includes(oldIdx)) newObstructions.push(newIdx);
          if (prev.lockedDesks?.includes(oldIdx)) newLockedDesks.push(newIdx);
          if (prev.deskScales?.[oldIdx]) newDeskScales[newIdx] = prev.deskScales[oldIdx];
        }
      }
      
      return { 
        ...prev, 
        [type]: newVal, 
        grid: newGrid, 
        teacherDesk,
        hiddenDesks: newHiddenDesks,
        obstructions: newObstructions,
        lockedDesks: newLockedDesks,
        deskScales: newDeskScales
      };
    });
  };

  const renderMainContent = () => {
    const onBack = () => setViewTypeWithTransition('dashboard');
    const onBackToGrid = () => setViewTypeWithTransition('grid');
    switch (viewType) {
      case 'dashboard': return <DashboardView activeConfig={activeConfig} stats={dashboardStats} students={activeConfig.students} onBack={onBackToGrid} updateCurrentConfig={updateCurrentConfig} isDarkMode={isDarkMode} teacherProfile={teacherProfile} setIsTeacherModalOpen={setIsTeacherModalOpen} setViewType={setViewType} />;
      case 'attendance': return <AttendanceView students={activeConfig.students} onBack={onBack} updateCurrentConfig={updateCurrentConfig} />;
      case 'grades': return <GradesView students={activeConfig.students} onBack={onBack} updateCurrentConfig={updateCurrentConfig} />;
      case 'tasks': return <TasksView students={activeConfig.students} onBack={onBack} updateCurrentConfig={updateCurrentConfig} />;
      case 'events': return <EventsView currentConfig={activeConfig} updateCurrentConfig={updateCurrentConfig} onBack={onBack} />;
      case 'reminders': return <RemindersView currentConfig={activeConfig} updateCurrentConfig={updateCurrentConfig} onBack={onBack} setNotifications={setNotifications} />;
      case 'progress': return <ProgressView onBack={onBack} />;
      case 'exams': return <ExamsView onBack={onBackToGrid} />;
      case 'campaigns': return <CampaignsView students={activeConfig.students} currentConfig={activeConfig} updateCurrentConfig={updateCurrentConfig} onBack={onBackToGrid} setNotifications={setNotifications} />;
      case 'campaign-display': return (
        <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <button onClick={() => setViewType('campaigns')} className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">מעקב מבצעים חי</h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">צפייה בהתקדמות המבצעים הכיתתיים בזמן אמת</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm min-h-[600px] flex items-center justify-center">
            <div className="w-full max-w-5xl space-y-12">
               {activeConfig.campaigns && activeConfig.campaigns.length > 0 ? (
                 activeConfig.campaigns.map((c: any) => (
                    <div key={c.id} className="space-y-6">
                       <div className="flex items-end justify-between">
                          <div className="space-y-2">
                             <h3 className="text-4xl font-black text-slate-900 dark:text-white">{c.title}</h3>
                             <p className="text-xl font-bold text-slate-500">{c.description}</p>
                          </div>
                          <div className="text-right">
                             <span className="text-6xl font-black text-brand-600 tabular-nums">{Math.min(100, Math.round((c.currentPoints / c.targetPoints) * 100))}%</span>
                             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{c.currentPoints} מתוך {c.targetPoints} נקודות</p>
                          </div>
                       </div>
                       <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-full p-2 shadow-inner">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(100, (c.currentPoints / c.targetPoints) * 100)}%` }}
                             transition={{ duration: 1.5, ease: "easeOut" }}
                             className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full shadow-lg"
                          />
                       </div>
                       {c.reward && (
                         <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-900/50">
                            <Zap className="w-10 h-10 text-amber-500" />
                            <div>
                               <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em]">הפרס שלנו:</p>
                               <p className="text-2xl font-black text-amber-900 dark:text-amber-100">{c.reward}</p>
                            </div>
                         </div>
                       )}
                    </div>
                 ))
               ) : (
                 <div className="text-center space-y-4 opacity-50">
                    <Target className="w-20 h-20 mx-auto" />
                    <p className="text-2xl font-black">אין מבצעים פעילים להצגה</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      );
      case 'rewards': return <RewardsView rewards={activeConfig.rewards} student_points={activeConfig.student_points} updateCurrentConfig={updateCurrentConfig} onBack={onBackToGrid} />;
      case 'leaderboard': return <LeaderboardView students={activeConfig.students} student_points={activeConfig.student_points} onBack={onBackToGrid} />;
      case 'analytics': return <AnalyticsDashboardView currentConfig={activeConfig} onBack={onBackToGrid} />;
      case 'behaviorLog': return <BehaviorLogView currentConfig={activeConfig} updateCurrentConfig={updateCurrentConfig} onBack={onBackToGrid} />;
      case 'groups-management': return (
        <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBackToGrid}
              className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <div className="flex-1">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ניהול קבוצות ואילוצים</h2>
              <p className="text-slate-500 font-medium">הגדר קבוצות למידה, אילוצי ישיבה חברתיים ופדגוגיים שה-AI יתחשב בהם.</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm">
            <GroupManager 
              groups={activeConfig.groups} 
              updateCurrentConfig={updateCurrentConfig} 
              setNotifications={setNotifications} 
            />
          </div>
        </div>
      );
      case 'tools': return <ToolsView onBack={onBackToGrid} students={activeConfig.students} currentConfig={activeConfig} updateCurrentConfig={updateCurrentConfig} isDarkMode={isDarkMode} exportToExcel={exportToExcel} importFromCSV={importFromCSV} />;
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
          isAddStudentOpen={isAddStudentOpen}
          setIsAddStudentOpen={setIsAddStudentOpen}
          newStudent={newStudent}
          setNewStudent={setNewStudent}
          teacherProfile={teacherProfile}
          setTeacherProfile={setTeacherProfile}
          isTeacherModalOpen={isTeacherModalOpen}
          setIsTeacherModalOpen={setIsTeacherModalOpen}
          setIsBulkUpdateOpen={setIsBulkUpdateOpen}
        />
      );
      case 'studentDetail': {
        const student = activeConfig.students.find(s => s.id === selectedStudentId);
        return student ? (
          <StudentDetailView 
            student={student} 
            currentConfig={activeConfig}
            students={activeConfig.students}
            onBack={onBackToGrid} 
            updateCurrentConfig={updateCurrentConfig}
            onSelectStudent={setSelectedStudentId}
            aiWeights={aiWeights}
            setQuickPrefsStudentId={setQuickPrefsStudentId}
          />
        ) : null;
      }
      default: return null;
    }
  };
  const Header = () => {
    const today = new Date();
    const hd = new HDate(today);
    const hebDateString = hd.renderGematriya();
    
    return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-50 shadow-sm transition-colors">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 group"
          title={isSidebarOpen ? "סגור תפריט" : "פתח תפריט"}
        >
          <Menu className={cn("w-5 h-5 transition-transform stroke-[2.5px]", isSidebarOpen && "rotate-90 text-brand-600")} />
        </button>
        
        {/* Global Toolbar Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-100 dark:shadow-none">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-display font-black text-slate-900 dark:text-white leading-none tracking-tight uppercase">CLass&Sscool<span className="text-brand-600 ml-1">pro</span></h1>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-2 hidden lg:block" />

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2 gap-3 w-80 group focus-within:ring-2 ring-brand-100 transition-all">
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-brand-500" />
          <input 
            type="text" 
            placeholder="חפש תלמיד, ציון או משימה..." 
            className="bg-transparent border-none focus:ring-0 text-[13px] font-semibold text-slate-700 dark:text-slate-200 w-full placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="hidden lg:block px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-black text-slate-400 uppercase">CMD+K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="hidden xl:flex items-center gap-1.5 px-4 py-1.5 bg-[#eaf8be] border border-emerald-200/50 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-400">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[13px] font-bold tracking-tight">{hebDateString}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Buttons */}
          <button 
            onClick={() => setNotifications([])}
            className="relative p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all group"
          >
            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-[8px] font-black text-white">
                {notifications.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => {
              if (isPracticeMode) {
                customConfirm(
                  "שמירת שינויים",
                  "האם ברצנך לשמור את השינויים שביצעת במצב אימון ולהחיל אותם על הכיתה החיה?",
                  () => {
                    setCurrentConfig(practiceConfig || activeConfig);
                    setPracticeConfig(null);
                    setIsPracticeMode(false);
                    setNotifications(prev => [{ id: Date.now(), text: "השינויים הוחלו בהצלחה!", type: 'success' }, ...prev]);
                  }
                );
              } else {
                setPracticeConfig(JSON.parse(JSON.stringify(activeConfig)));
                setIsPracticeMode(true);
                setNotifications(prev => [{ id: Date.now(), text: "ברוכים הבאים למצב אימון! השינויים כאן לא ישפיעו על הכיתה החיה.", type: 'info' }, ...prev]);
              }
            }}
            className={cn(
              "p-3 rounded-2xl transition-all group",
              isPracticeMode 
              ? "bg-amber-500 text-white shadow-lg shadow-amber-200" 
              : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            )}
            title={isPracticeMode ? "שמור וסיים מצב אימון" : "הכנס למצב אימון"}
          >
            <FlaskConical className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button>

          {isPracticeMode && (
            <button 
              onClick={() => {
                customConfirm(
                  "ביטול שינויים",
                  "האם ברצנך לבטל את כל השינויים שביצעת במצב אימון?",
                  () => {
                    setPracticeConfig(null);
                    setIsPracticeMode(false);
                    setNotifications(prev => [{ id: Date.now(), text: "שינויי האימון בוטלו.", type: 'info' }, ...prev]);
                  }
                );
              }}
              className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-800 transition-all group"
              title="בטל וצא ממצב אימון"
            >
              <XCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}

          <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-1" />

          <button 
            onClick={() => setOnboardingStep(0)}
            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all group"
            title="סיור מודרך"
          >
            <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <div className="hidden xl:flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
            {[
              { id: 'default', color: 'bg-slate-400', name: 'קלאסי' },
              { id: 'wood', color: 'bg-amber-600', name: 'עץ' },
              { id: 'nature', color: 'bg-emerald-500', name: 'טבע' },
              { id: 'ocean', color: 'bg-sky-500', name: 'אוקיינוס' },
              { id: 'sunset', color: 'bg-rose-500', name: 'שקיעה' },
              { id: 'royal', color: 'bg-indigo-500', name: 'מלכותי' },
            ].map((t: any) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "w-8 h-8 rounded-xl transition-all flex items-center justify-center",
                  theme === t.id ? "ring-2 ring-brand-600 ring-offset-2 dark:ring-offset-slate-900 scale-110" : "hover:scale-105 opacity-60 hover:opacity-100"
                )}
                title={t.name}
              >
                <div className={cn("w-5 h-5 rounded-lg shadow-sm border border-white/20", t.color)} />
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all group"
            title="מדריך למשתמש"
          >
            <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <button 
            onClick={() => setViewType('settings')}
            className={cn(
              "p-3 rounded-2xl transition-all group",
              viewType === 'settings' ? "bg-brand-600 text-white shadow-lg" : "bg-slate-50 dark:bg-slate-800 text-slate-500"
            )}
            title="הגדרות"
          >
            <Settings2 className="w-5 h-5 group-hover:rotate-45 transition-transform" />
          </button>

          <button 
            onClick={() => setIsAIPanelOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-brand-100 hover:shadow-xl hover:scale-105 active:scale-95 transition-all group"
            title="הפעל סידור חכם (AI)"
          >
            <Zap className="w-4 h-4 fill-white animate-pulse" />
            <span className="hidden md:inline">סידור חכם</span>
          </button>

          <button 
            onClick={() => {
              setShowTimer(!showTimer);
              if (isTimerFinished) setIsTimerFinished(false);
            }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95 group",
              showTimer ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-800 hover:bg-slate-50"
            )}
            title="טיימר משימה"
          >
            <Timer className={cn("w-4 h-4", showTimer && "animate-spin-slow")} />
            <span className="hidden md:inline">טיימר</span>
          </button>
        </div>
      </div>
    </header>
    );
  };

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
  
  const exportToExcel = () => {
    const data = activeConfig.students.map((s: any) => ({
      'ID': s.id,
      'מזהה חיצוני': s.externalId || '',
      'שם מלא': s.name,
      'כינוי': s.nickname || '',
      'גובה': s.height === 'short' ? 'נמוך' : s.height === 'tall' ? 'גבוה' : 'בינוני',
      'צורך בתמיכה': s.supportNeeded || 'none',
      'רמת עניין': s.interestLevel || 'medium',
      'הערות': s.notes || '',
      'קבוצות': (s.groups || []).map((gId: string) => activeConfig.groups?.find((g: any) => g.id === gId)?.name).join('; ')
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "תלמידים");
    XLSX.writeFile(workbook, `students-export-${activeConfig.name || 'unnamed'}.xlsx`);
    
    setNotifications((prev: any) => [{ id: Date.now(), text: "נתוני תלמידים יוצאו לאקסל", type: 'success' }, ...prev]);
  };

  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(worksheet);

        const importedStudents = data.map((row, index) => ({
          id: row['ID'] || `imported-${Date.now()}-${index}`,
          name: row['שם מלא'] || row['Name'] || row['שם'] || 'תלמיד חדש',
          externalId: row['מזהה חיצוני'] || row['External ID'] || '',
          nickname: row['כינוי'] || row['Nickname'] || '',
          height: row['גובה'] === 'נמוך' ? 'short' : row['גובה'] === 'גבוה' ? 'tall' : 'medium',
          supportNeeded: row['צורך בתמיכה'] || 'none',
          interestLevel: row['רמת עניין'] || 'medium',
          notes: row['הערות'] || '',
          preferred: [],
          forbidden: [],
          separateFrom: [],
          forbiddenNeighbors: [],
          keepDistantFrom: [],
          groups: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        updateCurrentConfig((prev: any) => ({
          ...prev,
          students: [...prev.students, ...importedStudents]
        }));

        setNotifications((prev: any) => [{ id: Date.now(), text: `יובאו ${importedStudents.length} תלמידים בהצלחה`, type: 'success' }, ...prev]);
      } catch (err) {
        console.error("Import error:", err);
        setNotifications((prev: any) => [{ id: Date.now(), text: "שגיאה בייבוא הקובץ", type: 'error' }, ...prev]);
      }
    };
    reader.readAsBinaryString(file);
    // Reset input value
    e.target.value = '';
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
    <AnimatePresence mode="wait">
      {(isSidebarOpen || !isMobile) && (
        <>
          {isMobile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-brand-900/20 backdrop-blur-md z-[60]"
            />
          )}
          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: 300 }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "absolute z-[70] bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-all duration-500 ease-[0.23,1,0.32,1] h-full overflow-hidden",
              isMobile 
                ? "inset-x-0 bottom-0 h-[80vh] rounded-t-[3rem] border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]" 
                : cn(
                    "right-0 lg:relative lg:right-auto border-l border-slate-200 dark:border-slate-800",
                    isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-[300px] opacity-100"
                  )
            )}
          >
            {!isMobile && (
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={cn(
                  "absolute top-8 w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center z-[80] shadow-xl hover:bg-brand-50 transition-all active:scale-95 group",
                  isSidebarCollapsed ? "right-6" : "right-[284px]"
                )}
                title={isSidebarCollapsed ? "פתח תפריט" : "סגור תפריט"}
              >
                {isSidebarCollapsed ? <ChevronLeft className="w-5 h-5 text-brand-600 group-hover:scale-110" /> : <ChevronRight className="w-5 h-5 text-brand-600 group-hover:scale-110" />}
              </button>
            )}

            {isMobile && (
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-4 shrink-0" />
            )}
            <div className={cn(
              "flex flex-col gap-8 custom-scrollbar h-full overflow-y-auto transition-all",
              isSidebarCollapsed && !isMobile ? "p-4 items-center" : "p-6"
            )}>
      {/* Teacher Profile Avatar */}
      <button 
        onClick={() => setIsProfileModalOpen(true)}
        className={cn(
          "flex items-center gap-4 p-2 bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-slate-50 dark:border-slate-800 hover:border-accent-300 transition-all group shadow-sm",
          isSidebarCollapsed && !isMobile ? "w-12 h-12 p-0 justify-center overflow-hidden" : "w-full"
        )}
      >
        <div className="w-12 h-12 shrink-0 bg-accent-100 dark:bg-accent-900/30 rounded-xl flex items-center justify-center text-accent-600 transition-all group-hover:bg-accent-600 group-hover:text-white">
          <UserCircle2 className="w-8 h-8 transition-transform group-hover:scale-110" />
        </div>
        {!isSidebarCollapsed && (
          <div className="flex-1 text-right overflow-hidden">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{teacherProfile.name || 'המורה'}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{teacherProfile.role || 'לחץ להגדרת תפקיד'}</p>
            <p className="text-[9px] font-medium text-accent-600 truncate">{teacherProfile.school}</p>
          </div>
        )}
      </button>

      {/* Visual Navigation Menu */}
      <div className="space-y-2 w-full">
        {!isSidebarCollapsed && (
          <h3 className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-2 text-right">ניהול ראשי</h3>
        )}
        {(['dashboard', 'grid', 'behaviorLog', 'campaigns', 'leaderboard', 'rewards', 'analytics', 'attendance', 'grades', 'tasks', 'events', 'reminders', 'progress', 'exams', 'tools'] as const).map(nav => (
          <button
            key={nav}
            onClick={() => setViewTypeWithTransition(nav)}
            className={cn(
              "w-full flex items-center gap-4 rounded-2xl font-bold text-sm transition-all group relative overflow-hidden",
              viewType === nav 
                ? "bg-brand-600 text-white shadow-lg shadow-brand-200 dark:shadow-none" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
              isSidebarCollapsed && !isMobile ? "p-3 justify-center" : "p-4"
            )}
            title={isSidebarCollapsed ? nav : undefined}
          >
            <div className={cn(
              "p-2 rounded-xl transition-colors shrink-0",
              viewType === nav ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20"
            )}>
              {nav === 'dashboard' && <PieChartIcon className="w-5 h-5" />}
              {nav === 'grid' && <LayoutGrid className="w-5 h-5" />}
              {nav === 'behaviorLog' && <ClipboardList className="w-5 h-5" />}
              {nav === 'attendance' && <Calendar className="w-5 h-5" />}
              {nav === 'grades' && <GraduationCap className="w-5 h-5" />}
              {nav === 'tasks' && <Bell className="w-5 h-5" />}
              {nav === 'events' && <History className="w-5 h-5" />}
              {nav === 'reminders' && <Clock className="w-5 h-5" />}
              {nav === 'campaigns' && <Target className="w-5 h-5" />}
              {nav === 'rewards' && <Zap className="w-5 h-5" />}
              {nav === 'leaderboard' && <Trophy className="w-5 h-5" />}
              {nav === 'analytics' && <BarChart3 className="w-5 h-5" />}
              {nav === 'progress' && <LineChart className="w-5 h-5" />}
              {nav === 'exams' && <Bookmark className="w-5 h-5" />}
              {nav === 'tools' && <Wrench className="w-5 h-5" />}
            </div>
            {!isSidebarCollapsed && (
              <span className="truncate flex-1 text-right">
                {nav === 'dashboard' && 'ראשי'}
                {nav === 'grid' && 'מרחב כיתה'}
                {nav === 'behaviorLog' && 'יומן התנהגות'}
                {nav === 'attendance' && 'נוכחות'}
                {nav === 'grades' && 'ציונים'}
                {nav === 'tasks' && 'משימות'}
                {nav === 'events' && 'יומן אירועים'}
                {nav === 'reminders' && 'תזכורות'}
                {nav === 'campaigns' && 'מבצעים'}
                {nav === 'rewards' && 'מתנות ופרסים'}
                {nav === 'leaderboard' && 'טבלת ליגה'}
                {nav === 'analytics' && 'אנליטיקה'}
                {nav === 'progress' && 'התקדמות'}
                {nav === 'exams' && 'מבחנים'}
                {nav === 'tools' && 'ארגז כלים'}
              </span>
            )}
            
            {viewType === nav && !isSidebarCollapsed && (
              <motion.div layoutId="sidebar-active" className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-200 rounded-r-full" />
            )}
          </button>
        ))}
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />

      {/* Classroom Header */}
      {!isSidebarCollapsed && (
        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl flex flex-col gap-4 border border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1 text-right">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">כיתה פעילה</h3>
              <Badge className="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-800">v3.2.0</Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={currentConfig.name}
                onChange={(e) => updateCurrentConfig((prev: any) => ({ ...prev, name: e.target.value }))}
                className="text-xl font-bold text-slate-900 dark:text-white bg-transparent border-0 p-0 focus:ring-0 flex-1 leading-none text-right"
              />
              <button 
                onClick={() => {
                  const newName = prompt("הזן שם חדש לכיתה:", currentConfig.name);
                  if (newName && newName !== currentConfig.name) {
                    confirmCustom("שינוי שם כיתה", `האם לשנות את שם הכיתה ל-"${newName}"?`, () => {
                      updateCurrentConfig((prev: any) => ({ ...prev, name: newName }));
                    });
                  }
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-600 transition-all font-sans"
                title="שנה שם כיתה"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 custom-scrollbar">
        {viewType === 'grid' ? (
        <>
          {/* Group Constraints Section */}
          <div className="flex flex-col gap-4">
             <h3 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest px-1">אילוצי קבוצות</h3>
              <div className="grid grid-cols-1 gap-3">
                {activeConfig.groups.map((group: any) => (
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

          {/* Quick Add Student Form */}
          <div className="bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              הוספה מהירה
            </h3>
            <div className="space-y-3">
              <input 
                type="text"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                placeholder="שם התלמיד..."
                className="w-full bg-white dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900/50 rounded-xl p-3 text-sm focus:border-brand-300 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-all font-bold"
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAddStudent()}
              />
              <div className="flex gap-2">
                {(['short', 'medium', 'tall'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setQuickAddHeight(h)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black transition-all border-2",
                      quickAddHeight === h 
                        ? "bg-brand-600 text-white border-brand-600 shadow-md" 
                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-brand-200"
                    )}
                  >
                    {h === 'short' ? 'נמוך' : h === 'medium' ? 'בינוני' : 'גבוה'}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar p-1">
                {activeConfig.groups.map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setQuickAddGroups(prev => 
                        prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                      );
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black transition-all border shrink-0",
                      quickAddGroups.includes(g.id)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleQuickAddStudent}
                disabled={!quickAddName.trim()}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                הוסף למאגר
              </button>
            </div>
          </div>

          {/* Student Pool */}
          <div className="flex flex-col gap-4 min-h-[200px]">
            <div className="flex flex-col gap-3 px-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">ממתינים לשיבוץ ({studentsInPool.length})</h3>
                <button 
                  onClick={() => setIsAddStudentOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600 text-slate-500 rounded-xl bg-slate-50 border border-slate-200 transition-colors font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  הוסף תלמיד
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePredefinedImport}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-[10px] font-black transition-all border border-indigo-100"
                  title="ייבוא רשימת דוגמה"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  ייבוא רשימה
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-[10px] font-black transition-all border border-emerald-100"
                  title="ייבוא מקובץ CSV/Excel"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  ייבוא CSV
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCSVImport}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                />
              </div>
            </div>
            <Reorder.Group 
              axis="y" 
              values={studentsInPool} 
              onReorder={(newPool) => {
                updateCurrentConfig((prev: any) => {
                  const newStudents = [...prev.students];
                  // Map the new pool order back to the students array
                  const poolIds = studentsInPool.map(s => s.id);
                  let poolIdx = 0;
                  const result = newStudents.map(s => {
                    if (poolIds.includes(s.id)) {
                      return newPool[poolIdx++];
                    }
                    return s;
                  });
                  return { ...prev, students: result };
                });
              }}
              className="grid grid-cols-1 gap-3 p-2 rounded-2xl transition-all min-h-[100px]"
            >
              {studentsInPool.length === 0 ? (
                <EmptyState 
                  icon={<CheckCircle2 className="w-10 h-10" />}
                  title="הכל מוכן!"
                  description="כל התלמידים משולבים בכיתה בהצלחה."
                />
              ) : (
                studentsInPool.map((student) => (
                  <Reorder.Item
                    key={student.id}
                    value={student}
                    draggable
                    animate={draggedStudentId === student.id ? { scale: 0.95, opacity: 0.5 } : { scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.02, x: 5, backgroundColor: isDarkMode ? "rgba(30, 41, 59, 1)" : "rgba(248, 250, 252, 1)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onDragStart={() => {
                      setDraggedStudentId(student.id);
                    }}
                    onDragEnd={() => {
                      setDraggedStudentId(null);
                    }}
                    onClick={() => setSelectedStudentId(student.id === selectedStudentId ? null : student.id)}
                    className={cn(
                      "p-4 border-2 rounded-2xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-all group relative",
                      isDarkMode ? "bg-slate-900" : "bg-white",
                      draggedStudentId === student.id 
                        ? "border-brand-500 shadow-2xl z-50 ring-4 ring-brand-500/20" 
                        : (selectedStudentId === student.id ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-brand-500"),
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-600 dark:text-slate-400 text-base shrink-0">
                        {student.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-black text-slate-900 dark:text-slate-100">{student.name}</span>
                        <div className="flex items-center gap-1">
                           <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">גרור לשיבוץ/סידור</span>
                        </div>
                      </div>
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
                      <button 
                        onClick={() => setQuickPrefsStudentId && setQuickPrefsStudentId(student.id)}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="העדפות זריזות"
                      >
                        <Sliders className="w-5 h-5" />
                      </button>
                    </div>
                  </Reorder.Item>
                ))
              )}
            </Reorder.Group>
          </div>

          {/* Conflict Analysis Section */}
          <div className="glass-card p-6 bg-rose-50/10 border border-rose-100 dark:border-rose-900/20 rounded-[2.5rem]">
            <ConflictPanel 
              conflicts={conflicts} 
              students={activeConfig.students}
              onResolve={(conflict: any) => {
                setNotifications(prev => [{ id: Date.now(), text: `הצעה: העבר את ${activeConfig.students.find((s:any)=>s.id===conflict.studentId1)?.name} למקום פנוי בשורה 1`, type: 'info' }, ...prev]);
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
        </>
      ) : (
        /* Generic Sidebar View */
        <div className="flex flex-col gap-4 min-h-[400px]">
          {/* Quick Add Student Form */}
          <div className="bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              הוספה מהירה
            </h3>
            <div className="space-y-3">
              <input 
                type="text"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                placeholder="שם התלמיד..."
                className="w-full bg-white dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900/50 rounded-xl p-3 text-sm focus:border-brand-300 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 transition-all font-bold"
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAddStudent()}
              />
              <div className="flex gap-2">
                {(['short', 'medium', 'tall'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setQuickAddHeight(h)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black transition-all border-2",
                      quickAddHeight === h 
                        ? "bg-brand-600 text-white border-brand-600 shadow-md" 
                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-brand-200"
                    )}
                  >
                    {h === 'short' ? 'נמוך' : h === 'medium' ? 'בינוני' : 'גבוה'}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar p-1">
                {activeConfig.groups.map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setQuickAddGroups(prev => 
                        prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                      );
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black transition-all border shrink-0",
                      quickAddGroups.includes(g.id)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleQuickAddStudent}
                disabled={!quickAddName.trim()}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                הוסף למאגר
              </button>
            </div>
          </div>
             <div className="flex items-center justify-between px-1">
               <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">מאגר תלמידים מלא ({(currentConfig as any).students.length})</h3>
               <button 
                 onClick={() => setIsAddStudentOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600 text-slate-500 rounded-xl bg-slate-50 border border-slate-200 transition-colors font-bold text-xs"
               >
                 <Plus className="w-4 h-4" />
                 הוסף
               </button>
             </div>
             <Reorder.Group 
               axis="y" 
               values={(currentConfig as any).students} 
               onReorder={(newStudents) => updateCurrentConfig((prev: any) => ({ ...prev, students: newStudents }))}
               className="grid grid-cols-1 gap-2"
             >
                 {(currentConfig as any).students.map((student: any) => (
                   <Reorder.Item 
                        key={student.id} 
                        value={student}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between hover:border-brand-500 hover:shadow-sm transition-all cursor-pointer group" 
                        onClick={() => { setSelectedStudentId(student.id); setViewType('studentDetail'); }}
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                         {student.name[0]}
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand-600">{student.name}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">גרור לשינוי סדר</span>
                       </div>
                     </div>
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-brand-500 mr-2" />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickPrefsStudentId && setQuickPrefsStudentId(student.id);
                        }}
                        className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="העדפות זריזות"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-brand-500" />
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          )}
        </div>

            {/* Main Actions */}

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setIsAIPanelOpen(true)}
                  disabled={isLoadingAI}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden",
                    isLoadingAI 
                      ? "bg-slate-100 text-slate-400" 
                      : "bg-gradient-to-tr from-accent-600 to-indigo-600 text-white shadow-accent-200 hover:scale-[1.02] active:scale-[0.98] ring-4 ring-white/10"
                  )}
                >
                  {isLoadingAI ? (
                    <>
                      <motion.div
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-2 h-2 bg-white rounded-full"
                      />
                      <span className="relative z-10">הסידור בביצוע...</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <Wand2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="tracking-tight text-lg">שיבוץ חכם AI</span>
                    </>
                  )}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={exportToExcel} className="flex items-center justify-center gap-3 px-2 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-bold hover:bg-emerald-100 border border-emerald-100 dark:border-emerald-800 transition-all">
                    <Download className="w-5 h-5" />
                    Excel
                  </button>
                  <button onClick={() => setViewTypeWithTransition('tools')} className="flex items-center justify-center gap-3 px-2 py-4 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 rounded-2xl text-xs font-bold hover:bg-sky-100 border border-sky-100 dark:border-sky-800 transition-all">
                    <Upload className="w-5 h-5" />
                    ייבוא
                  </button>
                  <button onClick={exportToPDF} className="flex items-center justify-center gap-3 px-2 py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-bold hover:bg-rose-100 border border-rose-100 dark:border-rose-800 transition-all">
                    <FileDown className="w-5 h-5" />
                    PDF
                  </button>
                  <button onClick={exportToJSON} className="flex items-center justify-center gap-3 px-2 py-4 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold hover:bg-slate-100 border border-slate-200 dark:border-slate-800 transition-all">
                    <Share2 className="w-5 h-5" />
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  const Breadcrumbs = () => {
    const labels: Record<string, string> = {
      'dashboard': 'ראשי',
      'grid': 'מרחב כיתה',
      'attendance': 'נוכחות',
      'grades': 'ציונים',
      'tasks': 'משימות ורשימות',
      'progress': 'התקבלות וניתוח',
      'exams': 'מבחנים',
      'tools': 'ארגז כלים',
      'settings': 'הגדרות',
      'studentDetail': 'פרופיל תלמיד',
      'events': 'אירועים'
    };

    return (
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 pt-6">
        <button onClick={() => setViewType('dashboard')} className="hover:text-brand-600 transition-colors uppercase">CLASSFLOW</button>
        <ChevronLeft className="w-4 h-4 opacity-50" />
        <span className="text-slate-900 dark:text-white">{labels[viewType] || viewType}</span>
        {viewType === 'studentDetail' && selectedStudentId && (
          <>
            <ChevronLeft className="w-4 h-4 opacity-50" />
            <span className="text-brand-600 font-bold">{activeConfig.students.find(s => s.id === selectedStudentId)?.name}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <ConfirmModal />
      <AnimatePresence>
        {isViewLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-6"
          >
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-3 h-3 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-3 h-3 bg-brand-400 rounded-full animate-bounce" />
             </div>
             <p className="text-slate-900 dark:text-white font-black text-xl tracking-tight">כבר נפתח...</p>
          </motion.div>
        )}

        {quickPrefsStudentId && (
          <StudentQuickPrefsModal
            studentId={quickPrefsStudentId}
            currentConfig={activeConfig}
            updateCurrentConfig={updateCurrentConfig}
            onClose={() => setQuickPrefsStudentId(null)}
            isDarkMode={isDarkMode}
            conflicts={conflicts}
          />
        )}
        
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
                  {onboardingContent[onboardingStep]?.icon}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">{onboardingContent[onboardingStep]?.title}</h2>
                <p className="text-base text-slate-600 font-medium leading-relaxed">{onboardingContent[onboardingStep]?.text}</p>
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
        {currentUser ? Sidebar() : (
          <div className="fixed inset-0 z-[300] bg-slate-900 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8"
              dir="rtl"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <School className="w-10 h-10 text-brand-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white">ברוכים הבאים</h2>
                <p className="text-slate-500 font-bold">{authMode === 'login' ? 'התחבר למערכת CLASSFLOW' : 'צור חשבון חדש ב-CLASSFLOW'}</p>
              </div>

              <form onSubmit={(e) => {
                const formData = new FormData(e.currentTarget);
                handleAuth(e, formData.get('email') as string, formData.get('password') as string, formData.get('name') as string);
              }} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">שם מלא</label>
                    <input name="name" required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 outline-none focus:border-brand-500 transition-all font-bold" placeholder="ישראל ישראלי" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">אימייל</label>
                  <input name="email" required type="email" className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 outline-none focus:border-brand-500 transition-all font-bold" placeholder="name@school.org" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">סיסמה</label>
                  <input name="password" required type="password" className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 outline-none focus:border-brand-500 transition-all font-bold" placeholder="••••••••" />
                </div>
                {authError && <p className="text-rose-500 text-xs font-bold px-2">{authError}</p>}
                <button 
                  type="submit" 
                  disabled={isAuthLoading}
                  className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black shadow-xl shadow-brand-100 flex items-center justify-center gap-2 hover:bg-brand-700 transition-all disabled:opacity-50"
                >
                  {isAuthLoading ? 'בטעינה...' : (authMode === 'login' ? 'התחברות' : 'הרשמה')}
                  <LogIn className="w-5 h-5" />
                </button>
              </form>

              <div className="text-center pt-4">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-brand-600 font-black text-sm hover:underline"
                >
                  {authMode === 'login' ? 'אין לך חשבון? הירשם עכשיו' : 'כבר יש לך חשבון? התחבר'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

            <main className={cn(
              "flex-1 overflow-hidden relative flex flex-col transition-all duration-500",
              !isMobile && isSidebarCollapsed ? "mr-0" : ""
            )}>
              <div className="h-16 px-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-40">
                <div className="flex items-center gap-4 text-right">
                  {isMobile && (
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500">
                      <LayoutGrid className="w-6 h-6" />
                    </button>
                  )}
                  <Breadcrumbs />
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={undo} 
                      disabled={undoHistory.length === 0}
                      className={cn("p-2 rounded-lg transition-all", undoHistory.length > 0 ? "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm" : "opacity-30 cursor-not-allowed")}
                      title="ביטול פעולה"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={redo} 
                      disabled={redoHistory.length === 0}
                      className={cn("p-2 rounded-lg transition-all", redoHistory.length > 0 ? "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm" : "opacity-30 cursor-not-allowed")}
                      title="שחזור פעולה"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-brand-600 transition-all border border-slate-100 dark:border-slate-700">
                    {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                  </button>
                  <div className="flex items-center gap-2 p-1 px-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-brand-700 dark:text-brand-400 font-mono uppercase tracking-widest">Synced</span>
                  </div>
                </div>
              </div>

              <motion.div 
                className="flex-1 overflow-hidden relative"
                layout
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={viewType}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="h-full w-full overflow-hidden flex flex-col"
                  >
                    {viewType === 'grid' ? (
                      <div className="flex-1 flex overflow-hidden">
                        {!isMobile && (
                          <aside className="w-72 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-10 shrink-0">
                            <StudentPickerGrid 
                              students={activeConfig.students} 
                              currentConfig={activeConfig} 
                              searchQuery={searchQuery}
                              setSearchQuery={setSearchQuery}
                              onAddStudent={() => setIsAddStudentOpen(true)}
                              onQuickPrefs={setQuickPrefsStudentId}
                              onSort={(s: any) => setSortBy(s)}
                              isPracticeMode={isPracticeMode}
                            />
                          </aside>
                        )}
                        <div className={cn(
                          "flex-1 flex flex-col overflow-hidden relative select-none",
                          is3DView ? "bg-slate-900/10 dark:bg-black/50" : "bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:32px_32px] bg-slate-50 dark:bg-slate-950"
                        )}>
                   {/* Grid Toolbar */}
                   <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 mb-10 z-30 shadow-bento shrink-0 relative">
                     {/* Dashboard Link */}
                     <button 
                       onClick={() => setViewTypeWithTransition('dashboard')}
                       className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-brand-600 rounded-xl transition-all shadow-sm group"
                       title="חזרה לראשי"
                     >
                       <PieChartIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     </button>

                     <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
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
                       <button onClick={() => setEditMode('placement')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", editMode === 'placement' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}>שיבוץ</button>
                       <button onClick={() => setEditMode('structure')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", editMode === 'structure' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}>מבנה</button>
                     </div>
                     
                     {editMode === 'structure' && (
                       <div className="flex items-center gap-4 mr-2 border-r border-slate-200 dark:border-slate-800 pr-4">
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase">טורים:</span>
                           <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-0.5">
                             <button 
                               onClick={() => updateCurrentConfig((prev: any) => {
                                 if (prev.cols <= 1) return prev;
                                 const newCols = prev.cols - 1;
                                 const newGrid = Array(newCols * prev.rows).fill(null);
                                 for (let r = 0; r < prev.rows; r++) {
                                   for (let c = 0; c < newCols; c++) {
                                     newGrid[r * newCols + c] = prev.grid[r * prev.cols + c];
                                   }
                                 }
                                 return { ...prev, cols: newCols, grid: newGrid };
                               })} 
                               className="p-1 hover:text-brand-600 transition-colors"
                             >
                               <Minus className="w-3 h-3" />
                             </button>
                             <span className="text-xs font-black w-6 text-center">{activeConfig.cols}</span>
                             <button 
                               onClick={() => updateCurrentConfig((prev: any) => {
                                 if (prev.cols >= 15) return prev;
                                 const newCols = prev.cols + 1;
                                 const newGrid = Array(newCols * prev.rows).fill(null);
                                 for (let r = 0; r < prev.rows; r++) {
                                   for (let c = 0; c < prev.cols; c++) {
                                     newGrid[r * newCols + c] = prev.grid[r * prev.cols + c];
                                   }
                                 }
                                 return { ...prev, cols: newCols, grid: newGrid };
                               })} 
                               className="p-1 hover:text-brand-600 transition-colors"
                             >
                               <Plus className="w-3 h-3" />
                             </button>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase">שורות:</span>
                           <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-0.5">
                             <button 
                               onClick={() => updateCurrentConfig((prev: any) => {
                                 if (prev.rows <= 1) return prev;
                                 const newRows = prev.rows - 1;
                                 return { ...prev, rows: newRows, grid: prev.grid.slice(0, prev.cols * newRows) };
                               })} 
                               className="p-1 hover:text-brand-600 transition-colors"
                             >
                               <Minus className="w-3 h-3" />
                             </button>
                             <span className="text-xs font-black w-6 text-center">{activeConfig.rows}</span>
                             <button 
                               onClick={() => updateCurrentConfig((prev: any) => {
                                 if (prev.rows >= 12) return prev;
                                 const newRows = prev.rows + 1;
                                 return { ...prev, rows: newRows, grid: [...prev.grid, ...Array(prev.cols).fill(null)] };
                               })} 
                               className="p-1 hover:text-brand-600 transition-colors"
                             >
                               <Plus className="w-3 h-3" />
                             </button>
                           </div>
                         </div>
                       </div>
                     )}
                     
                     <div className="w-px h-6 bg-slate-200/50 mx-1" />

                     <button
                        onClick={() => setIs3DView(!is3DView)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                          is3DView ? "bg-amber-100 text-amber-700 shadow-sm border border-amber-200" : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                        )}
                        title="תצוגת תלת-ממד"
                     >
                        <Box className="w-4 h-4" />
                        <span>3D</span>
                     </button>

                     <button
                        onClick={() => setIsFurnitureModalOpen(true)}
                        className="px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                        title="ניהול ריהוט"
                     >
                        <Layout className="w-4 h-4" />
                        <span>ריהוט</span>
                     </button>

                     <button
                        onClick={() => {
                          setIsMultiSelectMode(!isMultiSelectMode);
                          if (!isMultiSelectMode) setSelectedStudentIds([]);
                        }}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                          isMultiSelectMode ? "bg-brand-600 text-white shadow-lg shadow-brand-100" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                        )}
                        title="בחירה מרובה של תלמידים"
                     >
                        <MousePointer2 className="w-4 h-4" />
                        <span>בחירה מרובה</span>
                     </button>

                     {is3DView && (
                       <div className="flex items-center gap-3 bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-2xl">
                         <div className="flex items-center gap-1">
                           {(['standard', 'birdsEye', 'studentLevel', 'free'] as const).map(angle => (
                             <button
                               key={angle}
                               onClick={() => {
                                 setCameraAngle(angle);
                                 if (angle === 'standard') { setRotationY(0); setRotationX(50); setZoomLevel(0.9); setPanX(0); setPanY(0); }
                                 if (angle === 'birdsEye') { setRotationY(0); setRotationX(80); setZoomLevel(0.85); setPanX(0); setPanY(-100); }
                                 if (angle === 'studentLevel') { setRotationY(0); setRotationX(25); setZoomLevel(1.1); setPanX(0); setPanY(-20); }
                                  if (angle === 'free') { /* keep current */ }
                               }}
                               className={cn(
                                 "px-3 py-1 rounded-lg text-[9px] font-black transition-all",
                                 cameraAngle === angle ? "bg-white dark:bg-slate-800 text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                               )}
                             >
                               {angle === 'standard' ? 'רגיל' : angle === 'birdsEye' ? 'מבט על' : angle === 'studentLevel' ? 'עיני תלמיד' : 'חופשי'}
                             </button>
                           ))}
                         </div>
                         <div className="w-px h-6 bg-slate-200/50 dark:bg-slate-700 mx-1" />
                         <div className="flex items-center gap-2 px-2">
                            <RotateCcw className="w-3 h-3 text-slate-400 cursor-pointer" onClick={() => setRotationY(0)} />
                            <input 
                              type="range" min="-180" max="180" value={rotationY} 
                              onChange={(e) => { setRotationY(parseInt(e.target.value)); setCameraAngle('free'); }}
                              className="w-20 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-500" 
                            />
                         </div>
                         <div className="flex items-center gap-2 px-2">
                            <Maximize2 className="w-3 h-3 text-slate-400 cursor-pointer" onClick={() => setZoomLevel(1)} />
                             <input 
                               type="range" min="0.3" max="2.5" step="0.05" value={zoomLevel} 
                               onChange={(e) => { setZoomLevel(parseFloat(e.target.value)); setCameraAngle('free'); }}
                               className="w-16 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-500" 
                             />
                          </div>
                          <div className="flex items-center gap-2 px-2" title="סיבוב אנכי">
                             <ChevronUp className="w-3 h-3 text-slate-400 cursor-pointer" onClick={() => setRotationX(50)} />
                             <input 
                               type="range" min="0" max="90" value={rotationX} 
                               onChange={(e) => { setRotationX(parseInt(e.target.value)); setCameraAngle('free'); }}
                               className="w-16 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-500" 
                             />
                          </div>
                        </div>
                      )}
                     
                     <div className="w-px h-6 bg-slate-200/50 mx-1" />

                     {/* Group Filter */}
                     <div className="flex items-center gap-2">
                       <Filter className="w-4 h-4 text-slate-400" />
                       <div className="flex gap-1 overflow-x-auto max-w-[200px] scrollbar-hide py-1">
                          {(activeConfig.groups || []).map((group: any) => (
                            <button
                               key={group.id}
                               onClick={() => setSelectedGroups((prev: string[]) => prev.includes(group.id) ? prev.filter((pg: string) => pg !== group.id) : [...prev, group.id])}
                               className={cn(
                                 "px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap",
                                 selectedGroups.includes(group.id) ? "bg-brand-600 text-white shadow-md shadow-brand-100" : "bg-slate-50 text-slate-500 border border-slate-100"
                               )}
                            >
                              קבוצה {group.name}
                            </button>
                          ))}
                          {(activeConfig.groups || []).length === 0 && <span className="text-[10px] text-slate-400 italic">לא הוגדרו קבוצות</span>}
                       </div>
                     </div>

                     <div className="w-px h-6 bg-slate-200/50 mx-1" />

                      <button 
                        onClick={exportLayoutToImage}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-brand-600 transition-all flex items-center gap-2 group/btn"
                        title="ייצא כתמונה"
                      >
                         <ImageIcon className="w-5 h-5" />
                         <span className="text-[10px] font-black uppercase tracking-widest hidden lg:group-hover/btn:block shrink-0">ייצא תמונה</span>
                      </button>

                      <div className="w-px h-6 bg-slate-200/50 mx-1" />

                      {editMode === 'structure' ? (
                       <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                           <span className="text-xs font-black text-slate-500 uppercase px-2">שורות</span>
                           <button onClick={() => handleGridResize('rows', -1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Minus className="w-3 h-3" /></button>
                           <span className="w-6 text-center font-black text-xs">{activeConfig.rows}</span>
                           <button onClick={() => handleGridResize('rows', 1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Plus className="w-3 h-3" /></button>
                         </div>
                         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                           <span className="text-xs font-black text-slate-500 uppercase px-2">טורים</span>
                           <button onClick={() => handleGridResize('cols', -1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Minus className="w-3 h-3" /></button>
                           <span className="w-6 text-center font-black text-xs">{activeConfig.cols}</span>
                           <button onClick={() => handleGridResize('cols', 1)} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><Plus className="w-3 h-3" /></button>
                         </div>

                         {/* Gap Adjustment Controls */}
                         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <div className="flex flex-col items-center px-1">
                              <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5 whitespace-nowrap">מרווח רוחב</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.max(8, prev.columnGapSize - 4) }))} className="p-0.5 hover:bg-white rounded text-slate-500"><Minus className="w-3 h-3" /></button>
                                <span className="min-w-[16px] text-center font-black text-[9px]">{activeConfig.columnGapSize}</span>
                                <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.min(120, prev.columnGapSize + 4) }))} className="p-0.5 hover:bg-white rounded text-slate-500"><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                            <div className="w-px h-6 bg-slate-200 mx-0.5" />
                            <div className="flex flex-col items-center px-1">
                              <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5 whitespace-nowrap">מרווח גובה</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, rowGapSize: Math.max(8, (prev.rowGapSize || 32) - 4) }))} className="p-0.5 hover:bg-white rounded text-slate-500"><Minus className="w-3 h-3" /></button>
                                <span className="min-w-[16px] text-center font-black text-[9px]">{activeConfig.rowGapSize || 32}</span>
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
                    <ResponsiveGridContainer is3DView={is3DView}>
                      <div ref={gridRef} className="relative w-full flex flex-col items-center" id="classroom-grid-container">
                        {/* Print Header only for PDF */}
                        {isPrinting && (
                          <div className="w-full text-center mb-12 py-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100">
                             <h1 className="text-4xl font-black text-slate-900">מפת הושבה: {activeConfig.name}</h1>
                             <div className="flex items-center justify-center gap-6 mt-4">
                                <span className="px-4 py-2 bg-white rounded-xl text-slate-600 font-bold border border-slate-200 shadow-sm">סה"כ תלמידים: {activeConfig.students.length}</span>
                                <span className="px-4 py-2 bg-white rounded-xl text-slate-600 font-bold border border-slate-200 shadow-sm">תאריך: {new Date().toLocaleDateString('he-IL')}</span>
                             </div>
                             <p className="text-slate-400 font-bold mt-4 text-xs tracking-widest">הופק באמצעות CLass&scool pro-manager AI</p>
                          </div>
                        )}
                       {/* Floating UI for Structure Mode */}
                       {editMode === 'structure' && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-6 z-50">
                             <div className="flex items-center gap-3">
                               <span className="text-sm font-bold text-slate-600 dark:text-slate-300">שורות</span>
                               <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                  <button onClick={() => activeConfig.rows > 1 && updateCurrentConfig((prev: any) => ({ ...prev, rows: prev.rows - 1, grid: prev.grid.slice(0, (prev.rows - 1) * prev.cols) }))} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-slate-700 dark:text-slate-200 font-bold transition-all">-</button>
                                  <div className="w-10 h-8 flex items-center justify-center font-black text-brand-600 tabular-nums">{activeConfig.rows}</div>
                                  <button onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, rows: prev.rows + 1, grid: [...prev.grid, ...Array(prev.cols).fill(null)] }))} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-slate-700 dark:text-slate-200 font-bold transition-all">+</button>
                               </div>
                             </div>
                             <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                             <div className="flex items-center gap-3">
                               <span className="text-sm font-bold text-slate-600 dark:text-slate-300">טורים</span>
                               <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                  <button onClick={() => {
                                      if (activeConfig.cols > 1) {
                                          updateCurrentConfig((prev: any) => {
                                              const newGrid = [];
                                              const newCols = prev.cols - 1;
                                              for (let i = 0; i < prev.rows; i++) {
                                                  newGrid.push(...prev.grid.slice(i * prev.cols, i * prev.cols + newCols));
                                              }
                                              return { ...prev, cols: newCols, grid: newGrid };
                                          });
                                      }
                                  }} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-slate-700 dark:text-slate-200 font-bold transition-all">-</button>
                                  <div className="w-10 h-8 flex items-center justify-center font-black text-brand-600 tabular-nums">{activeConfig.cols}</div>
                                  <button onClick={() => {
                                      updateCurrentConfig((prev: any) => {
                                          const newGrid = [];
                                          const newCols = prev.cols + 1;
                                          for (let i = 0; i < prev.rows; i++) {
                                              newGrid.push(...prev.grid.slice(i * prev.cols, i * prev.cols + prev.cols), null);
                                          }
                                          return { ...prev, cols: newCols, grid: newGrid };
                                      });
                                  }} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-slate-700 dark:text-slate-200 font-bold transition-all">+</button>
                               </div>
                             </div>
                             {activeConfig.teacherDesk.index === -1 && (
                                <>
                                   <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                                   <button 
                                     onClick={() => updateCurrentConfig((prev: any) => ({ ...prev, teacherDesk: { ...prev.teacherDesk, index: 0 } }))}
                                     className="px-4 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-all flex items-center gap-2 text-sm"
                                   >
                                     <Plus className="w-4 h-4" />
                                     שולחן מורה
                                   </button>
                                </>
                             )}
                          </div>
                        )}

                    <div 
                      className={cn(
                        "grid p-20 transition-all duration-1000 relative classroom-floor",
                        editMode === 'structure' 
                         ? "bg-white dark:bg-slate-900 ring-[12px] ring-amber-400 ring-offset-[12px] ring-offset-slate-100 dark:ring-offset-slate-950 rounded-[5rem] shadow-bento" 
                         : "bg-white dark:bg-slate-900 rounded-[5rem] border-4 border-slate-200 dark:border-slate-800 shadow-2xl",
                        is3DView && "!bg-slate-200 dark:!bg-slate-950 shadow-[0_100px_100px_-50px_rgba(0,0,0,0.5)] border-0 rounded-none ring-0 overflow-visible"
                      )}
                     style={{ 
                       display: 'grid', 
                       width: isMobile ? '95vw' : '1200px', 
                       height: isMobile ? '60vh' : '700px', 
                       padding: isMobile ? '20px' : '60px',
                       gap: isMobile ? '12px' : '24px',
                       placeContent: 'center',
                       gridTemplateColumns: Array.from({ length: activeConfig.cols }).map((_, i) => 
                         `${activeConfig.columnGaps.includes(i) ? `${isMobile ? '40px' : '80px'} ${activeConfig.columnGapSize || (isMobile ? 20 : 40)}px` : (isMobile ? '40px' : '80px')}`
                       ).join(' '),
                       gridTemplateRows: Array.from({ length: activeConfig.rows }).map((_, i) => 
                         `${activeConfig.rowGapSize ? (activeConfig.rowGaps.includes(i) ? `${isMobile ? '36px' : '56px'} ${activeConfig.rowGapSize}px` : (isMobile ? '36px' : '56px')) : (activeConfig.rowGaps.includes(i) ? (isMobile ? '36px 16px' : '56px 32px') : (isMobile ? '36px' : '56px'))}`
                       ).join(' '),
                       transformStyle: 'preserve-3d',
                       perspective: is3DView ? '1200px' : 'none',
                       ...(is3DView ? {
                         transform: cameraAngle === 'birdsEye' 
                           ? `rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(0deg) translateZ(-50px) translateX(${panX}px) translateY(${panY}px) scale(${zoomLevel})`
                           : cameraAngle === 'studentLevel'
                           ? `rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(0deg) translateZ(150px) translateX(${panX}px) translateY(${panY}px) scale(${zoomLevel})`
                           : `rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(0deg) translateZ(-50px) translateX(${panX}px) translateY(${panY}px) scale(${zoomLevel})`,
                       } : { 
                         perspective: '1200px',
                         transform: isMobile ? `scale(${Math.min(1, window.innerWidth / 1300)})` : 'none'
                       })
                     }}
                    >
                      {/* Furniture Items */}
                      {(activeConfig.furniture || []).map((item: any) => (
                        <FurnitureItem 
                          key={item.id} 
                          item={item} 
                          is3DView={is3DView} 
                          updateCurrentConfig={updateCurrentConfig} 
                        />
                      ))}

                      {/* 3D Walls */}
                      {is3DView && (
                        <>
                          {/* Right Wall (Window side) */}
                          <div 
                            className={cn(
                              "absolute top-0 right-0 h-full w-[1500px] bg-gradient-to-l opacity-40 pointer-events-none",
                              theme === 'wood' ? "from-amber-900/40" : 
                              theme === 'nature' ? "from-emerald-900/40" :
                              theme === 'ocean' ? "from-sky-900/40" :
                              theme === 'royal' ? "from-indigo-900/40" :
                              theme === 'sunset' ? "from-rose-900/40" :
                              "from-slate-300 dark:from-slate-900/50"
                            )}
                            style={{ transform: 'rotateY(90deg) translateZ(600px)', transformOrigin: 'right' }}
                          >
                            <div className="absolute inset-y-20 left-40 w-80 h-[500px] bg-white opacity-20 blur-2xl" />
                            <div className="absolute inset-y-20 left-[600px] w-80 h-[500px] bg-white opacity-20 blur-2xl" />
                          </div>
                          {/* Top Wall (Chalkboard side) */}
                          <div 
                            className={cn(
                              "absolute top-0 inset-x-0 w-full h-[800px] opacity-20 pointer-events-none",
                              theme === 'wood' ? "bg-amber-900" : 
                              theme === 'nature' ? "bg-emerald-900" :
                              theme === 'ocean' ? "bg-sky-900" :
                              theme === 'royal' ? "bg-indigo-900" :
                              theme === 'sunset' ? "bg-rose-900" :
                              "bg-slate-300 dark:bg-slate-900"
                            )}
                            style={{ transform: 'rotateX(-90deg) translateZ(0px)', transformOrigin: 'top' }}
                          />
                          {/* Floor shadows/reflections */}
                          <div className="absolute inset-0 bg-brand-500/5 pointer-events-none" />
                        </>
                      )}

                      {/* Sunlight effect on floor */}
                      {is3DView && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 pointer-events-none" />
                      )}
                      {/* Chalkboard (Only in 3D View) */}
                      {is3DView && (
                        <div 
                           className={cn(
                             "absolute -top-[350px] left-1/2 -translate-x-1/2 w-[900px] h-[280px] border-[18px] shadow-[0_50px_100px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center rounded-sm",
                             theme === 'wood' ? "bg-amber-950 border-[#3e2723]" :
                             theme === 'nature' ? "bg-[#1b5e20] border-[#3e2723]" :
                             theme === 'ocean' ? "bg-[#01579b] border-slate-700" :
                             theme === 'royal' ? "bg-[#311b92] border-yellow-600" :
                             theme === 'sunset' ? "bg-[#880e4f] border-orange-800" :
                             "bg-slate-800 dark:bg-black border-[#5d4037]"
                           )}
                           style={{ transform: 'translateZ(100px) rotateX(-90deg)', transformOrigin: 'bottom' }}
                        >
                           <div className="absolute top-2 left-4 flex gap-2">
                             <div className="w-12 h-2 bg-white/10 rounded-full" />
                             <div className="w-8 h-2 bg-white/10 rounded-full" />
                           </div>
                           <span className="text-white/40 font-mono text-4xl opacity-30 select-none pointer-events-none tracking-widest uppercase" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.8)' }}>
                             {theme === 'wood' ? 'Forest Academy' : 
                              theme === 'nature' ? 'Eco-Learning' :
                              theme === 'ocean' ? 'Deep Sea Study' :
                              theme === 'royal' ? 'Royal Hall' :
                              theme === 'sunset' ? 'Golden Hour' :
                              'Modern Classroom'}
                           </span>
                           <div className="absolute bottom-4 right-8 flex gap-4">
                             <div className="w-10 h-3 bg-white/20 rounded shadow-inner" title="Magnet" />
                             <div className="w-10 h-3 bg-white/20 rounded shadow-inner" title="Magnet" />
                           </div>
                        </div>
                      )}
                    {/* Teacher Desk Injection */}
                    {activeConfig.teacherDesk && activeConfig.teacherDesk.index !== -1 && (
                      <TeacherDesk 
                        {...activeConfig.teacherDesk}
                        totalCols={activeConfig.cols}
                        totalRows={activeConfig.rows}
                        colPos={(activeConfig.teacherDesk.index % activeConfig.cols) + 1 + activeConfig.columnGaps.filter(g => g < (activeConfig.teacherDesk.index % activeConfig.cols)).length}
                        rowPos={Math.floor(activeConfig.teacherDesk.index / activeConfig.cols) + 1 + activeConfig.rowGaps.filter(g => g < Math.floor(activeConfig.teacherDesk.index / activeConfig.cols)).length}
                        editMode={editMode}
                        updateCurrentConfig={updateCurrentConfig}
                        is3DView={is3DView}
                      />
                    )}

                     {/* Gap Handles (Structure Mode Only) */}
                    {editMode === 'structure' && (
                      <>
                         {/* Column Gap Handles */}
                         {Array.from({ length: activeConfig.cols - 1 }).map((_, i) => {
                           const colPos = (i + 1) + currentConfig.columnGaps.filter(g => g <= i).length;
                           const hasGap = currentConfig.columnGaps.includes(i);
                           const isHovered = hoveredColGap === i;
                           
                           return (
                             <div 
                               key={`col-gap-${i}`}
                               onMouseEnter={() => setHoveredColGap(i)}
                               onMouseLeave={() => setHoveredColGap(null)}
                               style={{ 
                                 gridColumn: hasGap ? colPos + 1 : colPos, 
                                 gridRow: `1 / span ${activeConfig.rows + (activeConfig.rowGaps?.length || 0) + 1}`,
                                 width: hasGap ? `${currentConfig.columnGapSize}px` : '20px',
                                 marginRight: hasGap ? `-${currentConfig.columnGapSize / 2}px` : '-10px',
                                 marginLeft: hasGap ? `-${currentConfig.columnGapSize / 2}px` : '-10px',
                                 justifySelf: 'center',
                                 zIndex: isHovered || hasGap ? 40 : 10
                               }}
                               className={cn(
                                 "h-full relative flex items-center justify-center transition-colors duration-300",
                                 hasGap ? "bg-brand-500/5 shadow-[inset_0_0_10px_rgba(37,99,235,0.05)]" : "hover:bg-brand-50/30"
                               )}
                             >
                                {(isHovered || hasGap) && (
                                  <div className={cn(
                                    "absolute inset-y-0 border-x border-dashed pointer-events-none transition-opacity",
                                    hasGap ? "border-brand-200/40 w-full" : "border-brand-300/60 w-px",
                                    isHovered ? "opacity-100" : "opacity-40"
                                  )} />
                                )}

                                <div 
                                  onClick={() => updateCurrentConfig((prev: any) => ({
                                    ...prev,
                                    columnGaps: prev.columnGaps.includes(i) ? prev.columnGaps.filter((g: number) => g !== i) : [...prev.columnGaps, i]
                                  }))}
                                  className={cn(
                                    "w-1 h-12 cursor-pointer transition-all rounded-full z-10",
                                    hasGap ? "bg-brand-500 scale-y-125 shadow-lg" : "bg-slate-300 hover:bg-brand-400 hover:h-20"
                                  )} 
                                />
                                
                                {(hasGap || isHovered) && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute top-4 flex flex-col items-center pointer-events-none z-50"
                                  >
                                    <div className={cn(
                                      "bg-white shadow-xl border rounded-[1.5rem] px-2 py-3 flex flex-col items-center gap-1.5 pointer-events-auto transition-colors",
                                      hasGap ? "border-brand-200" : "border-slate-200 opacity-60 hover:opacity-100"
                                    )}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.min((prev.columnGapSize || 40) + 4, 120) })); }}
                                className="p-1 hover:bg-brand-50 text-brand-600 rounded-full transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                                      <div className="flex flex-col items-center -space-y-0.5">
                                        <Ruler className="w-3 h-3 text-slate-300" />
                                        <span className="text-[10px] font-black text-brand-700">{hasGap ? activeConfig.columnGapSize : (activeConfig.columnGapSize || 40)}px</span>
                                      </div>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, columnGapSize: Math.max((prev.columnGapSize || 40) - 4, 8) })); }}
                                        className="p-1 hover:bg-brand-50 text-brand-600 rounded-full transition-colors"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {!hasGap && <div className="mt-2 text-[8px] font-black text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">לחץ להוספת מרווח</div>}
                                  </motion.div>
                                )}
                             </div>
                           );
                         })}

                         {/* Row Gap Handles */}
                         {Array.from({ length: activeConfig.rows - 1 }).map((_, i) => {
                           const rowPos = (i + 1) + currentConfig.rowGaps.filter(g => g <= i).length;
                           const hasGap = currentConfig.rowGaps.includes(i);
                           const isHovered = hoveredRowGap === i;
                           
                           return (
                             <div 
                               key={`row-gap-${i}`}
                               onMouseEnter={() => setHoveredRowGap(i)}
                               onMouseLeave={() => setHoveredRowGap(null)}
                               style={{ 
                                 gridRow: hasGap ? rowPos + 1 : rowPos, 
                                 gridColumn: `1 / span ${activeConfig.cols + (activeConfig.columnGaps?.length || 0) + 1}`,
                                 height: hasGap ? `${currentConfig.rowGapSize || 32}px` : '20px',
                                 marginTop: hasGap ? `-${(currentConfig.rowGapSize || 32) / 2}px` : '-10px',
                                 marginBottom: hasGap ? `-${(currentConfig.rowGapSize || 32) / 2}px` : '-10px',
                                 alignSelf: 'center',
                                 zIndex: isHovered || hasGap ? 40 : 10
                               }}
                               className={cn(
                                 "w-full relative flex items-center justify-center transition-colors duration-300",
                                 hasGap ? "bg-amber-500/5 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]" : "hover:bg-amber-50/30"
                               )}
                             >
                                {/* Horizontal Dashed Line Indicator */}
                                {(isHovered || hasGap) && (
                                  <div className={cn(
                                    "absolute inset-x-0 border-y border-dashed pointer-events-none transition-opacity",
                                    hasGap ? "border-amber-200/40 h-full" : "border-amber-300/60 h-px",
                                    isHovered ? "opacity-100" : "opacity-40"
                                  )} />
                                )}

                                <div 
                                  onClick={() => updateCurrentConfig((prev: any) => ({
                                    ...prev,
                                    rowGaps: prev.rowGaps.includes(i) ? prev.rowGaps.filter((g: number) => g !== i) : [...prev.rowGaps, i]
                                  }))}
                                  className={cn(
                                    "h-1 w-12 cursor-pointer transition-all rounded-full z-10",
                                    hasGap ? "bg-amber-500 scale-x-125 shadow-lg" : "bg-slate-300 hover:bg-amber-400 hover:w-20"
                                  )} 
                                />

                                {(hasGap || isHovered) && (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="absolute left-4 flex items-center pointer-events-none z-50"
                                  >
                                    <div className={cn(
                                      "bg-white shadow-xl border rounded-[1.5rem] px-3 py-2 flex items-center gap-2 pointer-events-auto transition-colors",
                                      hasGap ? "border-amber-200" : "border-slate-200 opacity-60 hover:opacity-100"
                                    )}>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, rowGapSize: Math.max((prev.rowGapSize || 32) - 4, 8) })); }}
                                        className="p-1 hover:bg-amber-50 text-amber-600 rounded-full transition-colors"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <div className="flex items-center gap-1.5">
                                        <Ruler className="w-3 h-3 text-slate-300" />
                                        <span className="text-[10px] font-black text-amber-700">{hasGap ? (activeConfig.rowGapSize || 32) : 32}px</span>
                                      </div>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateCurrentConfig((prev: any) => ({ ...prev, rowGapSize: Math.min((prev.rowGapSize || 32) + 4, 120) })); }}
                                        className="p-1 hover:bg-amber-50 text-amber-600 rounded-full transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {!hasGap && <div className="mr-2 text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">לחץ להוספת מרווח</div>}
                                  </motion.div>
                                )}
                             </div>
                           );
                         })}
                      </>
                    )}

                    {Array.from({ length: activeConfig.rows }).map((_, r) => (
                      Array.from({ length: activeConfig.cols }).map((_, c) => {
                        const idx = r * activeConfig.cols + c;
                        const studentId = activeConfig.grid[idx];
                        const student = activeConfig.students.find(s => s.id === studentId);
                        const isHidden = activeConfig.hiddenDesks.includes(idx);
                        
                        // Calculate grid position accounting for gaps
                        const colPos = c + 1 + activeConfig.columnGaps.filter(g => g < c).length;
                        const rowPos = r + 1 + activeConfig.rowGaps.filter(g => g < r).length;

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
                            setSelectedStudentId={setSelectedStudentId}
                            selectedGroups={selectedGroups}
                            onDrop={handleDrop}
                            updateCurrentConfig={updateCurrentConfig}
                            currentConfig={activeConfig}
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
                            setNewStudent={setNewStudent}
                            setIsAddStudentOpen={setIsAddStudentOpen}
                            setNotifications={setNotifications}
                            setQuickPrefsStudentId={setQuickPrefsStudentId}
                            setDraggedStudentId={setDraggedStudentId}
                            selectedStudentIds={selectedStudentIds}
                            setSelectedStudentIds={setSelectedStudentIds}
                            isMultiSelectMode={isMultiSelectMode}
                            conflicts={conflicts}
                          />
                        );
                      })
                    ))}
                  </div>
                  <AnimatePresence>
                    {selectedStudentIds.length > 0 && (
                      <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] glass-card px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-6 border-2 border-brand-200 dark:border-brand-800"
                      >
                        <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-6">
                           <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-brand-200">
                              {selectedStudentIds.length}
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-800 dark:text-white">תלמידים נבחרו</p>
                              <button onClick={() => setSelectedStudentIds([])} className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline">ביטול בחירה</button>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => {
                               const category = BEHAVIOR_CATEGORIES[0];
                               selectedStudentIds.forEach(id => {
                                 handleUpdatePoints(id, category.points, category.label, category.id);
                               });
                               setSelectedStudentIds([]);
                               setNotifications(prev => [{ id: Date.now(), text: `עודכנה הצטיינות ל-${selectedStudentIds.length} תלמידים`, type: 'success' }, ...prev]);
                             }}
                             className="p-3 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-2xl transition-all flex items-center gap-2"
                           >
                             <Star className="w-5 h-5" />
                             <span className="text-xs font-black">הצטיינות</span>
                           </button>
                           
                           <button 
                             onClick={() => {
                               const category = BEHAVIOR_CATEGORIES[4]; 
                               selectedStudentIds.forEach(id => {
                                 handleUpdatePoints(id, category.points, category.label, category.id);
                               });
                               setSelectedStudentIds([]);
                               setNotifications(prev => [{ id: Date.now(), text: `דווחה הפרעה ל-${selectedStudentIds.length} תלמידים`, type: 'orange' }, ...prev]);
                             }}
                             className="p-3 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-2xl transition-all flex items-center gap-2"
                           >
                             <Megaphone className="w-5 h-5" />
                             <span className="text-xs font-black">הפרעה</span>
                           </button>

                           <button 
                             onClick={() => {
                               updateCurrentConfig((prev: any) => {
                                 const newGrid = [...prev.grid];
                                 selectedStudentIds.forEach(id => {
                                   const idx = newGrid.indexOf(id);
                                   if (idx !== -1) newGrid[idx] = null;
                                 });
                                 return { ...prev, grid: newGrid };
                               });
                               setSelectedStudentIds([]);
                               setNotifications(prev => [{ id: Date.now(), text: `${selectedStudentIds.length} תלמידים הוסרו מהשיבוץ`, type: 'info' }, ...prev]);
                             }}
                             className="p-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-2xl transition-all flex items-center gap-2"
                           >
                             <LogOut className="w-5 h-5" />
                             <span className="text-xs font-black">הסר מהשיבוץ</span>
                           </button>
                           
                            <button 
                             onClick={() => {
                                setIsBulkBehaviorModalOpen(true);
                             }}
                             className="p-3 bg-brand-600 text-white hover:bg-brand-700 rounded-2xl transition-all shadow-md flex items-center gap-2"
                           >
                             <ClipboardList className="w-5 h-5" />
                             <span className="text-xs font-black">עדכון מורחב</span>
                           </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                   </div>
                 </ResponsiveGridContainer>
                </div>
              </div>
            ) : renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
        </main>
      </div>

      {/* Panels & Modals at Root level */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8" dir="rtl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">פרופיל אישי</h2>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-brand-100 rounded-3xl flex items-center justify-center text-brand-600">
                    <UserCircle2 className="w-16 h-16" />
                  </div>
                  <p className="text-slate-500 font-bold">{currentUser?.email}</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">שם תצוגה</label>
                    <input 
                      type="text" 
                      defaultValue={currentUser?.displayName || ''} 
                      onBlur={async (e) => {
                        if (currentUser && e.target.value !== currentUser.displayName) {
                          await updateProfile(currentUser, { displayName: e.target.value });
                          await updateDoc(doc(db, 'users', currentUser.uid), { displayName: e.target.value, updatedAt: new Date().toISOString() });
                          setTeacherProfile(prev => ({ ...prev, name: e.target.value }));
                          setNotifications(prev => [{ id: Date.now(), text: "פרופיל עודכן", type: 'success' }, ...prev]);
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 outline-none focus:border-brand-500 transition-all font-bold" 
                    />
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-rose-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-rose-50 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    התנתקות מהמערכת
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
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
                           {activeConfig.students
                             .slice()
                             .sort((a: any, b: any) => a.name.localeCompare(b.name, 'he'))
                             .map((s: any, idx: number) => {
                               const deskIdx = activeConfig.grid.indexOf(s.id);
                               const sRow = deskIdx !== -1 ? Math.floor(deskIdx / activeConfig.cols) + 1 : null;
                               const sCol = deskIdx !== -1 ? (deskIdx % activeConfig.cols) + 1 : null;
                               const group = s.groups && s.groups.length > 0 ? activeConfig.groups.find((g: any) => g.id === s.groups[0]) : null;

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
                           Generated by CLass&scool pro-manager // End of Report
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
      
      <AnimatePresence>
        {showHelpModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-brand-50 dark:bg-brand-900/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">מדריך למשתמש - CLass&scool pro-manager</h2>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">כל מה שצריך לדעת כדי לנהל את הכיתה בצורה חכמה</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar" dir="rtl">
                {/* Section 1: Dashboard */}
                <section>
                  <h3 className="text-xl font-black text-brand-600 dark:text-brand-400 mb-6 flex items-center gap-3">
                    <Layout className="w-6 h-6" /> 1. ניהול סביבת העבודה (Dashboard)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-right">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 underline underline-offset-4 decoration-brand-200">סידור הכיתה:</p>
                      <ul className="list-disc list-inside space-y-2 pr-2">
                        <li>גררו תלמידים מהרשימה הימנית אל הגריד המרכזי.</li>
                        <li>לשינוי מקום: פשוט גררו תלמיד קיים למשבצת חדשה.</li>
                        <li>המערכת שומרת את מיקומי התלמידים בכל תצורה.</li>
                      </ul>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 underline underline-offset-4 decoration-brand-200">תצורות (Configurations):</p>
                      <ul className="list-disc list-inside space-y-2 pr-2">
                        <li>צרו תצורות שונות (למשל: "מבחן", "עבודה בקבוצות").</li>
                        <li>השתמשו בלחצן ה-AI (המטה הקסום) לסידור אוטומטי חכם.</li>
                        <li>ניתן לעבור למצב "אימון" כדי לנסות סידורים בלי לשנות את הכיתה החיה.</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Section 2: Student Detail */}
                <section>
                  <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mb-6 flex items-center gap-3">
                    <User className="w-6 h-6" /> 2. תיק תלמיד דיגיטלי
                  </h3>
                  <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-right">
                    <p>בלחיצה על תלמיד נפתח מסך הפרטים המלא, המכיל:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <FileText className="w-5 h-5 text-amber-500 mb-2" />
                        <p className="font-black text-slate-800 dark:text-slate-200 text-sm">הערות פדגוגיות:</p>
                        <p className="text-xs leading-relaxed mt-1">תיעוד חופשי עם חותמת זמן "עודכן לאחרונה", תגיות לסינון ושליטה על גובה תיבת הטקסט.</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <FolderOpen className="w-5 h-5 text-brand-500 mb-2" />
                        <p className="font-black text-slate-800 dark:text-slate-200 text-sm">מרכז מסמכים:</p>
                        <p className="text-xs leading-relaxed mt-1">העלאה ושמירה של אבחונים, מכתבים רפואיים ותעודות שנשמרים בענן עבור כל תלמיד.</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <Brain className="w-5 h-5 text-purple-500 mb-2" />
                        <p className="font-black text-slate-800 dark:text-slate-200 text-sm">המלצות AI:</p>
                        <p className="text-xs leading-relaxed mt-1">שימוש ב-Gemini AI לניתוח ביצועי התלמיד והפקת טיפים פדגוגיים ישימים.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Professional Tools */}
                <section>
                  <h3 className="text-xl font-black text-purple-600 dark:text-purple-400 mb-6 flex items-center gap-3">
                    <Zap className="w-6 h-6" /> 3. כלים מקצועיים נוספים
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600 dark:text-slate-400 text-right">
                    <div className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <BarChart3 className="w-8 h-8 text-rose-500 flex-shrink-0" />
                      <div>
                        <p className="font-black text-slate-800 dark:text-white">ניתוח נתונים (Analytics)</p>
                        <p className="text-sm font-medium leading-relaxed">מעקב אחר מגמות כיתתיות, רמות מעורבות ושביעות רצון באמצעות גרפים אינטראקטיביים.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <Download className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="font-black text-slate-800 dark:text-white">ייצוא והדפסה</p>
                        <p className="text-sm font-medium leading-relaxed">ייצוא סידורי כיתה ל-PDF מעוצב להדפסה, או שמירת נתונים כקובץ JSON לגיבוי.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="p-8 bg-brand-50 dark:bg-brand-900/20 rounded-[2.5rem] border border-brand-100 dark:border-brand-800/50 text-center shadow-inner">
                  <p className="text-brand-800 dark:text-brand-200 font-bold mb-3 italic">"הכלי הזה נבנה כדי להוריד ממך את העומס הבירוקרטי ולתת לך מקום לפדגוגיה אמיתית."</p>
                  <p className="text-brand-600 dark:text-brand-400 text-sm font-black uppercase tracking-widest">— צוות CLass&scool pro-manager</p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="px-12 py-4 bg-brand-600 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all hover:scale-105 active:scale-95"
                >
                  הבנתי, בואו נתחיל!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showTimer && (
          <FloatingTimer 
            seconds={timerSeconds}
            isRunning={isTimerRunning}
            onToggle={() => setIsTimerRunning(!isTimerRunning)}
            onReset={() => {
              setIsTimerRunning(false);
              setTimerSeconds(timerDuration);
              setIsTimerFinished(false);
            }}
            onClose={() => setShowTimer(false)}
            onAdjust={adjustTimer}
            duration={timerDuration}
            isFinished={isTimerFinished}
          />
        )}
      </AnimatePresence>

      {/* Notifications & Overlays */}
      {isIssuesPanelOpen && (
        <IssuesPanelModal
          conflicts={conflicts}
          students={activeConfig.students}
          updateCurrentConfig={updateCurrentConfig}
          onClose={() => setIsIssuesPanelOpen(false)}
        />
      )}
      {isGroupsPanelOpen && (
        <GroupsPanelModal
          groups={activeConfig.groups}
          updateCurrentConfig={updateCurrentConfig}
          setNotifications={setNotifications}
          onClose={() => setIsGroupsPanelOpen(false)}
        />
      )}
      {isBulkUpdateOpen && (
        <BulkUpdateModal 
          students={activeConfig.students}
          groups={activeConfig.groups}
          onClose={() => setIsBulkUpdateOpen(false)}
          onUpdate={(updates: any[]) => {
            updateCurrentConfig((prev: any) => ({
              ...prev,
              students: updates
            }));
          }}
        />
      )}
      {isBulkBehaviorModalOpen && (
        <BulkBehaviorModal 
          students={activeConfig.students}
          selectedIds={selectedStudentIds}
          categories={BEHAVIOR_CATEGORIES}
          onClose={() => setIsBulkBehaviorModalOpen(false)}
          onAction={(ids: string[], points: number, reason: string, categoryId: string) => {
            ids.forEach(id => handleUpdatePoints(id, points, reason, categoryId));
            setSelectedStudentIds([]);
            setNotifications(prev => [{ id: Date.now(), text: `עודכן ${reason} ל-${ids.length} תלמידים`, type: 'success' }, ...prev]);
          }}
        />
      )}

      {/* Floating Notifications */}
      <FloatingAIAssistant onCommand={handleAICommand} />
      <div className="fixed bottom-[80px] lg:bottom-14 left-6 z-[110] flex flex-col gap-3 pointer-events-none">
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

      {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 py-3 z-[100] pb-[calc(12px+env(safe-area-inset-bottom))]">
        {([
          { id: 'dashboard', icon: <PieChartIcon className="w-5 h-5" />, label: 'ראשי' },
          { id: 'attendance', icon: <Calendar className="w-5 h-5" />, label: 'נוכחות' },
          { id: 'grades', icon: <GraduationCap className="w-5 h-5" />, label: 'ציונים' },
          { id: 'progress', icon: <LineChart className="w-5 h-5" />, label: 'התקדמות' },
          { id: 'tools', icon: <Wrench className="w-5 h-5" />, label: 'כלים' },
          { id: 'grid', icon: <LayoutGrid className="w-5 h-5" />, label: 'כיתה' }
        ] as const).map(nav => (
          <button
            key={nav.id}
            onClick={() => {
              setViewType(nav.id);
              setIsSidebarOpen(false);
            }}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative flex-1",
              viewType === nav.id 
                ? "text-brand-600 dark:text-brand-400" 
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {nav.icon}
            <span className="text-[10px] font-black">{nav.label}</span>
            {viewType === nav.id && (
              <motion.div layoutId="mobile-nav-active" className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-600 rounded-b-lg" />
            )}
          </button>
        ))}
      </nav>

      <footer className="hidden lg:flex h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0 transition-colors">
        <div>CLass&scool pro-manager // Ready</div>
        <div className="flex gap-4">
          <span>{activeConfig.students.length} תלמידים</span>
          <span>•</span>
          <span>{activeConfig.grid.filter(id => id).length} משובצים</span>
        </div>
      </footer>
      {isFurnitureModalOpen && (
        <FurnitureManager 
          furniture={activeConfig.furniture} 
          updateCurrentConfig={updateCurrentConfig} 
          onClose={() => setIsFurnitureModalOpen(false)} 
        />
      )}
    </div>
    </>
  );
}
