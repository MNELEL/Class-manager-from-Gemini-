import { useState } from 'react';
import { Plus, Clock, MapPin, Trash2, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { Student } from '../types';

interface Lesson {
    id: string;
    name: string;
    day: string;
    time: string;
    room?: string;
    category?: 'regular' | 'alternative';
}

export const LessonsManager = ({ 
    student, 
    onUpdateStudent 
}: { 
    student: Student, 
    onUpdateStudent: (updatedStudent: Student) => void 
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
        name: '',
        day: 'ראשון',
        time: '',
        room: '',
        category: 'regular'
    });

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

    const addLesson = () => {
        if (!newLesson.name || !newLesson.time) return;
        
        const lesson: Lesson = {
            id: Date.now().toString(),
            name: newLesson.name,
            day: newLesson.day || 'ראשון',
            time: newLesson.time,
            room: newLesson.room,
            category: newLesson.category || 'regular'
        };

        const updatedStudent = {
            ...student,
            lessons: [...(student.lessons || []), lesson]
        };
        
        onUpdateStudent(updatedStudent);
        setNewLesson({ name: '', day: 'ראשון', time: '', room: '' });
        setIsModalOpen(false);
    };

    const deleteLesson = (id: string) => {
        const updatedStudent = {
            ...student,
            lessons: (student.lessons || []).filter(l => l.id !== id)
        };
        onUpdateStudent(updatedStudent);
    };

    const groupedLessons = days.reduce((acc, day) => {
        acc[day] = (student.lessons || [])
            .filter(l => l.day === day)
            .sort((a, b) => a.time.localeCompare(b.time));
        return acc;
    }, {} as Record<string, Lesson[]>);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">מערכת שעות שבועית</h3>
                    <p className="text-sm text-slate-500 font-medium">ניהול שיעורים אישיים</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-100 hover:scale-105 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    הוסף שיעור
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {days.map(day => (
                    <div key={day} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-4">{day}</h4>
                        <div className="space-y-3">
                            {groupedLessons[day].length > 0 ? (
                                groupedLessons[day].map(lesson => (
                                    <div key={lesson.id} className={cn(
                                        "group relative p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md",
                                        lesson.category === 'alternative' 
                                            ? "bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" 
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    )}>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-800 dark:text-white leading-tight">{lesson.name}</span>
                                                {lesson.category === 'alternative' && (
                                                    <span className="text-[8px] font-black bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-md uppercase">חלופה</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {lesson.time}
                                                </div>
                                                {lesson.room && (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {lesson.room}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => deleteLesson(lesson.id)}
                                            className="absolute top-4 left-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-300 uppercase">אין שיעורים</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[1001] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-6" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-brand-50 rounded-2xl">
                                <BookOpen className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">שיעור חדש</h3>
                                <p className="text-slate-500 font-medium text-sm">הזן את פרטי השיעור</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase mr-2 text-right block">שם השיעור</label>
                                <input 
                                    type="text"
                                    value={newLesson.name}
                                    onChange={e => setNewLesson({...newLesson, name: e.target.value})}
                                    placeholder="מתמטיקה, אנגלית..."
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase mr-2 text-right block">יום</label>
                                    <select 
                                        value={newLesson.day}
                                        onChange={e => setNewLesson({...newLesson, day: e.target.value})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase mr-2 text-right block">שעה</label>
                                    <input 
                                        type="time"
                                        value={newLesson.time}
                                        onChange={e => setNewLesson({...newLesson, time: e.target.value})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase mr-2 text-right block">סוג שיעור</label>
                                <select 
                                    value={newLesson.category}
                                    onChange={e => setNewLesson({...newLesson, category: e.target.value as any})}
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 font-bold"
                                >
                                    <option value="regular">שיעור רגיל</option>
                                    <option value="alternative">שיעור חלופה / תגבור</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase mr-2 text-right block">חדר / כיתה (אופציונלי)</label>
                                <input 
                                    type="text"
                                    value={newLesson.room}
                                    onChange={e => setNewLesson({...newLesson, room: e.target.value})}
                                    placeholder="מעבדת מחשבים..."
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={addLesson}
                                className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg active:scale-95"
                            >
                                הוסף למערכת
                            </button>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
