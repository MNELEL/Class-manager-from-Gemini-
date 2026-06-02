import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserCircle2, 
  Timer, 
  RefreshCcw, 
  Play, 
  Pause, 
  Plus, 
  Minus,
  RotateCcw,
  Sparkles,
  UserPlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { Student } from '../types';

export const TeacherToolkit = ({ students, onBack }: { students: Student[], onBack: () => void }) => {
  const [activeTool, setActiveTool] = useState<'wheel' | 'timer' | 'groups'>('wheel');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 pt-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
             <div className="p-4 bg-brand-500 rounded-2xl text-white shadow-lg shadow-brand-200">
                <Sparkles className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white">ארגז כלים לניהול הכיתה</h1>
                <p className="text-slate-500 text-sm font-medium">כלי עבודה פדגוגיים מהירים</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => {
                const worksheet = XLSX.utils.json_to_sheet(students);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
                XLSX.writeFile(workbook, "students.xlsx");
             }} className="px-5 py-3 bg-slate-100 dark:bg-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm">ייצוא (Excel)</button>
             <button onClick={onBack} className="px-6 py-3 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all">חזרה</button>
          </div>
        </div>

        <div className="flex gap-4 p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-[2rem] w-fit mx-auto border border-white/50 dark:border-slate-700/50 backdrop-blur-xl">
           <ToolNavButton active={activeTool === 'wheel'} onClick={() => setActiveTool('wheel')} icon={<UserCircle2 className="w-5 h-5" />} label="בוחר שמות" />
           <ToolNavButton active={activeTool === 'timer'} onClick={() => setActiveTool('timer')} icon={<Timer className="w-5 h-5" />} label="טיימר" />
           <ToolNavButton active={activeTool === 'groups'} onClick={() => setActiveTool('groups')} icon={<Users className="w-5 h-5" />} label="מחלק לקבוצות" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTool === 'wheel' && <NameWheel students={students} />}
          {activeTool === 'timer' && <ToolkitTimer />}
          {activeTool === 'groups' && <GroupGenerator students={students} />}
        </div>
      </div>
    </div>
  );
};

const ToolNavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all",
      active ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
    )}
  >
    {icon}
    {label}
  </button>
);

const NameWheel = ({ students }: { students: Student[] }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [availableStudents, setAvailableStudents] = useState<Student[]>(students);

  const spin = () => {
    if (availableStudents.length === 0) {
        setAvailableStudents(students);
        return;
    }
    setIsSpinning(true);
    setSelectedStudent(null);
    
    // Fake spin animation
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * availableStudents.length);
      const chosen = availableStudents[randomIndex];
      setSelectedStudent(chosen);
      setAvailableStudents(prev => prev.filter(s => s.id !== chosen.id));
      setIsSpinning(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className={cn(
        "relative w-80 h-80 rounded-full border-8 border-white dark:border-slate-800 shadow-2xl flex items-center justify-center bg-gradient-to-br from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 transition-all duration-[2000ms] ease-out",
        isSpinning ? "rotate-[720deg]" : "rotate-0"
      )}>
        {selectedStudent ? (
          <div className="text-center animate-in zoom-in duration-500">
             <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-500 mx-auto mb-4">
                <img src={selectedStudent.avatar} className="w-full h-full object-cover" />
             </div>
             <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedStudent.name}</p>
          </div>
        ) : (
          <div className="text-center text-slate-300">
            <UserCircle2 className={cn("w-24 h-24 mx-auto mb-4 opacity-20", isSpinning && "animate-pulse")} />
            <p className="font-bold uppercase tracking-widest text-xs">לחצו להגרלה</p>
          </div>
        )}
      </div>

      <button 
        disabled={isSpinning}
        onClick={spin}
        className={cn(
            "px-12 py-6 bg-brand-500 text-white rounded-3xl font-black text-xl shadow-xl shadow-brand-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
            isSpinning && "animate-pulse"
        )}
      >
        {isSpinning ? 'מגריל...' : selectedStudent ? 'הגרל תלמיד נוסף' : 'בחירה אקראית'}
      </button>

      <div className="text-center text-slate-400 text-xs font-bold">
        {availableStudents.length} תלמידים נותרו במאגר
      </div>
    </div>
  );
};

const ToolkitTimer = () => {
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
    const [isRunning, setIsRunning] = useState(false);
    const [inputMinutes, setInputMinutes] = useState(5);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        let interval: any;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsRunning(false);
            // In a real app we'd play a sound here
            alert('זמן נגמר!');
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft]);

    const toggle = () => setIsRunning(!isRunning);
    const reset = () => {
        setIsRunning(false);
        setTimeLeft(inputMinutes * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-12 py-12">
            <div className="text-9xl font-display font-black text-brand-600 tabular-nums">
                {formatTime(timeLeft)}
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={toggle}
                    className="w-20 h-20 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                    {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
                <button 
                    onClick={reset}
                    className="w-20 h-20 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                    <RotateCcw className="w-8 h-8" />
                </button>
            </div>

            <div className="flex items-center gap-6 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                <button onClick={() => setInputMinutes(Math.max(1, inputMinutes - 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <Minus className="w-6 h-6 text-slate-400" />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">דקות</p>
                    <p className="text-2xl font-black text-slate-700 dark:text-white">{inputMinutes}</p>
                </div>
                <button onClick={() => setInputMinutes(inputMinutes + 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <Plus className="w-6 h-6 text-slate-400" />
                </button>
            </div>
        </div>
    );
};

const GroupGenerator = ({ students }: { students: Student[] }) => {
    const [groupCount, setGroupCount] = useState(4);
    const [groups, setGroups] = useState<Student[][]>([]);

    const generate = () => {
        const shuffled = [...students].sort(() => 0.5 - Math.random());
        const newGroups: Student[][] = Array.from({ length: groupCount }, () => []);
        
        shuffled.forEach((student, index) => {
            newGroups[index % groupCount].push(student);
        });

        setGroups(newGroups);
    };

    return (
        <div className="space-y-12 py-8">
            <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
                   <p className="font-black text-slate-600 dark:text-slate-300 px-4">מספר קבוצות רצוי:</p>
                   <div className="flex items-center gap-2">
                        <button onClick={() => setGroupCount(Math.max(2, groupCount - 1))} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl"><Minus className="w-4 h-4" /></button>
                        <span className="w-8 text-center text-xl font-black">{groupCount}</span>
                        <button onClick={() => setGroupCount(Math.min(students.length, groupCount + 1))} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl"><Plus className="w-4 h-4" /></button>
                   </div>
                </div>
                <button 
                    onClick={generate}
                    className="flex items-center gap-3 px-12 py-5 bg-brand-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-brand-100 transition-transform active:scale-95"
                >
                    <RefreshCcw className="w-5 h-5" />
                    חלק לקבוצות
                </button>
            </div>

            {groups.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groups.map((group, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-black text-brand-600">קבוצה {idx + 1}</h4>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-full uppercase tracking-widest">{group.length} תלמידים</span>
                            </div>
                            <div className="space-y-3">
                                {group.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
                                        <img src={s.avatar} className="w-8 h-8 rounded-full border border-white" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
