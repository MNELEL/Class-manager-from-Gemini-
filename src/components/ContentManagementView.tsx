import React, { useState } from 'react';
import { BookOpen, FileText, LayoutList, Plus, ChevronLeft, Search, Sparkles, X, Brain, Upload, FileUp, ListTree, Lightbulb, Repeat, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

type Material = {
    id: string;
    title: string;
    type: 'lesson' | 'exam' | 'worksheet' | 'question' | 'summary';
    topic: string;
    subtopic?: string;
    tags: string[];
    details?: string;
    understandings?: string[]; // הבנות
    options?: string[]; // אופציות/אפשרויות
    order?: string; // סדר פדגוגי
    sections?: string[]; // מדורים
    status: 'draft' | 'analyzed' | 'organized';
};

type Topic = {
    name: string;
    subtopics: string[];
};

const MaterialList = ({ title, materials, onAdd, onDelete, onEdit, onView }: { 
    title: string, 
    materials: Material[], 
    onAdd: () => void, 
    onDelete: (id: string) => void, 
    onEdit: (id: string) => void,
    onView: (material: Material) => void 
}) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h3>
            <button 
                onClick={onAdd}
                className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-700 transition shadow-sm"
            >
                <Plus className="w-4 h-4" />
                הוסף
            </button>
        </div>
        <div className="grid gap-2">
            {materials.map(mat => (
                <div 
                    key={mat.id} 
                    className="flex p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg items-center gap-4 hover:border-brand-300 group cursor-pointer transition-all"
                    onClick={() => onView(mat)}
                >
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <BookOpen className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base text-slate-800 dark:text-slate-100">{mat.title}</h4>
                        <p className="text-slate-500 text-xs">{mat.topic} {mat.subtopic && `> ${mat.subtopic}`}</p>
                    </div>
                    <div className="mr-auto flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                        <div className="hidden md:flex gap-2">
                            {mat.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-medium uppercase text-slate-500">{tag}</span>
                            ))}
                        </div>
                        <button 
                            onClick={() => onEdit(mat.id)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 rounded transition-colors"
                        >
                            ערוך
                        </button>
                        <button 
                            onClick={() => onDelete(mat.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 rounded transition-colors"
                        >
                            מחק
                        </button>
                    </div>
                </div>
            ))}
            {materials.length === 0 && (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <p className="text-slate-400 font-medium italic">אין חומרים להצגה בסינון זה.</p>
                </div>
            )}
        </div>
    </div>
);

export const ContentManagementView = ({ onBack }: { onBack: () => void }) => {
    const [activeTab, setActiveTab] = useState<'materials' | 'exams' | 'worksheets' | 'lessons' | 'questions'>('materials');
    const [materials, setMaterials] = useState<Material[]>([
        { id: '1', title: 'הקדמה לאלגברה', type: 'lesson', topic: 'מתמטיקה', subtopic: 'אלגברה בסיסית', tags: ['אלגברה', 'בסיסי'], details: '# אלגברה בסיסית\n\nבשיעור זה נלמד על משתנים וביטויים אלגבריים.', status: 'analyzed', understandings: ['הבנת הקשר בין נעלם לערך מספרי', 'שימוש במשתנים בפתרון בעיות'], sections: ['תיאוריה'] },
        { id: '2', title: 'מבוא לפיזיקה קלאסית', type: 'lesson', topic: 'פיזיקה', subtopic: 'מכניקה', tags: ['פיזיקה', 'מכניקה'], status: 'draft' }
    ]);
    const [exams, setExams] = useState<Material[]>([
        { id: 'e1', title: 'מבחן אמצע: אלגברה', type: 'exam', topic: 'מתמטיקה', subtopic: 'אלגברה בסיסית', tags: ['מבחן', 'אלגברה'], status: 'draft' }
    ]);
    const [worksheets, setWorksheets] = useState<Material[]>([
        { id: 'w1', title: 'דף תרגול: מכניקה', type: 'worksheet', topic: 'פיזיקה', subtopic: 'מכניקה', tags: ['דף עבודה', 'מכניקה'], status: 'draft' }
    ]);
    const [questions, setQuestions] = useState<Material[]>([
        { id: 'q1', title: 'שאלת תרגול: חוקי ניוטון', type: 'question', topic: 'פיזיקה', subtopic: 'מכניקה', tags: ['שאלה', 'חוקי ניוטון'], status: 'draft' }
    ]);
    const [topics, setTopics] = useState<Topic[]>([
        { name: 'מתמטיקה', subtopics: ['אלגברה בסיסית', 'גיאומטריה'] },
        { name: 'פיזיקה', subtopics: ['מכניקה', 'חשמל'] }
    ]);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [newMaterial, setNewMaterial] = useState<Partial<Material>>({ title: '', type: 'lesson', topic: '', tags: [], details: '', understandings: [], options: [], sections: [] });
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const openAddModal = () => {
        setNewMaterial({ title: '', type: 'lesson', topic: '', tags: [], details: '', understandings: [], options: [], sections: [] });
        setEditingMaterialId(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (id: string) => {
        const allMaterials = [...materials, ...exams, ...worksheets, ...questions];
        const material = allMaterials.find(m => m.id === id);
        if (material) {
            setNewMaterial({ 
                title: material.title, 
                type: material.type, 
                topic: material.topic, 
                subtopic: material.subtopic, 
                tags: material.tags, 
                details: material.details || '',
                understandings: material.understandings || [],
                options: material.options || [],
                sections: material.sections || []
            });
            setEditingMaterialId(id);
            setIsAddModalOpen(true);
        }
    };

    const handleAddOrEditMaterial = () => {
        if (editingMaterialId) {
            const updateList = (list: Material[], setList: React.Dispatch<React.SetStateAction<Material[]>>) => 
                setList(list.map(m => m.id === editingMaterialId ? { ...m, ...newMaterial as Material, id: editingMaterialId } : m));
            
            if (activeTab === 'materials') updateList(materials, setMaterials);
            if (activeTab === 'exams') updateList(exams, setExams);
            if (activeTab === 'worksheets') updateList(worksheets, setWorksheets);
            if (activeTab === 'questions') updateList(questions, setQuestions);
        } else {
            const newItem = { ...(newMaterial as Material), id: Date.now().toString(), status: (newMaterial.status || 'draft') as any };
            if (activeTab === 'materials') setMaterials([...materials, newItem]);
            if (activeTab === 'exams') setExams([...exams, newItem]);
            if (activeTab === 'worksheets') setWorksheets([...worksheets, newItem]);
            if (activeTab === 'questions') setQuestions([...questions, newItem]);
        }
        setIsAddModalOpen(false);
        setEditingMaterialId(null);
        setNewMaterial({ title: '', type: 'lesson', topic: '', tags: [], details: '', understandings: [], options: [], sections: [] });
    };

    const analyzeMaterialWithAI = async (text: string) => {
        setIsAIGenerating(true);
        // Simulate AI analysis
        setTimeout(() => {
            const analysis = {
                title: text.split('\n')[0].replace('#', '').trim() || 'חומר חדש שנותח',
                type: text.toLowerCase().includes('מבחן') ? 'exam' : text.toLowerCase().includes('שאלה') ? 'question' : 'lesson',
                understandings: ['הבנת מושגי יסוד', 'ניתוח תהליכים'],
                options: ['משימת אתגר', 'עבודת קבוצות', 'דיון כיתתי'],
                sections: ['פתיחה', 'למידה פעילה', 'סיכום'],
                order: 'פרוגרסיבי - מהקל אל הכבד',
                status: 'analyzed'
            };
            setNewMaterial(prev => ({ ...prev, ...analysis as any, details: text }));
            setIsAIGenerating(false);
        }, 1500);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // In a real app we'd read the file
            analyzeMaterialWithAI(`מערך שיעור על ${file.name.replace('.docx', '').replace('.pdf', '')}\n\nתוכן הקובץ שהועלה ינותח כאן...`);
            setIsAddModalOpen(true);
        }
    };

    const generateAIPlan = async () => {
        if (!newMaterial.title || !newMaterial.topic) {
            alert('אנא הזן כותרת ונושא כדי שה-AI יוכל לייצר מערך שיעור.');
            return;
        }

        setIsAIGenerating(true);
        try {
            const response = await fetch('/api/ai/lesson-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: `${newMaterial.topic}: ${newMaterial.title}`,
                    gradeLevel: 'יסודי/חטיבה',
                    duration: '45 דקות',
                    objectives: newMaterial.tags.join(', ')
                })
            });

            const data = await response.json();
            if (data.text) {
                setNewMaterial(prev => ({ ...prev, details: data.text }));
            }
        } catch (error) {
            console.error('Error generating plan:', error);
            alert('שגיאה ביצירת המערך. נסה שוב מאוחר יותר.');
        } finally {
            setIsAIGenerating(false);
        }
    };

    const filteredMaterials = selectedTopic ? materials.filter(m => m.topic === selectedTopic) : materials;
    const filteredExams = selectedTopic ? exams.filter(m => m.topic === selectedTopic) : exams;
    const filteredWorksheets = selectedTopic ? worksheets.filter(m => m.topic === selectedTopic) : worksheets;
    const filteredQuestions = selectedTopic ? questions.filter(m => m.topic === selectedTopic) : questions;

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors" dir="rtl">
            <div className="flex items-center gap-6">
                <button 
                  onClick={onBack}
                  className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="flex-1">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ניהול תוכן ולמידה</h2>
                    <p className="text-slate-500 font-medium">ניהול חומרי לימוד, מבחנים, דפי עבודה ומערכי שיעור משולב AI.</p>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'materials', label: 'כל החומרים', icon: <LayoutList className="w-5 h-5" /> },
                    { id: 'lessons', label: 'מערכי שיעור', icon: <FileText className="w-5 h-5" /> },
                    { id: 'exams', label: 'מבחנים', icon: <CheckCircle2 className="w-5 h-5" /> },
                    { id: 'worksheets', label: 'דפי עבודה', icon: <Repeat className="w-5 h-5" /> },
                    { id: 'questions', label: 'בנק שאלות', icon: <Lightbulb className="w-5 h-5" /> }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "px-8 py-4 rounded-2xl font-black transition-all whitespace-nowrap shadow-sm flex items-center gap-3",
                            activeTab === tab.id ? "bg-brand-600 text-white scale-105 shadow-brand-200" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                    "relative overflow-hidden p-8 border-2 border-dashed rounded-[3rem] transition-all duration-500 bg-white dark:bg-slate-900",
                    isDragging ? "border-brand-500 bg-brand-50/50 scale-[1.02] shadow-2xl" : "border-slate-200 dark:border-slate-800"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) analyzeMaterialWithAI(`מערך שיעור מבוסס קובץ: ${file.name}`);
                    setIsAddModalOpen(true);
                }}
            >
                <div className="flex flex-col items-center justify-center text-center space-y-6 py-4">
                    <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-[2rem] flex items-center justify-center text-brand-600 animate-bounce">
                        <Upload className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">העלאה מהירה וניתוח AI</h3>
                        <p className="text-slate-500 font-medium">גרור לכאן קבצים (Word, PDF, Excel) וה-AI יפרק אותם אוטומטית למדורים, הבנות וסדר פדגוגי.</p>
                    </div>
                    <label className="cursor-pointer px-10 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95">
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                        בחר קובץ מהמחשב
                    </label>
                </div>
                {isAIGenerating && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
                        <p className="font-black text-brand-700">ה-AI מנתח את החומר הפדגוגי שלך...</p>
                    </div>
                )}
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Topic Sidebar */}
                <div className="lg:w-80 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">סינון לפי נושא</span>
                            <button 
                                onClick={() => {
                                    const name = prompt('הכנס שם נושא חדש:');
                                    if (name) setTopics([...topics, { name, subtopics: [] }]);
                                }}
                                className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <button
                                onClick={() => setSelectedTopic(null)}
                                className={cn(
                                    "w-full text-right p-4 rounded-2xl font-black transition-all flex items-center justify-between",
                                    !selectedTopic ? "bg-brand-50 text-brand-700 shadow-sm" : "hover:bg-slate-50 text-slate-500"
                                )}
                            >
                                <span>כל הנושאים</span>
                                {!selectedTopic && <div className="w-2 h-2 bg-brand-500 rounded-full" />}
                            </button>
                            {topics.map(topic => (
                                <div key={topic.name} className="group relative">
                                    <button
                                        onClick={() => setSelectedTopic(topic.name)}
                                        className={cn(
                                            "w-full text-right p-4 rounded-2xl font-black transition-all flex items-center justify-between",
                                            selectedTopic === topic.name ? "bg-brand-50 text-brand-700 shadow-sm" : "hover:bg-slate-50 text-slate-500"
                                        )}
                                    >
                                        <span>{topic.name}</span>
                                        {selectedTopic === topic.name && <div className="w-2 h-2 bg-brand-500 rounded-full" />}
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`האם למחוק את הנושא "${topic.name}"?`)) {
                                                setTopics(topics.filter(t => t.name !== topic.name));
                                                if (selectedTopic === topic.name) setSelectedTopic(null);
                                            }
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-rose-300 opacity-0 group-hover:opacity-100 transition-all hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                                    >
                                        <ChevronLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-brand-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl">
                        <Sparkles className="w-10 h-10 mb-4 opacity-50" />
                        <h4 className="text-xl font-black mb-2">עוזר ה-AI שלכם</h4>
                        <p className="text-sm text-brand-100 leading-relaxed font-medium">
                            צריכים מערך שיעור מהיר? השתמשו בכפתור ה-AI בתהליך ההוספה כדי לקבל תוכנית לימודים מפורטת בתוך שניות.
                        </p>
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm min-h-[500px]">
                    {activeTab === 'materials' && (
                        <MaterialList title={`מאגר תוכן פדגוגי ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={[...materials, ...exams, ...worksheets, ...questions].filter(m => !selectedTopic || m.topic === selectedTopic)} onAdd={openAddModal} onDelete={(id) => setMaterials(materials.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'lessons' && (
                        <MaterialList title={`מערכי שיעור ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={materials.filter(m => m.type === 'lesson' && (!selectedTopic || m.topic === selectedTopic))} onAdd={openAddModal} onDelete={(id) => setMaterials(materials.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'exams' && (
                        <MaterialList title={`מבחנים ובחנים ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={exams.filter(m => !selectedTopic || m.topic === selectedTopic)} onAdd={openAddModal} onDelete={(id) => setExams(exams.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'worksheets' && (
                        <MaterialList title={`דפי עבודה ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={worksheets.filter(m => !selectedTopic || m.topic === selectedTopic)} onAdd={openAddModal} onDelete={(id) => setWorksheets(worksheets.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'questions' && (
                        <MaterialList title={`בנק שאלות ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={questions.filter(m => !selectedTopic || m.topic === selectedTopic)} onAdd={openAddModal} onDelete={(id) => setQuestions(questions.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                </div>
            </div>

            {/* Material Details Modal */}
            {selectedMaterial && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[1001]" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-10 shadow-2xl relative">
                        <button onClick={() => setSelectedMaterial(null)} className="absolute top-8 left-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                        
                        <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-100 dark:border-slate-800">
                            <div className="p-6 bg-brand-50 dark:bg-brand-900/20 rounded-[2rem]">
                                <BookOpen className="w-12 h-12 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-2">{selectedMaterial.title}</h3>
                                <div className="flex items-center gap-3">
                                    <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-black text-slate-500 uppercase">{selectedMaterial.topic}</span>
                                    {selectedMaterial.subtopic && <span className="px-4 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-black uppercase">{selectedMaterial.subtopic}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 mb-4 text-brand-600 font-black">
                                        <Lightbulb className="w-5 h-5" />
                                        <span>הבנות מפתח (Pedagogical Insights)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {(selectedMaterial.understandings || []).map((u, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl">
                                                <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{u}</span>
                                            </div>
                                        ))}
                                        {(!selectedMaterial.understandings || selectedMaterial.understandings.length === 0) && <p className="text-xs text-slate-400 italic">טרם בוצע ניתוח הבנות.</p>}
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 mb-4 text-brand-600 font-black">
                                        <ListTree className="w-5 h-5" />
                                        <span>מדורים וסדר פדגוגי</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-2 flex-wrap">
                                            {(selectedMaterial.sections || []).map((s, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-black">{s}</span>
                                            ))}
                                        </div>
                                        {selectedMaterial.order && (
                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-brand-100 dark:border-brand-900/20">
                                                <p className="text-xs font-black text-brand-600 mb-1">סדר מומלץ:</p>
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{selectedMaterial.order}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-p:font-medium text-right" dir="rtl">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 mb-4 text-brand-600 font-black">
                                        <FileText className="w-5 h-5" />
                                        <span>תוכן מפורט</span>
                                    </div>
                                    {selectedMaterial.details ? (
                                        <div className="markdown-body text-sm">
                                            <Markdown>{selectedMaterial.details}</Markdown>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 opacity-30">
                                            <FileText className="w-12 h-12 mx-auto mb-4" />
                                            <p className="text-sm font-bold italic">אין תוכן מפורט.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[1001]" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] w-full max-w-4xl space-y-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {editingMaterialId ? 'עריכת' : 'הוספת'} חומר פדגוגי
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">כותרת החומר</label>
                                        <input 
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-black text-slate-700 dark:text-white outline-none transition-all"
                                            placeholder="למשל: מבחן מסכם בביולוגיה"
                                            value={newMaterial.title}
                                            onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">סוג חומרי הלימוד</label>
                                        <select 
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-black text-slate-700 dark:text-white outline-none transition-all cursor-pointer"
                                            value={newMaterial.type}
                                            onChange={e => setNewMaterial({...newMaterial, type: e.target.value as any})}
                                        >
                                            <option value="lesson">מערך שיעור</option>
                                            <option value="exam">מבחן</option>
                                            <option value="worksheet">דף עבודה</option>
                                            <option value="question">שאלה בודדת</option>
                                            <option value="summary">סיכום</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">הבנות פדגוגיות (AI)</label>
                                        <div className="p-4 bg-emerald-50/30 dark:bg-emerald-900/10 border-2 border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl min-h-[100px]">
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {(newMaterial.understandings || []).map((u, i) => (
                                                    <span key={i} className="px-3 py-1 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                                        {u}
                                                        <button onClick={() => setNewMaterial(prev => ({ ...prev, understandings: prev.understandings?.filter((_, index) => index !== i) }))} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                                                    </span>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const u = prompt('הכנס הבנה פדגוגית חדשה:');
                                                    if (u) setNewMaterial(prev => ({ ...prev, understandings: [...(prev.understandings || []), u] }));
                                                }}
                                                className="text-xs font-black text-emerald-600 hover:underline"
                                            >
                                                + הוסף הבנה
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">מדורי סדר (Sections)</label>
                                        <div className="p-4 bg-brand-50/30 dark:bg-brand-900/10 border-2 border-brand-100/50 dark:border-brand-900/20 rounded-2xl min-h-[100px]">
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {(newMaterial.sections || []).map((s, i) => (
                                                    <span key={i} className="px-3 py-1 bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800 rounded-lg text-xs font-bold text-brand-800 dark:text-brand-300 flex items-center gap-2">
                                                        {s}
                                                        <button onClick={() => setNewMaterial(prev => ({ ...prev, sections: prev.sections?.filter((_, index) => index !== i) }))} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                                                    </span>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const s = prompt('הכנס מדור חדש:');
                                                    if (s) setNewMaterial(prev => ({ ...prev, sections: [...(prev.sections || []), s] }));
                                                }}
                                                className="text-xs font-black text-brand-600 hover:underline"
                                            >
                                                + הוסף מדור
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-2 mb-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">תוכן מפורט (Markdown)</label>
                                        <button 
                                            onClick={() => analyzeMaterialWithAI(newMaterial.details || '')}
                                            disabled={isAIGenerating || !newMaterial.details}
                                            className="flex items-center gap-2 text-[10px] font-black text-white px-3 py-1 bg-brand-600 rounded-full hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                            <Brain className="w-3 h-3" />
                                            נתח תוכן קיים ב-AI
                                        </button>
                                    </div>
                                    <textarea 
                                        className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-medium text-slate-700 dark:text-slate-200 outline-none h-64 resize-none transition-all custom-scrollbar"
                                        placeholder="הכנס כאן את תוכן החומר שלך..."
                                        value={newMaterial.details}
                                        onChange={e => setNewMaterial({...newMaterial, details: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={handleAddOrEditMaterial} className="flex-1 py-5 bg-brand-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                {editingMaterialId ? 'שמור שינויים' : 'הוסף למאגר הפדגוגי'}
                            </button>
                            <button onClick={() => setIsAddModalOpen(false)} className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 transition-all">
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

