import React, { useState } from 'react';
import { BookOpen, FileText, LayoutList, Plus, ChevronLeft, Search, Sparkles, X, Brain } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

type Material = {
    id: string;
    title: string;
    type: 'book' | 'article' | 'video' | 'link';
    topic: string;
    subtopic?: string;
    tags: string[];
    details?: string;
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
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{title}</h3>
            <button 
                onClick={onAdd}
                className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-700 transition"
            >
                <Plus className="w-5 h-5" />
                הוסף
            </button>
        </div>
        <div className="grid gap-4">
            {materials.map(mat => (
                <div 
                    key={mat.id} 
                    className="flex p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl items-center gap-4 hover:ring-2 hover:ring-brand-400 group cursor-pointer transition-all"
                    onClick={() => onView(mat)}
                >
                    <div className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                        <BookOpen className="w-8 h-8 text-brand-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{mat.title}</h4>
                        <p className="text-slate-500 text-sm">{mat.topic} {mat.subtopic && `> ${mat.subtopic}`}</p>
                    </div>
                    <div className="mr-auto flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                        <div className="hidden md:flex gap-2">
                            {mat.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg text-[10px] font-black uppercase text-slate-400 group-hover:text-brand-600 group-hover:border-brand-200 transition-colors">{tag}</span>
                            ))}
                        </div>
                        <button 
                            onClick={() => onEdit(mat.id)}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                        >
                            ערוך
                        </button>
                        <button 
                            onClick={() => onDelete(mat.id)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        >
                            מחק
                        </button>
                    </div>
                </div>
            ))}
            {materials.length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                    <p className="text-slate-400 font-bold italic">אין חומרים להצגה בסינון זה.</p>
                </div>
            )}
        </div>
    </div>
);

