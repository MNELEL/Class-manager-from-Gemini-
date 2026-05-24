import { useState } from 'react';
import { Plus, Clock, MapPin, Trash2, BookOpen, Edit2, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { Student } from '../types';
import { scheduleCalendarEvent } from '../lib/workspace';

interface Lesson {
    id: string;
    name: string;
    day: string;
    time: string;
    room?: string;
    category?: 'regular' | 'alternative';
}
// Helper to get date for next occurrence of a day of the week
const getNextDateForDay = (dayName: string) => {
    const daysMap: Record<string, number> = {
        'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6
    };
    const targetDay = daysMap[dayName] !== undefined ? daysMap[dayName] : 0;
    const now = new Date();
    const result = new Date(now);
    result.setDate(now.getDate() + (targetDay + 7 - now.getDay()) % 7);
    return result;
};

export const LessonsManager = ({ 
    student, 
    onUpdateStudent 
}: { 
    student: Student, 
    onUpdateStudent: (updatedStudent: Student) => void 
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
        name: '',
        day: 'ראשון',
        time: '',
        room: '',
        category: 'regular'
    });

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

    const syncToCalendar = async (lesson: Lesson) => {
        try {
            const date = getNextDateForDay(lesson.day);
            const [hours, minutes] = lesson.time.split(':');
            date.setHours(parseInt(hours), parseInt(minutes));
            
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(start.getHours() + 1); // Assuming 1 hour lessons

            await scheduleCalendarEvent({
                summary: `שיעור עם ${student.name}: ${lesson.name}`,
                location: lesson.room,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() }
            });
            alert('השיעור סונכרן ליומן בהצלחה!');
        } catch (err: any) {
            console.error(err);
            alert('שגיאה בסנכרון ליומן: ' + err.message);
        }
    };

    const saveLesson = () => {
        if (!newLesson.name || !newLesson.time) return;
        
        if (editingLessonId) {
            const updatedStudent = {
                ...student,
                lessons: (student.lessons || []).map(l => 
                    l.id === editingLessonId 
                        ? { 
                            ...l, 
                            name: newLesson.name!, 
                            day: newLesson.day || 'ראשון', 
                            time: newLesson.time!, 
                            room: newLesson.room, 
                            category: newLesson.category || 'regular'
                          }
                        : l
                )
            };
            onUpdateStudent(updatedStudent);
        } else {
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
        }
        
        setNewLesson({ name: '', day: 'ראשון', time: '', room: '', category: 'regular' });
        setEditingLessonId(null);
        setIsModalOpen(false);
    };

    const editLesson = (lesson: Lesson) => {
        setNewLesson({
            name: lesson.name,
            day: lesson.day,
            time: lesson.time,
            room: lesson.room,
            category: lesson.category || 'regular'
        });
        setEditingLessonId(lesson.id);
        setIsModalOpen(true);
    };

    const deleteLesson = (id: string) => {
        const updatedStudent = {
            ...student,
            lessons: (student.lessons || []).filter(l => l.id !== id)
        };
        onUpdateStudent(updatedStudent);
    };

    const openCreateModal = () => {
        setNewLesson({ name: '', day: 'ראשון', time: '', room: '', category: 'regular' });
        setEditingLessonId(null);
        setIsModalOpen(true);
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
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-100 hover:scale-105 transition-all cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    הוסף שיעור
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {days.map(day => (
                    <div key={day} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-4">{day}</h4>
                        <div className="space-y-3">
                            {groupedLessons[day].length > 0 ? (
                                groupedLessons[day].map(lesson => (
                                    <div key={lesson.id} className={cn(
                                        "group relative p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md",
                                        lesson.category === 'alternative' 
                                            ? "bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" 
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    )}>
                                        <div className="flex flex-col gap-1 pr-1">
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
                                                    <div className="flex items-center gap-1 max-w-[120px] truncate">
                                                        <MapPin className="w-3 h-3" />
                                                        {lesson.room}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={() => syncToCalendar(lesson)}
                                                className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                title="סנכרון ליומן"
                                            >
                                                <Calendar className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => editLesson(lesson)}
                                                className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                title="ערוך שיעור"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => deleteLesson(lesson.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                title="מחק שיעור"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">אין שיעורים</p>
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
                            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl">
                                <BookOpen className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                                    {editingLessonId ? 'עריכת שיעור' : 'שיעור חדש'}
                                </h3>
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
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase mr-2 text-right block">יום</label>
                                    <select 
                                        value={newLesson.day}
                                        onChange={e => setNewLesson({...newLesson, day: e.target.value})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
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
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase mr-2 text-right block">סוג שיעור</label>
                                <select 
                                    value={newLesson.category}
                                    onChange={e => setNewLesson({...newLesson, category: e.target.value as any})}
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
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
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={saveLesson}
                                className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg active:scale-95 cursor-pointer"
                            >
                                {editingLessonId ? 'שמור שיעור' : 'הוסף למערכת'}
                            </button>
                            <button 
                                onClick={() => { setIsModalOpen(false); setEditingLessonId(null); }}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
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
