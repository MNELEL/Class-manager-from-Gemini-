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
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LayoutGrid,
  Square,
  Columns,
  Rows,
  Bell,
  Heart,
  Ban,
  ArrowRightLeft,
  Monitor,
  Eye,
  Share2,
  Printer,
  ZoomIn,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";
import { ClassroomState, Student, StudentGroup, EditMode, ClassroomConfig, Notification, AccessibilitySettings } from './types';
import { cn } from './lib/utils';

// --- Components ---

const Badge = ({ children, className, style }: { children: React.ReactNode, className?: string, key?: any, style?: React.CSSProperties }) => (
  <span 
    style={style}
    className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}
  >
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

  const currentConfig = useMemo(() => {
    const config = state.configs.find(c => c.id === state.currentConfigId) || state.configs[0];
    return {
      ...config,
      students: config.students || [],
      grid: config.grid || [],
      locked: config.locked || [],
      hiddenDesks: config.hiddenDesks || [],
      columnGaps: config.columnGaps || [],
      rowGaps: config.rowGaps || [],
      groups: config.groups || [],
    };
  }, [state]);

  const [history, setHistory] = useState<ClassroomConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editMode, setEditMode] = useState<EditMode>('normal');
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isGroupsPanelOpen, setIsGroupsPanelOpen] = useState(false);
  const [isIssuesOpen, setIsIssuesOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(state.accessibility || {
    highContrast: false,
    fontSize: 'medium'
  });
  const [exportOptions, setExportOptions] = useState({
    includeNames: true,
    includeIds: false,
    includeRowCol: true,
    includePreferences: true,
    includeGroups: true,
    includeFullGroups: true
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [aiResponse, setAiResponse] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'name' | 'row' | 'col'>('name');
  const [selectedSidebarStudentIds, setSelectedSidebarStudentIds] = useState<(string | number)[]>([]);
  const [showDeskNumbers, setShowDeskNumbers] = useState(false);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [aiWeights, setAiWeights] = useState({ preferred: 8, forbidden: 10, separateFrom: 7, height: 6, position: 6 });
  const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const filteredAndSortedStudents = useMemo(() => {
    return [...(currentConfig.students || [])]
      .filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        
        if (groupFilter === "all") return true;
        if (groupFilter === "none") {
          return !(currentConfig.groups || []).some(g => g.studentIds.includes(s.id));
        }
        const group = currentConfig.groups?.find(g => g.id === groupFilter);
        return group?.studentIds.includes(s.id);
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'he');
        const idxA = currentConfig.grid.indexOf(a.id);
        const idxB = currentConfig.grid.indexOf(b.id);
        if (sortBy === 'row') {
          const rowA = idxA === -1 ? 999 : Math.floor(idxA / currentConfig.cols);
          const rowB = idxB === -1 ? 999 : Math.floor(idxB / currentConfig.cols);
          return rowA - rowB || a.name.localeCompare(b.name, 'he');
        }
        if (sortBy === 'col') {
          const colA = idxA === -1 ? 999 : idxA % currentConfig.cols;
          const colB = idxB === -1 ? 999 : idxB % currentConfig.cols;
          return colA - colB || a.name.localeCompare(b.name, 'he');
        }
        return 0;
      });
  }, [currentConfig.students, currentConfig.grid, currentConfig.cols, searchQuery, sortBy, groupFilter]);

  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Persistence & History ---
  
  // Bootstrap user requests
  useEffect(() => {
    const bootstrapFlag = 'cm_bootstrapped_v2';
    if (localStorage.getItem(bootstrapFlag)) return;

    setState(prev => {
      const configIndex = prev.configs.findIndex(c => c.id === prev.currentConfigId);
      if (configIndex === -1) return prev;
      
      const newConfigs = [...prev.configs];
      const config = { ...newConfigs[configIndex] };
      const students = [...(config.students || [])];
      const groups = [...(config.groups || [])];
      const locked = [...(config.locked || [])];

      // 1. Add 'תלמיד חדש 1'
      if (!students.find(s => s.name === 'תלמיד חדש 1')) {
        students.push({
          id: 's-new-1',
          name: 'תלמיד חדש 1',
          preferred: [],
          forbidden: [],
          separateFrom: [],
          forbiddenNeighbors: []
        });
      }

      // 2. Add תלמיד א, ב, ג, ד, ה if they don't exist
      const names = ['תלמיד א', 'תלמיד ב', 'תלמיד ג', 'תלמיד ד', 'תלמיד ה'];
      names.forEach(name => {
        if (!students.find(s => s.name === name)) {
          students.push({
            id: `s-${name}`,
            name,
            preferred: [],
            forbidden: [],
            separateFrom: [],
            forbiddenNeighbors: []
          });
        }
      });

      // Update תלמיד ג
      const sC = students.find(s => s.name === 'תלמיד ג');
      if (sC) {
        sC.preferredRow = 'front';
        sC.height = 'short';
      }

      // Update תלמיד ד and ה link
      const sD = students.find(s => s.name === 'תלמיד ד');
      const sE = students.find(s => s.name === 'תלמיד ה');
      if (sD && sE) {
        if (!sD.preferred.includes(sE.id)) {
          sD.preferred.push(sE.id);
        }
      }

      // 3. Create Group 'קבוצת שיתוף פעולה'
      if (!groups.find(g => g.name === 'קבוצת שיתוף פעולה')) {
        const sA = students.find(s => s.name === 'תלמיד א');
        const sB = students.find(s => s.name === 'תלמיד ב');
        groups.push({
          id: 'g-coop',
          name: 'קבוצת שיתוף פעולה',
          color: '#3b82f6',
          studentIds: [sA?.id, sB?.id].filter(Boolean) as (string | number)[],
          constraints: { together: true }
        });
      }

      // 4. Add 'תלמיד ד' to 'קבוצת עבודה'
      let gWork = groups.find(g => g.name === 'קבוצת עבודה');
      if (!gWork) {
        gWork = {
          id: 'g-work',
          name: 'קבוצת עבודה',
          color: '#10b981',
          studentIds: [],
          constraints: { together: true }
        };
        groups.push(gWork);
      }
      const sD_obj = students.find(s => s.name === 'תלמיד ד');
      if (sD_obj && !gWork.studentIds.includes(sD_obj.id)) {
        gWork.studentIds.push(sD_obj.id);
      }

      // 5. Lock desk (3, 4) -> 3*8 + 4 = 28
      if (!locked.includes(28)) {
        locked.push(28);
      }

      config.students = students;
      config.groups = groups;
      config.locked = locked;
      newConfigs[configIndex] = config;

      return { ...prev, configs: newConfigs };
    });

    localStorage.setItem(bootstrapFlag, 'true');
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Continuous auto-save on state change
  useEffect(() => {
    setIsSaving(true);
    localStorage.setItem('cm_state_multi', JSON.stringify(state));
    const now = new Date();
    setLastSaved(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    const timer = setTimeout(() => setIsSaving(false), 800);
    return () => clearTimeout(timer);
  }, [state]);

  // Periodic auto-save every 2 minutes (as requested, though redundant)
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('cm_state_multi', JSON.stringify(state));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 120000);
    return () => clearInterval(interval);
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
      const rawCurrent = prev.configs.find(c => c.id === prev.currentConfigId) || prev.configs[0];
      const current = {
        ...rawCurrent,
        students: rawCurrent.students || [],
        grid: rawCurrent.grid || [],
        locked: rawCurrent.locked || [],
        hiddenDesks: rawCurrent.hiddenDesks || [],
        columnGaps: rawCurrent.columnGaps || [],
        rowGaps: rawCurrent.rowGaps || [],
        groups: rawCurrent.groups || [],
      };
      const nextConfig = { ...updater(current), updatedAt: Date.now() };
      
      // Update history
      const nextDeskHistory = { ...(nextConfig.deskHistory || {}) };
      if (nextConfig.grid) {
        nextConfig.grid.forEach((id, idx) => {
          if (id !== current.grid[idx]) {
            const history = nextDeskHistory[idx] || [];
            if (history.length === 0 || history[history.length - 1].studentId !== id) {
              nextDeskHistory[idx] = [...history, { studentId: id, timestamp: Date.now() }];
            }
          }
        });
      }
      nextConfig.deskHistory = nextDeskHistory;

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
    (currentConfig.grid || []).forEach((id, idx) => {
      if (id !== null && !(currentConfig.hiddenDesks || []).includes(idx)) seatOf[id] = idx;
    });

    (currentConfig.students || []).forEach(student => {
      const idx = seatOf[student.id];
      if (idx === undefined) return;
      const { col, row } = idxToColRow(idx);

      // Preferred
      (student.preferred || []).forEach(pid => {
        if (seatOf[pid] === undefined) return;
        total++;
        const { col: pc, row: pr } = idxToColRow(seatOf[pid]);
        const d = Math.abs(col - pc) + Math.abs(row - pr);
        if (d <= 1) satisfied++; else if (d <= 2) partial++; else violated++;
      });

      // Forbidden
      (student.forbidden || []).forEach(fid => {
        if (seatOf[fid] === undefined) return;
        total++;
        const { col: fc, row: fr } = idxToColRow(seatOf[fid]);
        const d = Math.abs(col - fc) + Math.abs(row - fr);
        if (d > 2) satisfied++; else if (d === 2) partial++; else violated++;
      });

      // Forbidden Neighbors
      (student.forbiddenNeighbors || []).forEach(fid => {
        if (seatOf[fid] === undefined) return;
        total++;
        const { col: fc, row: fr } = idxToColRow(seatOf[fid]);
        const d = Math.abs(col - fc) + Math.abs(row - fr);
        if (d > 1) satisfied++; else violated++;
      });

      // Separate From
      (student.separateFrom || []).forEach(sid => {
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

  const getGroupStudentIds = useCallback((groupId: string): (string | number)[] => {
    const group = currentConfig.groups?.find(g => g.id === groupId);
    if (!group) return [];
    let ids = [...(group.studentIds || [])];
    (group.subgroupIds || []).forEach(sid => {
      ids = [...ids, ...getGroupStudentIds(sid)];
    });
    return Array.from(new Set(ids));
  }, [currentConfig.groups]);

  const notifications = useMemo(() => {
    const list: Notification[] = [];
    
    // 1. Unassigned Students
    const unassigned = (currentConfig.students || []).filter(s => !(currentConfig.grid || []).includes(s.id));
    if (unassigned.length > 0) {
      list.push({
        id: 'unassigned',
        type: 'warning',
        category: 'unassigned',
        message: `ישנם ${unassigned.length} תלמידים שטרם שובצו בכיתה.`
      });
    }

    // 2. Direct Conflicts (Forbidden Neighbors)
    const seatOf: Record<string | number, number> = {};
    (currentConfig.grid || []).forEach((id, idx) => {
      if (id !== null) seatOf[id] = idx;
    });

    (currentConfig.students || []).forEach(student => {
      const idx = seatOf[student.id];
      if (idx === undefined) return;
      
      const { col, row } = idxToColRow(idx);
      (student.forbidden || []).forEach(fid => {
        const fIdx = seatOf[fid];
        if (fIdx === undefined) return;
        const { col: fc, row: fr } = idxToColRow(fIdx);
        const d = Math.abs(col - fc) + Math.abs(row - fr);
        if (d <= 1) {
          list.push({
            id: `conflict-${student.id}-${fid}`,
            type: 'error',
            category: 'conflict',
            studentId: student.id,
            message: `חיכוך ישיר: ${student.name} יושב/ת בצמוד ל-${currentConfig.students.find(s => s.id === fid)?.name || fid}.`
          });
        }
      });

      (student.forbiddenNeighbors || []).forEach(fid => {
        const fIdx = seatOf[fid];
        if (fIdx === undefined) return;
        const { col: fc, row: fr } = idxToColRow(fIdx);
        const d = Math.abs(col - fc) + Math.abs(row - fr);
        if (d <= 1) {
          list.push({
            id: `forbidden-neighbor-${student.id}-${fid}`,
            type: 'error',
            category: 'conflict',
            studentId: student.id,
            message: `שכנים אסורים: ${student.name} ו-${currentConfig.students.find(s => s.id === fid)?.name || fid} יושבים בצמוד.`
          });
        }
      });
    });

    // 3. Group Violations
    (currentConfig.groups || []).forEach(group => {
      const allStudentIds = getGroupStudentIds(group.id);
      
      if (group.constraints?.together) {
        const seatedInGroup = allStudentIds.filter(sid => seatOf[sid] !== undefined);
        if (seatedInGroup.length > 1) {
          let split = false;
          const firstSeat = seatOf[seatedInGroup[0]];
          const { col: c1, row: r1 } = idxToColRow(firstSeat);
          
          seatedInGroup.slice(1).forEach(sid => {
            const currentSeat = seatOf[sid];
            const { col, row } = idxToColRow(currentSeat);
            const dist = Math.abs(col - c1) + Math.abs(row - r1);
            if (dist > 3) split = true;
          });

          if (split) {
            list.push({
              id: `group-split-${group.id}`,
              type: 'warning',
              category: 'group',
              message: `הקבוצה "${group.name}" מפוזרת מדי ברחבי הכיתה.`
            });
          }
        }
      }

      if (group.constraints?.separate) {
        allStudentIds.forEach(sid => {
          const idx = seatOf[sid];
          if (idx === undefined) return;
          const { col, row } = idxToColRow(idx);
          allStudentIds.forEach(otherId => {
            if (sid === otherId) return;
            const otherIdx = seatOf[otherId];
            if (otherIdx === undefined) return;
            const { col: oc, row: or } = idxToColRow(otherIdx);
            if (Math.abs(col - oc) + Math.abs(row - or) <= 1) {
              list.push({
                id: `group-separate-${group.id}-${sid}-${otherId}`,
                type: 'error',
                category: 'group',
                message: `הפרדת קבוצה: ${currentConfig.students.find(s => s.id === sid)?.name} ו-${currentConfig.students.find(s => s.id === otherId)?.name} (קבוצת ${group.name}) צמודים מדי.`
              });
            }
          });
        });
      }

      (group.constraints?.avoidGroupIds || []).forEach(avoidId => {
        const otherGroupIds = getGroupStudentIds(avoidId);
        if (otherGroupIds.length === 0) return;
        
        allStudentIds.forEach(sid => {
          const idx = seatOf[sid];
          if (idx === undefined) return;
          const { col, row } = idxToColRow(idx);
          otherGroupIds.forEach(osid => {
            const oidx = seatOf[osid];
            if (oidx === undefined) return;
            const { col: oc, row: or } = idxToColRow(oidx);
            if (Math.abs(col - oc) + Math.abs(row - or) <= 1) {
              const otherGroup = currentConfig.groups?.find(g => g.id === avoidId);
              list.push({
                id: `avoid-group-${group.id}-${avoidId}-${sid}-${osid}`,
                type: 'error',
                category: 'group',
                message: `קבוצה "${group.name}" צמודה מדי לקבוצה "${otherGroup?.name}".`
              });
            }
          });
        });
      });
    });

    return list;
  }, [currentConfig, getGroupStudentIds]);

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
    const studentIdStr = e.dataTransfer.getData("studentId");
    if (!studentIdStr) return;

    const student = currentConfig.students.find(s => s.id.toString() === studentIdStr);
    if (!student) return;
    const studentId = student.id;

    updateCurrentConfig(prev => {
      const newGrid = [...prev.grid];
      
      const prevIdx = newGrid.findIndex(id => id === studentId);
      if (prevIdx !== -1) {
        newGrid[prevIdx] = null;
      }
      
      newGrid[idx] = studentId;
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

    if (editMode === 'lock') {
      updateCurrentConfig(prev => ({
        ...prev,
        locked: prev.locked.includes(idx) 
          ? prev.locked.filter(i => i !== idx) 
          : [...prev.locked, idx]
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
        separateFrom: [],
        forbiddenNeighbors: []
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
      const data: any = {};
      
      if (exportOptions.includeNames) data['שם'] = s.name;
      if (exportOptions.includeIds) data['מזהה'] = s.id;
      if (exportOptions.includeRowCol) {
        data['שורה'] = idx !== -1 ? row + 1 : 'לא משובץ';
        data['טור'] = idx !== -1 ? col + 1 : 'לא משובץ';
      }
      if (exportOptions.includePreferences) {
        data['העדפות'] = s.preferred.map(id => currentConfig.students.find(st => st.id === id)?.name).join(', ');
        data['דחייה'] = s.forbidden.map(id => currentConfig.students.find(st => st.id === id)?.name).join(', ');
        data['הפרדה'] = s.separateFrom.map(id => currentConfig.students.find(st => st.id === id)?.name).join(', ');
      }
      if (exportOptions.includeGroups) {
        data['קבוצות'] = (currentConfig.groups || []).filter(g => g.studentIds.includes(s.id)).map(g => g.name).join(', ');
      }
      if (exportOptions.includeFullGroups) {
        // Find all groups where the student is directly or indirectly a member
        const getAllStudentGroups = (studentId: string | number) => {
          const directGroups = (currentConfig.groups || []).filter(g => g.studentIds.includes(studentId));
          const allGroups = new Set<string>();
          
          const addGroupAndParents = (group: StudentGroup) => {
            if (allGroups.has(group.name)) return;
            allGroups.add(group.name);
            // Find parent groups (groups that have this group as a subgroup)
            (currentConfig.groups || []).forEach(parent => {
              if ((parent.subgroupIds || []).includes(group.id)) {
                addGroupAndParents(parent);
              }
            });
          };

          directGroups.forEach(g => addGroupAndParents(g));
          return Array.from(allGroups);
        };
        data['קבוצות (מורחב)'] = getAllStudentGroups(s.id).join(', ');
      }
      
      return data;
    });

    const worksheet = XLSX.utils.json_to_sheet(studentData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "תלמידים");
    XLSX.writeFile(workbook, `${currentConfig.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
    setIsExportModalOpen(false);
    setToast({ message: "הקובץ יוצא בהצלחה!", type: 'success' });
  };

    const exportLayoutJSON = () => {
    const dataStr = JSON.stringify(currentConfig, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${currentConfig.name}_layout_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    setIsExportModalOpen(false);
    setToast({ message: "קובץ המבנה יוצא בהצלחה!", type: 'success' });
  };

  const handlePrint = () => {
    window.print();
    setIsExportModalOpen(false);
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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiResponse("מפתח API אינו מוגדר.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const context = `Classroom: ${currentConfig.name}, ${currentConfig.rows} rows, ${currentConfig.cols} columns. 
Students info: ${currentConfig.students.map(s => `${s.name} (ID: ${s.id}, height: ${s.height || 'medium'}, prefers: ${s.preferredRow || 'any'}, tall: ${!!s.tall}, front: ${!!s.frontPrefer}, back: ${!!s.backPrefer}, forbiddenNeighbors: [${(s.forbiddenNeighbors || []).join(',')}] )`).join('; ')}. 
Groups: ${(currentConfig.groups || []).map(g => `${g.name}: [${g.studentIds.join(',')}], together: ${g.constraints?.together}, separate: ${g.constraints?.separate}, avoidGroups: [${(g.constraints?.avoidGroupIds || []).join(',')}]`).join('; ')}. 
Current Satisfaction: ${satisfaction}%.`;
      
      const systemInstruction = `You are a professional pedagogical assistant helping a teacher arrange a classroom.
Analyze social dynamics, physical constraints (height/tall students shouldn't block shorter ones), and group rules.
PEDAGOGICAL RULES:
1. Respect "preferredRow" strictly: 
   - "front": Rows 0 and 1.
   - "middle": Middle rows (around index ${Math.floor(currentConfig.rows / 2)}).
   - "back": Last two rows.
2. Respect "height":
   - "tall" students should NOT be in the front rows unless they prefer "front". They belong in the back.
   - "short" students MUST be in rows 0 or 1.
3. Groups with "together: true" must be seated in adjacent desks (neighbors).
4. Respect social "forbidden", "forbiddenNeighbors", and "separateFrom" rules strictly. "forbiddenNeighbors" must NOT be seated adjacent (up, down, left, right).
5. Provide a constructive pedagogical analysis in Hebrew first.
Include a JSON block at the end in this format: {"action":"arrange","grid":[studentId1, studentId2, null, ...]}`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest",
        contents: `Context: ${context}. 
User Request: Optimize arrangement. 
Weights (0-10): 
- Social Preferences: ${aiWeights.preferred}
- Social Friction (Forbidden): ${aiWeights.forbidden}
- Spatial Separation: ${aiWeights.separateFrom}
- Physical visibility (Height): ${aiWeights.height}
- Position preference (Front/Back): ${aiWeights.position}

IMPORTANT: Maximize "together" group clustering.`,
        config: {
          systemInstruction
        }
      });

      setAiResponse(response.text || "לא התקבלה תשובה מהבינה המלאכותית.");
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse("תקלה בשירות הבינה המלאכותית: " + (error instanceof Error ? error.message : String(error)));
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
    const isHidden = (currentConfig.hiddenDesks || []).includes(idx);
    const isLocked = (currentConfig.locked || []).includes(idx);
    const student = currentConfig.students.find(s => s.id === id);
    const isSelected = id !== null && id === selectedStudentId;
    const isConflict = id !== null && getNeighborIds(idx, currentConfig.grid).some(nid => (student?.forbidden || []).includes(nid));
    const isPreferred = id !== null && getNeighborIds(idx, currentConfig.grid).some(nid => (student?.preferred || []).includes(nid));

    const studentGroups = (currentConfig.groups || []).filter(g => id !== null && g.studentIds.includes(id));
    const visibleIndex = isHidden ? -1 : currentConfig.grid.slice(0, idx).filter((_, i) => !(currentConfig.hiddenDesks || []).includes(i)).length + 1;

    const [showHistory, setShowHistory] = useState(false);

    return (
      <motion.div
        layoutId={student ? `student-${student.id}` : `desk-${idx}`}
        whileHover={!isHidden ? { y: -3, scale: 1.03 } : {}}
        whileTap={!isHidden ? { scale: 0.95 } : {}}
        onClick={(e) => {
          if (e.shiftKey && id === null) {
            setShowHistory(true);
          } else {
            handleDeskClick(idx);
          }
        }}
        onDragOver={(e) => !isHidden && e.preventDefault()}
        onDrop={(e) => !isHidden && onDrop(e, idx)}
        draggable={!!student && !isLocked}
        onDragStart={(e) => student && onDragStart(e, student.id)}
        className={cn(
          "relative w-24 h-18 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 cursor-pointer",
          isHidden ? "opacity-10 border-transparent bg-slate-200/20 pointer-events-none" : 
          id === null ? "bg-slate-50/30 border-dashed border-slate-200" : "bg-white border-slate-200 desk-shadow overflow-hidden",
          id !== null && !isLocked && "hover:border-brand-400 hover:desk-shadow-hover cursor-grab active:cursor-grabbing",
          isSelected && "border-brand-600 ring-4 ring-brand-100 z-10 scale-105",
          isLocked && "border-brand-500 bg-brand-50",
          isConflict && "border-red-500 bg-red-50 shadow-red-100 ring-4 ring-red-200 z-10",
          isPreferred && "border-green-500 bg-green-50 shadow-green-100 ring-2 ring-green-100",
          selectedStudentId !== null && !id && !isHidden && "border-brand-400 bg-brand-50/50 border-dashed animate-pulse ring-4 ring-brand-100"
        )}
      >
        {isConflict && <AlertCircle className="absolute top-1 right-1 w-3 h-3 text-red-500 animate-bounce" />}
        {!isHidden && (
          <>
            <AnimatePresence mode="wait">
              {student ? (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center w-full"
                >
                  {showDeskNumbers && (
                    <span className="absolute top-1 right-1.5 text-[8px] font-black text-slate-300">#{visibleIndex}</span>
                  )}
                  {studentGroups.length > 0 && (
                    <div className="absolute top-1 left-1.5 flex gap-0.5">
                      {studentGroups.map(g => (
                        <div 
                          key={g.id} 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: g.color || '#6366f1' }} 
                          title={g.name}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-[12px] font-black text-slate-800 leading-tight text-center break-words w-full px-1 overflow-hidden truncate">
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
            {isLocked && <Lock className="absolute bottom-1.5 right-1.5 w-3 h-3 text-brand-600" />}
            {(currentConfig.deskHistory?.[idx] || []).length > 0 && !student && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                 className="absolute top-1 left-1 p-1 hover:bg-slate-200 rounded text-slate-400"
               >
                 <Undo2 className="w-2.5 h-2.5" />
               </button>
            )}
          </>
        )}

        {/* Local History Popup */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-[100] bg-white rounded-2xl shadow-2xl p-2 flex flex-col overflow-y-auto border border-slate-200"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-slate-400">היסטוריית מושב</span>
                <button onClick={(e) => { e.stopPropagation(); setShowHistory(false); }} className="p-0.5"><X className="w-2 h-2" /></button>
              </div>
              <div className="space-y-1">
                {(currentConfig.deskHistory?.[idx] || []).length === 0 && <span className="text-[8px] text-slate-300">אין רישום</span>}
                {(currentConfig.deskHistory?.[idx] || []).slice(-5).reverse().map((h, i) => (
                  <div key={i} className="flex flex-col border-b border-slate-50 last:border-0 pb-0.5">
                    <span className="text-[9px] font-bold text-slate-700">
                      {currentConfig.students.find(s => s.id === h.studentId)?.name || "ריק"}
                    </span>
                    <span className="text-[7px] text-slate-400">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-screen overflow-hidden bg-slate-50 font-sans rtl",
        accessibility.highContrast && "high-contrast",
        accessibility.fontSize === 'small' ? 'font-small' : accessibility.fontSize === 'large' ? 'font-large' : 'font-medium'
      )} 
      dir="rtl"
    >
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

          <div className="hidden lg:flex items-center gap-1 mr-6 overflow-x-auto max-w-[400px] no-scrollbar py-1">
            {state.configs.map(c => (
              <button 
                key={c.id}
                onClick={() => switchConfig(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  state.currentConfigId === c.id 
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-200" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {c.name}
              </button>
            ))}
            <button 
              onClick={addNewConfig}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-brand-600 transition-colors"
              title="שמירה כעותק / הוספת כיתה"
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
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="הגדרות נגישות"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600 transition-colors"
            title="ייצוא מתקדם"
          >
            <Download className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-2" />
          
          <button 
            onClick={() => setIsIssuesOpen(true)}
            className={cn(
              "p-2 rounded-lg relative transition-all",
              notifications.length > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 hover:bg-slate-100"
            )}
            title="התרעות ומסקנות"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
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
                      <button 
                        onClick={() => setIsGroupsPanelOpen(true)} 
                        className="p-1 hover:bg-slate-100 rounded text-brand-600"
                        title="ניהול קבוצות"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
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
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">תלמידים</h3>
                      <div className="flex gap-2">
                        <Badge className="bg-slate-100 text-slate-600">{currentConfig.students.length}</Badge>
                        {selectedSidebarStudentIds.length > 0 && (
                          <button 
                            onClick={() => setSelectedSidebarStudentIds([])}
                            className="text-[10px] font-black text-brand-600 underline"
                          >
                            ביטול בחירה ({selectedSidebarStudentIds.length})
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="חיפוש..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        />
                      </div>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-600 outline-none"
                      >
                        <option value="name">מיון: שם</option>
                        <option value="row">מיון: שורה</option>
                        <option value="col">מיון: טור</option>
                      </select>
                      <select 
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-600 outline-none max-w-[80px]"
                      >
                        <option value="all">כל הקבוצות</option>
                        {(currentConfig.groups || []).map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                        <option value="none">ללא קבוצה</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-3 flex flex-wrap gap-2 content-start transition-colors hover:border-brand-300">
                    {filteredAndSortedStudents.map(student => {
                      const isSeated = currentConfig.grid.includes(student.id);
                      const isSelectedBatch = selectedSidebarStudentIds.includes(student.id);
                      return (
                        <motion.button
                          key={student.id}
                          layoutId={`student-${student.id}`}
                          onDragStart={(e) => onDragStart(e, student.id)}
                          draggable={!isSeated}
                          onClick={(e) => {
                            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                              setSelectedSidebarStudentIds(prev => 
                                prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id]
                              );
                            } else {
                              setSelectedStudentId(selectedStudentId === student.id ? null : student.id);
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "relative px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5",
                            isSelectedBatch ? "ring-2 ring-brand-500 bg-brand-50" : "",
                            selectedStudentId === student.id 
                              ? "bg-brand-600 text-white z-10" 
                              : isSeated 
                                ? "bg-slate-100 text-slate-400 border border-slate-200" 
                                : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"
                          )}
                        >
                          {student.name}
                          {isSeated && <Check className="w-2.5 h-2.5" />}
                          <div className="flex gap-0.5 ml-1">
                            {(student.preferred || []).length > 0 && <Heart className="w-2.5 h-2.5 text-green-500 fill-green-500/20" title="מעדיף לשבת ליד" />}
                            {((student.forbidden || []).length > 0 || (student.forbiddenNeighbors || []).length > 0) && <Ban className="w-2.5 h-2.5 text-red-500" title="אסור/שכנים אסורים" />}
                            {(student.separateFrom || []).length > 0 && <ArrowRightLeft className="w-2.5 h-2.5 text-amber-500" title="הפרדה מרחבית" />}
                            {(currentConfig.groups || []).some(g => g.studentIds.includes(student.id)) && <Users className="w-2.5 h-2.5 text-blue-500" title="חבר בקבוצה" />}
                            {(student.frontPrefer || student.backPrefer || student.tall) && <Settings2 className="w-2.5 h-2.5 text-purple-500" title="אילוצי מיקום (גובה/שורה)" />}
                          </div>
                        </motion.button>
                      );
                    })}
                    {currentConfig.students.length === 0 && (
                      <div className="w-full text-center py-4 text-xs font-medium text-slate-400">אין תלמידים להציג</div>
                    )}
                  </div>
                  
                  {selectedSidebarStudentIds.length > 0 && (
                    <div className="mt-2 p-2 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-black text-brand-700">פעולות קבוצתיות:</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            confirmAction('ניקוי שיבוץ', `בטוח שברצונך להסיר ${selectedSidebarStudentIds.length} תלמידים?`, () => {
                              updateCurrentConfig(prev => ({
                                ...prev,
                                grid: prev.grid.map(id => id && selectedSidebarStudentIds.includes(id) ? null : id)
                              }));
                              setSelectedSidebarStudentIds([]);
                            });
                          }}
                          className="px-2 py-1 bg-white border border-red-200 text-red-500 rounded-lg text-[9px] font-black hover:bg-red-50"
                        >
                          הסרה
                        </button>
                        <button 
                          onClick={() => {
                            const groupName = prompt('שם הקבוצה:');
                            if (!groupName) return;
                            const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
                            const randomColor = colors[Math.floor(Math.random() * colors.length)];
                            
                            updateCurrentConfig(prev => ({
                              ...prev,
                              groups: [
                                ...(prev.groups || []),
                                {
                                  id: Date.now().toString(),
                                  name: groupName,
                                  color: randomColor,
                                  studentIds: [...selectedSidebarStudentIds],
                                  constraints: { together: true }
                                }
                              ]
                            }));
                            setSelectedSidebarStudentIds([]);
                            setIsGroupsPanelOpen(true);
                          }}
                          className="px-2 py-1 bg-white border border-brand-200 text-brand-600 rounded-lg text-[9px] font-black hover:bg-brand-50"
                        >
                          קבוצה
                        </button>
                        <button 
                          onClick={() => {
                            // Simple auto-seat for selected
                            updateCurrentConfig(prev => {
                              const newGrid = [...prev.grid];
                               const available = Array.from({ length: totalCells }, (_, i) => i)
                                .filter(i => !prev.hiddenDesks.includes(i) && prev.grid[i] === null);
                              
                              selectedSidebarStudentIds.forEach((id, i) => {
                                if (!prev.grid.includes(id) && available[i] !== undefined) {
                                  newGrid[available[i]] = id;
                                }
                              });
                              return { ...prev, grid: newGrid };
                            });
                            setSelectedSidebarStudentIds([]);
                          }}
                          className="px-2 py-1 bg-brand-600 text-white rounded-lg text-[9px] font-black hover:bg-brand-700"
                        >
                          שיבוץ
                        </button>
                      </div>
                    </div>
                  )}
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
            <button 
              onClick={() => setEditMode('lock')}
              className={cn("px-4 py-1.5 rounded-xl text-xs font-black transition-all", editMode === 'lock' ? "bg-brand-600 text-white border-2 border-brand-500" : "text-slate-500 hover:text-brand-600")}
            >
              נעילה
            </button>
            <div className="w-px h-4 bg-slate-200 mx-2" />
            <div className="flex items-center gap-2 px-2">
               <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", isSaving ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
               <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                 {isSaving ? "שומר..." : lastSaved ? `נשמר ב-${lastSaved}` : "ממתין לשמירה"}
               </span>
            </div>
            <div className="w-px h-4 bg-slate-200 mx-2" />
            <button 
              onClick={() => setShowDeskNumbers(!showDeskNumbers)}
              className={cn("px-4 py-1.5 rounded-xl text-xs font-black transition-all", showDeskNumbers ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:text-brand-600")}
            >
              מספרי שולחן
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
              className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]"
              >
                {/* Left Panel: Grid Selection */}
                <div className="flex-1 bg-slate-50 p-8 border-l border-slate-100 hidden md:flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-800">בחירה חזותית</h3>
                      <p className="text-xs font-bold text-slate-400">בחר תלמידים ישירות מהגריד להגדרת אילוצים</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-white/50 rounded-3xl p-4 border border-slate-200/60 shadow-inner">
                    <div 
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${currentConfig.cols}, minmax(0, 1fr))` }}
                    >
                      {currentConfig.grid.map((id, i) => {
                        const student = currentConfig.students.find(s => s.id === id);
                        const isSelf = id === editingStudent.id;
                        const isPreferred = (editingStudent.preferred || []).includes(id as any);
                        const isForbidden = (editingStudent.forbidden || []).includes(id as any) || (editingStudent.forbiddenNeighbors || []).includes(id as any);
                        const isSeparate = (editingStudent.separateFrom || []).includes(id as any);
                        
                        return (
                          <button
                            key={i}
                            disabled={!id || isSelf}
                            onClick={() => {
                              if (!id) return;
                              // Simple toggle: if already preferred, clear it. Else make it preferred.
                              setEditingStudent(prev => {
                                if (!prev) return null;
                                const currentPreferred = prev.preferred || [];
                                const currentForbidden = prev.forbidden || [];
                                const currentSeparate = prev.separateFrom || [];

                                if (isPreferred) return { ...prev, preferred: currentPreferred.filter(pid => pid !== id) };
                                return { 
                                  ...prev, 
                                  preferred: [...currentPreferred, id as any],
                                  forbidden: currentForbidden.filter(fid => fid !== id),
                                  separateFrom: currentSeparate.filter(sid => sid !== id)
                                };
                              });
                            }}
                            className={cn(
                              "aspect-square rounded-lg border-2 flex items-center justify-center text-[8px] font-black transition-all",
                              currentConfig.hiddenDesks.includes(i) ? "opacity-0 pointer-events-none" :
                              !id ? "bg-slate-100/50 border-slate-100" :
                              isSelf ? "bg-brand-600 text-white border-brand-600 scale-105 z-10 shadow-lg shadow-brand-200" :
                              isPreferred ? "bg-green-100 text-green-700 border-green-500 ring-2 ring-green-100" :
                              isForbidden ? "bg-red-100 text-red-700 border-red-500 ring-2 ring-red-100" :
                              isSeparate ? "bg-amber-100 text-amber-700 border-amber-500 ring-2 ring-amber-100" :
                              "bg-white text-slate-400 border-slate-200 hover:border-brand-300"
                            )}
                            title={student?.name}
                          >
                            {student?.name?.split(' ').map(n => n[0]).join('')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><Heart className="w-2.5 h-2.5 text-green-500 fill-green-500/20" /> חבר</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><Ban className="w-2.5 h-2.5 text-red-500" /> אסור</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><ArrowRightLeft className="w-2.5 h-2.5 text-amber-500" /> ריחוק</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><Users className="w-2.5 h-2.5 text-blue-500" /> קבוצה</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><Settings2 className="w-2.5 h-2.5 text-purple-500" /> אילוץ</div>
                  </div>
                </div>

                {/* Right Panel: Settings */}
                <div className="w-full md:w-[450px] p-8 flex flex-col h-full overflow-y-auto">
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
                    {/* Physical & Position Preferences */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">נתונים פיזיים ומיקום</h4>
                      <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500">גובה הילד:</p>
                          <div className="flex gap-2">
                             {(['short', 'medium', 'tall'] as const).map(h => (
                               <button 
                                 key={h}
                                 onClick={() => setEditingStudent(prev => prev ? { ...prev, height: h, tall: h === 'tall' } : null)}
                                 className={cn(
                                   "flex-1 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all",
                                   editingStudent.height === h || (h === 'tall' && editingStudent.tall && !editingStudent.height)
                                     ? "border-brand-500 bg-brand-50 text-brand-700" 
                                     : "border-slate-100 text-slate-400"
                                 )}
                               >
                                 {h === 'short' ? 'נמוך' : h === 'medium' ? 'בינוני' : 'גבוה'}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500">שורה מועדפת:</p>
                          <div className="flex gap-2">
                             {(['front', 'middle', 'back'] as const).map(p => (
                               <button 
                                 key={p}
                                 onClick={() => setEditingStudent(prev => prev ? { 
                                   ...prev, 
                                   preferredRow: p, 
                                   frontPrefer: p === 'front', 
                                   backPrefer: p === 'back' 
                                 } : null)}
                                 className={cn(
                                   "flex-1 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all",
                                   editingStudent.preferredRow === p || (p === 'front' && editingStudent.frontPrefer) || (p === 'back' && editingStudent.backPrefer)
                                     ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                                     : "border-slate-100 text-slate-400"
                                 )}
                               >
                                 {p === 'front' ? 'קדמית' : p === 'middle' ? 'אמצעית' : 'אחורית'}
                               </button>
                             ))}
                          </div>
                        </div>
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
                                      separateFrom: prev.separateFrom.filter(id => id !== s.id),
                                      forbiddenNeighbors: (prev.forbiddenNeighbors || []).filter(id => id !== s.id)
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
                                      separateFrom: prev.separateFrom.filter(id => id !== s.id),
                                      forbiddenNeighbors: (prev.forbiddenNeighbors || []).filter(id => id !== s.id)
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
                          <p className="text-[11px] font-bold text-slate-600 mb-2">🚫 שכנים אסורים (הפרדה מיידית):</p>
                          <div className="flex flex-wrap gap-1.5">
                            {currentConfig.students.filter(s => s.id !== editingStudent.id).map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setEditingStudent(prev => {
                                    if (!prev) return null;
                                    const currentFN = prev.forbiddenNeighbors || [];
                                    const forbiddenNeighbors = currentFN.includes(s.id) 
                                      ? currentFN.filter(id => id !== s.id)
                                      : [...currentFN, s.id];
                                    return { 
                                      ...prev, 
                                      forbiddenNeighbors, 
                                      preferred: prev.preferred.filter(id => id !== s.id),
                                      separateFrom: prev.separateFrom.filter(id => id !== s.id),
                                      forbidden: prev.forbidden.filter(id => id !== s.id)
                                    };
                                  });
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all",
                                  (editingStudent.forbiddenNeighbors || []).includes(s.id) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
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
                              const isActive = (editingStudent.separateFrom || []).includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setEditingStudent(prev => {
                                      if (!prev) return null;
                                      const currentSeparate = prev.separateFrom || [];
                                      const currentPreferred = prev.preferred || [];
                                      const currentForbidden = prev.forbidden || [];

                                      const ids = currentSeparate.includes(s.id)
                                        ? currentSeparate.filter(id => id !== s.id)
                                        : [...currentSeparate, s.id];
                                      return { 
                                        ...prev, 
                                        separateFrom: ids,
                                        preferred: currentPreferred.filter(id => id !== s.id),
                                        forbidden: currentForbidden.filter(id => id !== s.id),
                                        forbiddenNeighbors: (prev.forbiddenNeighbors || []).filter(id => id !== s.id)
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

        {/* AI Panel */}
        <AnimatePresence>
          {isAIPanelOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAIPanelOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-100 rounded-xl">
                      <Sparkles className="w-5 h-5 text-violet-600" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">עוזר פדגוגי חכם</h2>
                  </div>
                  <button onClick={() => setIsAIPanelOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">משקולות אופטימיזציה</h3>
                    <div className="space-y-4">
                      {Object.entries(aiWeights).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-600">
                              {key === 'preferred' ? 'העדפות חברתיות' : 
                               key === 'forbidden' ? 'מניעת חיכוך' : 
                               key === 'separateFrom' ? 'הפרדה מרחבית' :
                               key === 'height' ? 'ראות וגובה' : 'מיקום (קדימה/אחורה)'}
                            </span>
                            <span className="text-brand-600">{val}</span>
                          </div>
                          <input 
                            type="range" min="0" max="10" 
                            value={val} 
                            onChange={(e) => setAiWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-brand-600 rounded-3xl text-white shadow-xl shadow-brand-100 space-y-4">
                    <div className="flex items-center gap-2">
                       <Wand2 className="w-5 h-5" />
                       <h3 className="font-black">הצעת סידור מומלצת</h3>
                    </div>
                    {isLoadingAI ? (
                      <div className="flex flex-col items-center py-8 gap-4">
                        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        <p className="text-xs font-bold animate-pulse">הבינה המלאכותית מנתחת את מבנה הכיתה...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-sm leading-relaxed font-medium bg-white/10 p-4 rounded-2xl border border-white/20 whitespace-pre-wrap">
                          {aiResponse || "לחץ על הכפתור למטה כדי לקבל הצעה לשיפור סידור הכיתה."}
                        </div>
                        {aiResponse && aiResponse.includes('"action":"arrange"') && (
                          <button 
                            onClick={() => {
                              try {
                                const jsonMatch = aiResponse.match(/\{.*\}/s);
                                if (jsonMatch) {
                                  const data = JSON.parse(jsonMatch[0]);
                                  if (data.action === "arrange" && data.grid) {
                                    updateCurrentConfig(prev => ({ ...prev, grid: data.grid }));
                                    setToast({ message: "הסידור עודכן בהצלחה בהתאם להמלצת ה-AI!", type: 'success' });
                                    setIsAIPanelOpen(false);
                                  }
                                }
                              } catch (e) {
                                console.error("Failed to parse AI grid", e);
                              }
                            }}
                            className="w-full py-3 bg-white text-brand-600 rounded-xl font-black shadow-lg hover:bg-slate-50 transition-all active:scale-95"
                          >
                            החל את הסידור המוצע
                          </button>
                        )}
                        <button 
                          onClick={callAIArrangement}
                          className="w-full py-3 bg-brand-700/50 hover:bg-brand-700/80 text-white rounded-xl font-black transition-all"
                        >
                          {aiResponse ? "נסה הצעה נוספת" : "צור הצעה ראשונה"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Groups Panel */}
        <AnimatePresence>
          {isGroupsPanelOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsGroupsPanelOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-100 rounded-xl">
                      <Users className="w-5 h-5 text-brand-600" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">ניהול קבוצות</h2>
                  </div>
                  <button onClick={() => setIsGroupsPanelOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {(currentConfig.groups || []).map(group => {
                    const isParent = (group.subgroupIds || []).length > 0;
                    const isExpanded = expandedGroups[group.id] || false;
                    const subGroups = (currentConfig.groups || []).filter(g => (group.subgroupIds || []).includes(g.id));

                    return (
                    <div key={group.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2 cursor-pointer group/title"
                          onClick={() => isParent && setExpandedGroups(prev => ({ ...prev, [group.id]: !isExpanded }))}
                        >
                          {isParent && (
                            isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronLeft className="w-4 h-4 text-slate-400" />
                          )}
                          <div 
                            className="w-4 h-4 rounded-full border border-slate-200" 
                            style={{ backgroundColor: group.color || '#6366f1', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];
                              const nextIdx = (colors.indexOf(group.color || '') + 1) % colors.length;
                              updateCurrentConfig(prev => ({
                                ...prev,
                                groups: (prev.groups || []).map(g => g.id === group.id ? { ...g, color: colors[nextIdx] } : g)
                              }));
                            }}
                          />
                          <h3 className="font-black text-slate-800">{group.name}</h3>
                          {isParent && !isExpanded && (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              {subGroups.length} תתי-קבוצות
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => updateCurrentConfig(prev => ({
                            ...prev,
                            groups: (prev.groups || []).filter(g => g.id !== group.id)
                          }))}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {(!isParent || isExpanded) && (
                        <motion.div 
                          initial={isParent ? { height: 0, opacity: 0 } : {}}
                          animate={isParent ? { height: 'auto', opacity: 1 } : {}}
                          className="space-y-4 overflow-hidden"
                        >
                          {isParent ? (
                            <div className="space-y-3">
                              <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">תתי-קבוצות:</span>
                                <div className="flex flex-wrap gap-2">
                                  {subGroups.map(sg => (
                                    <Badge key={sg.id} style={{ backgroundColor: sg.color + '20', color: sg.color }} className="border-0">
                                      {sg.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ניהול תת-קבוצות:</span>
                                <div className="flex flex-wrap gap-2">
                                  {(currentConfig.groups || []).filter(g => g.id !== group.id).map(g => {
                                    const isSubgroup = (group.subgroupIds || []).includes(g.id);
                                    return (
                                      <button
                                        key={g.id}
                                        onClick={() => updateCurrentConfig(prev => ({
                                          ...prev,
                                          groups: (prev.groups || []).map(pg => pg.id === group.id ? {
                                            ...pg,
                                            subgroupIds: isSubgroup 
                                              ? (pg.subgroupIds || []).filter(id => id !== g.id)
                                              : [...(pg.subgroupIds || []), g.id]
                                          } : pg)
                                        }))}
                                        className={cn(
                                          "px-2 py-1 rounded-full text-[9px] font-bold border transition-all",
                                          isSubgroup ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-100 text-slate-400"
                                        )}
                                      >
                                        {g.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {group.studentIds.map(sid => (
                                  <Badge key={sid} className="bg-white border border-slate-200 text-slate-600">
                                    {currentConfig.students.find(s => s.id === sid)?.name || sid}
                                  </Badge>
                                ))}
                              </div>

                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => updateCurrentConfig(prev => ({
                                      ...prev,
                                      groups: (prev.groups || []).map(g => g.id === group.id ? {
                                        ...g,
                                        constraints: { ...g.constraints, together: !g.constraints?.together, separate: false }
                                      } : g)
                                    }))}
                                    className={cn(
                                      "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                      group.constraints?.together ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                                    )}
                                  >
                                    ישיבה ביחד
                                  </button>
                                  <button 
                                    onClick={() => updateCurrentConfig(prev => ({
                                      ...prev,
                                      groups: (prev.groups || []).map(g => g.id === group.id ? {
                                        ...g,
                                        constraints: { ...g.constraints, separate: !g.constraints?.separate, together: false }
                                      } : g)
                                    }))}
                                    className={cn(
                                      "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                      group.constraints?.separate ? "bg-red-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                                    )}
                                  >
                                    הפרדה
                                  </button>
                                </div>

                                {(currentConfig.groups || []).length > 1 && (
                                  <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">תת-קבוצות (ירושת אילוצים):</span>
                                    <div className="flex flex-wrap gap-2">
                                      {(currentConfig.groups || []).filter(g => g.id !== group.id).map(g => {
                                        const isSubgroup = (group.subgroupIds || []).includes(g.id);
                                        return (
                                          <button
                                            key={g.id}
                                            onClick={() => updateCurrentConfig(prev => ({
                                              ...prev,
                                              groups: (prev.groups || []).map(pg => pg.id === group.id ? {
                                                ...pg,
                                                subgroupIds: isSubgroup 
                                                  ? (pg.subgroupIds || []).filter(id => id !== g.id)
                                                  : [...(pg.subgroupIds || []), g.id]
                                              } : pg)
                                            }))}
                                            className={cn(
                                              "px-2 py-1 rounded-full text-[9px] font-bold border transition-all",
                                              isSubgroup ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-100 text-slate-400"
                                            )}
                                          >
                                            {g.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {(currentConfig.groups || []).length > 1 && (
                            <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">התרחקות מקבוצות אחרות:</span>
                              <div className="flex flex-wrap gap-2">
                                {currentConfig.groups.filter(g => g.id !== group.id).map(g => {
                                  const isAvoiding = (group.constraints?.avoidGroupIds || []).includes(g.id);
                                  return (
                                    <button
                                      key={g.id}
                                      onClick={() => updateCurrentConfig(prev => ({
                                        ...prev,
                                        groups: (prev.groups || []).map(pg => pg.id === group.id ? {
                                          ...pg,
                                          constraints: {
                                            ...pg.constraints,
                                            avoidGroupIds: isAvoiding 
                                              ? (pg.constraints?.avoidGroupIds || []).filter(id => id !== g.id)
                                              : [...(pg.constraints?.avoidGroupIds || []), g.id]
                                          }
                                        } : pg)
                                      }))}
                                      className={cn(
                                        "px-2 py-1 rounded-full text-[9px] font-bold border transition-all",
                                        isAvoiding ? "bg-amber-600 border-amber-600 text-white" : "bg-slate-50 border-slate-100 text-slate-400"
                                      )}
                                    >
                                      {g.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                  })}

                  {(currentConfig.groups || []).length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-bold">אין קבוצות מוגדרות</p>
                      <p className="text-[10px]">בחר תלמידים בסרגל הצד (עם Shift) כדי ליצור קבוצה חדשה</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Issues Panel */}
        <AnimatePresence>
          {isIssuesOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsIssuesOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">התרעות ומערכת בקרה</h2>
                  </div>
                  <button onClick={() => setIsIssuesOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {notifications.map((n, i) => (
                    <motion.div 
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "p-4 rounded-2xl border flex gap-3",
                        n.type === 'error' ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg h-fit",
                        n.type === 'error' ? "bg-red-100" : "bg-amber-100"
                      )}>
                        {n.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "text-sm font-bold",
                          n.type === 'error' ? "text-red-700" : "text-amber-700"
                        )}>
                          {n.message}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {n.studentId && (
                            <button 
                              onClick={() => {
                                setSelectedStudentId(n.studentId!);
                                setIsIssuesOpen(false);
                              }}
                              className="text-[10px] font-black uppercase text-slate-500 hover:text-brand-600 underline"
                            >
                              הצג תלמיד
                            </button>
                          )}
                          {n.category === 'unassigned' && (
                            <button 
                              onClick={() => {
                                setIsIssuesOpen(false);
                                runSmartSort();
                              }}
                              className="text-[10px] font-black uppercase text-brand-600 underline"
                            >
                              שיבוץ אוטומטי
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {notifications.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                      <Check className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-20" />
                      <p className="text-sm font-bold text-slate-400">הכל נראה תקין בתצורה הזאת!</p>
                      <p className="text-[10px] text-slate-400 mt-1">אין חיכוכים ישירים או תלמידים לא משובצים.</p>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">מדדי ביצוע</span>
                    <span className="text-xs font-bold text-brand-600">{satisfaction}% הצלחה</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${satisfaction}%` }}
                      className="h-full bg-brand-600"
                    />
                  </div>
                </div>
              </motion.div>
            </>
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
        
        {/* Export Modal */}
        <AnimatePresence>
          {isExportModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExportModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-100 rounded-2xl">
                    <Download className="w-6 h-6 text-brand-600" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">אפשרויות ייצוא אקסל</h3>
                </div>

                <div className="space-y-4">
                  {Object.entries(exportOptions).map(([key, val]) => (
                    <label key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-bold text-slate-700">
                        {key === 'includeNames' ? 'כלול שמות תלמידים' :
                         key === 'includeIds' ? 'כלול מזהי תלמידים' :
                         key === 'includeRowCol' ? 'כלול שורה וטור' :
                         key === 'includePreferences' ? 'כלול העדפות ודחיות' : 
                         key === 'includeGroups' ? 'כלול שיוך לקבוצות' : 'כלול קבוצות ותת-קבוצות'}
                      </span>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={val}
                        onChange={() => setExportOptions(prev => ({ ...prev, [key]: !val }))}
                      />
                    </label>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setIsExportModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black">ביטול</button>
                  <button onClick={exportToExcel} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-black shadow-lg shadow-brand-200">ייצוא קובץ</button>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">אפשרויות ייצוא נוספות</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={exportLayoutJSON}
                      className="flex flex-col items-center justify-center p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-indigo-700 hover:bg-indigo-100 transition-all gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      <span className="text-[10px] font-bold">ייצוא מבנה (JSON)</span>
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="flex flex-col items-center justify-center p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-emerald-700 hover:bg-emerald-100 transition-all gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      <span className="text-[10px] font-bold">הדפסת מפה</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Accessibility Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-100 rounded-2xl">
                    <Monitor className="w-6 h-6 text-brand-600" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">הגדרות נגישות</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer">
                      <div className="flex items-center gap-3 text-slate-700">
                        <Eye className="w-5 h-5" />
                        <span className="text-sm font-bold">ניגודיות גבוהה</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-slate-300 text-brand-600"
                        checked={accessibility.highContrast}
                        onChange={() => {
                          const newSettings = { ...accessibility, highContrast: !accessibility.highContrast };
                          setAccessibility(newSettings);
                          setState(prev => ({ ...prev, accessibility: newSettings }));
                        }}
                      />
                    </label>

                    <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3 text-slate-700 mb-1">
                        <ZoomIn className="w-5 h-5" />
                        <span className="text-sm font-bold">גודל גופן</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['small', 'medium', 'large'] as const).map(size => (
                          <button
                            key={size}
                            onClick={() => {
                              const newSettings = { ...accessibility, fontSize: size };
                              setAccessibility(newSettings);
                              setState(prev => ({ ...prev, accessibility: newSettings }));
                            }}
                            className={cn(
                              "py-2 rounded-xl text-xs font-black uppercase transition-all",
                              accessibility.fontSize === size ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                            )}
                          >
                            {size === 'small' ? 'קטן' : size === 'medium' ? 'רגיל' : 'גדול'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">סגור</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notifier */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[100]"
            >
              <div className={cn(
                "px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border",
                toast.type === 'success' ? "bg-green-600 border-green-500 text-white" :
                toast.type === 'error' ? "bg-red-600 border-red-500 text-white" :
                "bg-slate-800 border-slate-700 text-white"
              )}>
                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-black tracking-tight">{toast.message}</span>
                <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer / Status Bar */}
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