export const ContentManagementView = ({ onBack }: { onBack: () => void }) => {
    const [activeTab, setActiveTab] = useState<'materials' | 'exams' | 'worksheets' | 'lessons' | 'booklets'>('materials');
    const [materials, setMaterials] = useState<Material[]>([
        { id: '1', title: 'הקדמה לאלגברה', type: 'book', topic: 'מתמטיקה', subtopic: 'אלגברה בסיסית', tags: ['אלגברה', 'בסיסי'], details: '# אלגברה בסיסית\n\nבשיעור זה נלמד על משתנים וביטויים אלגבריים.' },
        { id: '2', title: 'מבוא לפיזיקה קלאסית', type: 'article', topic: 'פיזיקה', subtopic: 'מכניקה', tags: ['פיזיקה', 'מכניקה'] }
    ]);
    const [exams, setExams] = useState<Material[]>([
        { id: 'e1', title: 'מבחן אמצע: אלגברה', type: 'book', topic: 'מתמטיקה', subtopic: 'אלגברה בסיסית', tags: ['מבחן', 'אלגברה'] }
    ]);
    const [worksheets, setWorksheets] = useState<Material[]>([
        { id: 'w1', title: 'דף תרגול: מכניקה', type: 'article', topic: 'פיזיקה', subtopic: 'מכניקה', tags: ['דף עבודה', 'מכניקה'] }
    ]);
    const [booklets, setBooklets] = useState<Material[]>([
        { id: 'b1', title: 'סיכום אלגברה בסיסית', type: 'book', topic: 'מתמטיקה', subtopic: 'אלגברה בסיסית', tags: ['סיכום', 'אלגברה'] }
    ]);
    const [lessons, setLessons] = useState<Material[]>([
        { id: 'l1', title: 'שיעור 1: מבוא למשתנים', type: 'video', topic: 'מתמטיקה', subtopic: 'אלגברה בסיסית', tags: ['מערך שיעור', 'משתנים'] }
    ]);
    const [topics, setTopics] = useState<Topic[]>([
        { name: 'מתמטיקה', subtopics: ['אלגברה בסיסית', 'גיאומטריה'] },
        { name: 'פיזיקה', subtopics: ['מכניקה', 'חשמל'] }
    ]);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [newMaterial, setNewMaterial] = useState<Omit<Material, 'id'>>({ title: '', type: 'book', topic: '', tags: [], details: '' });
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

    const openAddModal = () => {
        setNewMaterial({ title: '', type: 'book', topic: '', tags: [], details: '' });
        setEditingMaterialId(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (id: string) => {
        const allMaterials = [...materials, ...exams, ...worksheets, ...booklets, ...lessons];
        const material = allMaterials.find(m => m.id === id);
        if (material) {
            setNewMaterial({ title: material.title, type: material.type, topic: material.topic, subtopic: material.subtopic, tags: material.tags, details: material.details || '' });
            setEditingMaterialId(id);
            setIsAddModalOpen(true);
        }
    };

    const handleAddOrEditMaterial = () => {
        if (editingMaterialId) {
            // Update
            const updateList = (list: Material[], setList: React.Dispatch<React.SetStateAction<Material[]>>) => 
                setList(list.map(m => m.id === editingMaterialId ? { ...m, ...newMaterial, id: editingMaterialId } : m));
            
            if (activeTab === 'materials') updateList(materials, setMaterials);
            if (activeTab === 'exams') updateList(exams, setExams);
            if (activeTab === 'worksheets') updateList(worksheets, setWorksheets);
            if (activeTab === 'booklets') updateList(booklets, setBooklets);
            if (activeTab === 'lessons') updateList(lessons, setLessons);
        } else {
            // Add
            const newItem = { ...newMaterial, id: Date.now().toString() };
            if (activeTab === 'materials') setMaterials([...materials, newItem]);
            if (activeTab === 'exams') setExams([...exams, newItem]);
            if (activeTab === 'worksheets') setWorksheets([...worksheets, newItem]);
            if (activeTab === 'booklets') setBooklets([...booklets, newItem]);
            if (activeTab === 'lessons') setLessons([...lessons, newItem]);
        }
        setIsAddModalOpen(false);
        setEditingMaterialId(null);
        setNewMaterial({ title: '', type: 'book', topic: '', tags: [], details: '' });
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
    const filteredBooklets = selectedTopic ? booklets.filter(m => m.topic === selectedTopic) : booklets;
    const filteredLessons = selectedTopic ? lessons.filter(m => m.topic === selectedTopic) : lessons;

    return (
        <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors" dir="rtl">
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
                    { id: 'materials', label: 'חומרי לימוד' },
                    { id: 'exams', label: 'מבחנים' },
                    { id: 'worksheets', label: 'דפי עבודה' },
                    { id: 'booklets', label: 'חוברות לימוד' },
                    { id: 'lessons', label: 'מערכי שיעור' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "px-8 py-4 rounded-2xl font-black transition-all whitespace-nowrap shadow-sm",
                            activeTab === tab.id ? "bg-brand-600 text-white scale-105 shadow-brand-200" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

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
                        <MaterialList title={`מאגר חומרי לימוד ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredMaterials} onAdd={openAddModal} onDelete={(id) => setMaterials(materials.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'exams' && (
                        <MaterialList title={`מאגר מבחנים ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredExams} onAdd={openAddModal} onDelete={(id) => setExams(exams.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'worksheets' && (
                        <MaterialList title={`מאגר דפי עבודה ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredWorksheets} onAdd={openAddModal} onDelete={(id) => setWorksheets(worksheets.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'booklets' && (
                        <MaterialList title={`חוברות לימוד ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredBooklets} onAdd={openAddModal} onDelete={(id) => setBooklets(booklets.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
                    )}
                    {activeTab === 'lessons' && (
                        <MaterialList title={`מערכי שיעור ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredLessons} onAdd={openAddModal} onDelete={(id) => setLessons(lessons.filter(m => m.id !== id))} onEdit={openEditModal} onView={setSelectedMaterial} />
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

                        <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-p:font-medium text-right" dir="rtl">
                            {selectedMaterial.details ? (
                                <div className="markdown-body">
                                    <Markdown>{selectedMaterial.details}</Markdown>
                                </div>
                            ) : (
                                <div className="text-center py-20 opacity-30">
                                    <FileText className="w-20 h-20 mx-auto mb-4" />
                                    <p className="text-xl font-bold italic">אין תוכן מפורט להצגה עבור פריט זה.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[1001]" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] w-full max-w-2xl space-y-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {editingMaterialId ? 'עריכת' : 'הוספת'} 
                                {activeTab === 'materials' ? ' חומר לימוד' : activeTab === 'exams' ? ' מבחן' : activeTab === 'worksheets' ? ' דף עבודה' : activeTab === 'booklets' ? ' חוברת לימוד' : ' מערך שיעור'} 
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">כותרת</label>
                                        <input 
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-black text-slate-700 outline-none transition-all"
                                            placeholder="מה השם של החומר?"
                                            value={newMaterial.title}
                                            onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">נושא</label>
                                        <select 
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-black text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                                            value={newMaterial.topic}
                                            onChange={e => setNewMaterial({...newMaterial, topic: e.target.value, subtopic: undefined})}
                                        >
                                            <option value="">בחר נושא...</option>
                                            {topics.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">תת-נושא</label>
                                        <select 
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-black text-slate-700 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer"
                                            disabled={!newMaterial.topic}
                                            value={newMaterial.subtopic || ''}
                                            onChange={e => setNewMaterial({...newMaterial, subtopic: e.target.value})}
                                        >
                                            <option value="">בחר תת-נושא...</option>
                                            {topics.find(t => t.name === newMaterial.topic)?.subtopics.map(st => <option key={st} value={st}>{st}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">תגיות (מופרדות בפסיק)</label>
                                        <input 
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-black text-slate-700 outline-none transition-all"
                                            placeholder="תרגול, בסיס, מתקדמים..."
                                            value={newMaterial.tags.join(', ')}
                                            onChange={e => setNewMaterial({...newMaterial, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-2 mb-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">תוכן מפורט / מערך שיעור (Markdown)</label>
                                        <button 
                                            onClick={generateAIPlan}
                                            disabled={isAIGenerating || !newMaterial.title || !newMaterial.topic}
                                            className="flex items-center gap-2 text-[10px] font-black text-white px-3 py-1 bg-gradient-to-r from-brand-600 to-indigo-600 rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                        >
                                            {isAIGenerating ? 'מייצר...' : (
                                                <>
                                                    <Brain className="w-3 h-3" />
                                                    ייצר עם AI
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea 
                                        className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500/20 font-medium text-slate-700 dark:text-slate-200 outline-none h-64 resize-none transition-all custom-scrollbar"
                                        placeholder="הכנס כאן את תוכן המערך או השתמש ב-AI..."
                                        value={newMaterial.details}
                                        onChange={e => setNewMaterial({...newMaterial, details: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={handleAddOrEditMaterial} className="flex-1 py-5 bg-brand-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                {editingMaterialId ? 'שמור שינויים' : 'הוסף למאגר'}
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

