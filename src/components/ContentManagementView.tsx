import React, { useState } from 'react';
import { BookOpen, FileText, LayoutList, Plus, ChevronLeft, Search } from 'lucide-react';
import { cn } from '../lib/utils';

type Material = {
    id: string;
    title: string;
    type: 'book' | 'article' | 'video' | 'link';
    topic: string;
    subtopic?: string;
    tags: string[];
};

type Topic = {
    name: string;
    subtopics: string[];
};

const MaterialList = ({ title, materials, onAdd, onDelete, onEdit }: { title: string, materials: Material[], onAdd: () => void, onDelete: (id: string) => void, onEdit: (id: string) => void }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-800">{title}</h3>
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
                <div key={mat.id} className="flex p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl items-center gap-4">
                    <BookOpen className="w-10 h-10 text-brand-600" />
                    <div>
                        <h4 className="font-bold text-lg">{mat.title}</h4>
                        <p className="text-slate-500 text-sm">{mat.topic} {mat.subtopic && `> ${mat.subtopic}`}</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {mat.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold">{tag}</span>
                        ))}
                        <button 
                            onClick={() => onEdit(mat.id)}
                            className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
                        >
                            ערוך
                        </button>
                        <button 
                            onClick={() => onDelete(mat.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                            מחק
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const ContentManagementView = ({ onBack }: { onBack: () => void }) => {
    const [activeTab, setActiveTab] = useState<'materials' | 'exams' | 'worksheets' | 'lessons' | 'booklets'>('materials');
    const [materials, setMaterials] = useState<Material[]>([
        { id: '1', title: 'הקדמה לאלגברה', type: 'book', topic: 'מתמטיקה', subtopic: 'אלגברה בסיסית', tags: ['אלגברה', 'בסיסי'] },
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
    const [topics, setTopics] = useState<Topic[]>([
        { name: 'מתמטיקה', subtopics: ['אלגברה בסיסית', 'גיאומטריה'] },
        { name: 'פיזיקה', subtopics: ['מכניקה', 'חשמל'] }
    ]);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [newMaterial, setNewMaterial] = useState<Omit<Material, 'id'>>({ title: '', type: 'book', topic: '', tags: [] });

    const openAddModal = () => {
        setNewMaterial({ title: '', type: 'book', topic: '', tags: [] });
        setEditingMaterialId(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (id: string) => {
        const allMaterials = [...materials, ...exams, ...worksheets, ...booklets];
        const material = allMaterials.find(m => m.id === id);
        if (material) {
            setNewMaterial({ title: material.title, type: material.type, topic: material.topic, subtopic: material.subtopic, tags: material.tags });
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
        } else {
            // Add
            const newItem = { ...newMaterial, id: Date.now().toString() };
            if (activeTab === 'materials') setMaterials([...materials, newItem]);
            if (activeTab === 'exams') setExams([...exams, newItem]);
            if (activeTab === 'worksheets') setWorksheets([...worksheets, newItem]);
            if (activeTab === 'booklets') setBooklets([...booklets, newItem]);
        }
        setIsAddModalOpen(false);
        setEditingMaterialId(null);
        setNewMaterial({ title: '', type: 'book', topic: '', tags: [] });
    };

    const filteredMaterials = selectedTopic ? materials.filter(m => m.topic === selectedTopic) : materials;
    const filteredExams = selectedTopic ? exams.filter(m => m.topic === selectedTopic) : exams;
    const filteredWorksheets = selectedTopic ? worksheets.filter(m => m.topic === selectedTopic) : worksheets;
    const filteredBooklets = selectedTopic ? booklets.filter(m => m.topic === selectedTopic) : booklets;

    return (
        <div className="p-10 space-y-10 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors">
            <div className="flex items-center gap-6">
                <button 
                  onClick={onBack}
                  className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="flex-1">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ניהול תוכן ולמידה</h2>
                    <p className="text-slate-500 font-medium">ניהול חומרי לימוד, מבחנים, דפי עבודה ומערכי שיעור.</p>
                </div>
            </div>

            <div className="flex gap-4">
                {['materials', 'exams', 'worksheets', 'booklets', 'lessons'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            "px-6 py-3 rounded-2xl font-black transition-all",
                            activeTab === tab ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        )}
                    >
                        {tab === 'materials' && 'חומרי לימוד'}
                        {tab === 'exams' && 'מבחנים'}
                        {tab === 'worksheets' && 'דפי עבודה'}
                        {tab === 'booklets' && 'חוברות לימוד'}
                        {tab === 'lessons' && 'מערכי שיעור'}
                    </button>
                ))}
            </div>

            <div className="flex gap-6">
                {/* Topic Sidebar */}
                <div className="w-64 space-y-4">
                    <button
                        onClick={() => setSelectedTopic(null)}
                        className={cn("w-full text-right p-3 rounded-xl font-bold", !selectedTopic ? "bg-brand-100 text-brand-700" : "hover:bg-slate-100")}
                    >
                        כל הנושאים
                    </button>
                    {topics.map(topic => (
                        <button
                            key={topic.name}
                            onClick={() => setSelectedTopic(topic.name)}
                            className={cn("w-full text-right p-3 rounded-xl font-bold", selectedTopic === topic.name ? "bg-brand-100 text-brand-700" : "hover:bg-slate-100")}
                        >
                            {topic.name}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm min-h-[400px]">
                    {activeTab === 'materials' && (
                        <MaterialList title={`מאגר חומרי לימוד ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredMaterials} onAdd={openAddModal} onDelete={(id) => setMaterials(materials.filter(m => m.id !== id))} onEdit={openEditModal} />
                    )}
                    {activeTab === 'exams' && (
                        <MaterialList title={`מאגר מבחנים ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredExams} onAdd={openAddModal} onDelete={(id) => setExams(exams.filter(m => m.id !== id))} onEdit={openEditModal} />
                    )}
                    {activeTab === 'worksheets' && (
                        <MaterialList title={`מאגר דפי עבודה ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredWorksheets} onAdd={openAddModal} onDelete={(id) => setWorksheets(worksheets.filter(m => m.id !== id))} onEdit={openEditModal} />
                    )}
                    {activeTab === 'booklets' && (
                        <MaterialList title={`חוברות לימוד ${selectedTopic ? `- ${selectedTopic}` : ''}`} materials={filteredBooklets} onAdd={openAddModal} onDelete={(id) => setBooklets(booklets.filter(m => m.id !== id))} onEdit={openEditModal} />
                    )}
                    {activeTab === 'lessons' && (
                        <div className="text-center space-y-4 opacity-50">
                            <BookOpen className="w-20 h-20 mx-auto" />
                            <p className="text-2xl font-black">בקרוב: מערכי שיעור</p>
                        </div>
                    )}
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-md space-y-4">
                        <h3 className="text-xl font-black">
                            {editingMaterialId ? 'ערוך' : 'הוסף'} 
                            {activeTab === 'materials' ? ' חומר לימוד' : activeTab === 'exams' ? ' מבחן' : activeTab === 'worksheets' ? ' דף עבודה' : ' חוברת לימוד'} 
                            חדש
                        </h3>
                        <input 
                            className="w-full p-3 rounded-xl border"
                            placeholder="כותרת"
                            value={newMaterial.title}
                            onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                        />
                        <select 
                            className="w-full p-3 rounded-xl border"
                            value={newMaterial.topic}
                            onChange={e => setNewMaterial({...newMaterial, topic: e.target.value, subtopic: undefined})}
                        >
                            <option value="">בחר נושא</option>
                            {topics.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        </select>
                        {newMaterial.topic && (
                            <select 
                                className="w-full p-3 rounded-xl border"
                                value={newMaterial.subtopic}
                                onChange={e => setNewMaterial({...newMaterial, subtopic: e.target.value})}
                            >
                                <option value="">בחר תת-נושא</option>
                                {topics.find(t => t.name === newMaterial.topic)?.subtopics.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2">ביטול</button>
                            <button onClick={handleAddOrEditMaterial} className="bg-brand-600 text-white px-4 py-2 rounded-xl">שמור</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
