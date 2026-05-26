import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  FileText, 
  LayoutList, 
  Plus, 
  ChevronLeft, 
  Search, 
  Sparkles, 
  X, 
  Brain, 
  Upload, 
  FileUp, 
  ListTree, 
  Lightbulb, 
  Repeat, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Award,
  Wand2,
  Copy,
  Check,
  BookMarked,
  Clock,
  ArrowRight,
  GraduationCap,
  TrendingUp,
  Sliders,
  HelpCircle,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
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
    difficulty?: 'easy' | 'medium' | 'hard';
    gradeLevel?: string;
    estimatedTime?: string;
    details?: string;
    understandings?: string[]; // הבנות פדגוגיות
    options?: string[]; // אופציות התאמה לתלמידים
    order?: string; // הנחיות סדר פדגוגי שפותחו
    sections?: string[]; // חלקי השיעור
    status: 'draft' | 'analyzed' | 'organized';
};

type Topic = {
    name: string;
    subtopics: string[];
};

// Initial default high-quality pedagogical database to load if localStorage is empty
const DEFAULT_MATERIALS: Material[] = [
    { 
        id: '1', 
        title: 'מבוא לאלגברה ומשתנים פשוטים', 
        type: 'lesson', 
        topic: 'מתמטיקה', 
        subtopic: 'אלגברה בסיסית', 
        tags: ['אלגברה', 'משתנים', 'יסודות', 'נעלמים'], 
        difficulty: 'medium',
        gradeLevel: 'כיתה ז׳',
        estimatedTime: '45 דקות',
        details: `# מערך שיעור: היכרות עם עולם האלגברה והמשתנה\n\n### 🎯 מטרות השיעור\n- התלמידים יבינו כי משתנה (משבצת ריקה, x, y) מייצג ערך מספרי שיכול להשתנות.\n- התלמידים ילמדו לתרגם בעיות מילוליות פשוטות לביטויים אלגבריים.\n- הפגת "חרדת המתמטיקה" על ידי שימוש בדוגמאות מלהיבות מחיי היום-יום.\n\n### 📦 ציוד נדרש\n1. קופסה אטומה בצבע בהיר ("קופסת קסמים")\n2. כרטיסיות מספרים\n3. טושים צבעוניים ללוח\n\n---\n\n### 🕰️ מהלך השיעור\n\n#### 1. פתיחה וגירוי (10 דקות)\nנציג לכיתה את "קופסת הקסמים". אנו מכניסים לתוכה מספר סמוי. אנו מגלים לילדים שאם נוסיף לקופסה 5, נקבל 12. \nנשאל את הכיתה: מה יש בתוך הקופסה? \nנסמן את התעלומה הזו כריבוע ריק או כאות **x**.\n\n#### 2. הקניית המושג (15 דקות)\nנסביר ללוח שהאות **x** היא חבר/ה ידידותי/ת שמחליף/ה מספר זמנית. \nהצגת המושג "ביטוי אלגברי" לעומת "ביטוי מספרי".\n- דוגמה: $x + 5$\n- נלווה את ההסבר בהצבה: מה קורה כאשר ה-x מחליט להיות 10? ומה קורה כשהוא 2?\n\n#### 3. תרגול פעיל בקבוצות (15 דקות)\nכל קבוצה מקבלת סיפור רקע (למשל: תמי קנתה $x$ תפוחים ב-3 שקלים לתפוח). עליהם לכתוב את הביטוי האלגברי המתאר את סך התשלום.\n\n#### 4. סיכום ורפלקציה (5 דקות)\nרפלקציה פדגוגית מהירה: מה היתרון של שימוש באותיות במתמטיקה?`, 
        status: 'analyzed', 
        understandings: ['הבנת הקשר בין נעלם לערך מספרי קבוע או משתנה', 'שימוש במשתנים בפתרון בעיות מעשיות', 'תרגום משפטים מדוברים לביטוי אלגברי'], 
        sections: ['פתיחה והסרת חשש', 'הקניה פרונטלית', 'סימולציה כיתתית', 'רפלקציה'],
        order: 'פרוגרסיבי - פתיחה מסתורית, ביסוס המושג, תרגול מעשי מהנה ורפלקציה פדגוגית'
    },
    { 
        id: '2', 
        title: 'חוקי ניוטון - חוק ההתמדה ומדד כוחות', 
        type: 'lesson', 
        topic: 'פיזיקה', 
        subtopic: 'מכניקה', 
        tags: ['ניוטון', 'כוחות', 'מכניקה', 'פיזיקה'], 
        difficulty: 'hard',
        gradeLevel: 'כיתה ט׳',
        estimatedTime: '90 דקות',
        details: `# חוקי ניוטון: חוק ההתמדה (החוק הראשון)\n\n### 🎯 מטרות השיעור\n- התלמיד יגדיר את המושג "התמדה" (אינרציה) והקשר שלו למסה.\n- הבנה שלמצב שבו שקול הכוחות שווה לאפס יש שתי השלכות: מנוחה או תנועה במהירות קבועה.\n- ניתוח דוגמאות בולטות בנסיעה ברכב או באוטובוס.\n\n### 🕰️ שלבי השיעור המרכזיים\n1. **ניסוי קוגניטיבי מלהיב (15 דקות)**: משיכת מפה מתחת לכוס עם מים ללא שפיכתה.\n2. **הקנייה ותיאוריה (30 דקות)**: הצגת הנוסחה והקונספט של שקול כוחות שווה ל-0.\n3. **הדמיית מחשב / מעבדה (30 דקות)**: שימוש בהדמיות כוחות במישור חלק.\n4. **סיכום והערכה (15 דקות)**: פתרון שאלת סיעור מוחות מהחיים האמיתיים.`, 
        status: 'organized',
        understandings: ['שקול כוחות שווה לאפס אין משמעותו בהכרח מנוחה', 'הקשר הישיר בין גודל המסה למידת ההתמדה של הגוף'],
        sections: ['הדגמה חיה', 'הסבר מדעי ממוקד', 'ניסוי אינטראקטיבי באייפדים', 'סיכום'],
        order: 'חקירה חושית של החוק, הגדרה מדעית קפדנית, הגעה להכללה ומסמוך התנהגות גופים'
    },
    { 
        id: '3', 
        title: 'Present Simple vs. Present Progressive', 
        type: 'worksheet', 
        topic: 'אנגלית', 
        subtopic: 'זמנים ודקדוק', 
        tags: ['English', 'Grammar', 'Tenses', 'Present Simple'], 
        difficulty: 'easy',
        gradeLevel: 'כיתה ו׳',
        estimatedTime: '45 דקות',
        details: `# Worksheet: Present Simple vs. Present Progressive\n\n### 📝 Quick Overview\nUse this worksheet to help students practice the differences between permanent habits (Simple) and temporary actions happening right now (Progressive).\n\n### 📋 Exercise 1: Circle the correct verb\n1. I **read / am reading** an interesting book at the moment.\n2. In Israel, it **rains / is raining** mostly during the winter.\n3. Listen! The birds **sing / are singing** in the garden.\n4. Every morning, Dana **drinks / is drinking** hot cocoa.\n\n### 📋 Exercise 2: Complete the sentences\n- Write the verb in brackets in the correct tense:\n1. He __________ (not play) soccer on Tuesdays.\n2. Look! My dog __________ (run) after the ball.`, 
        status: 'draft',
        understandings: ['זיהוי נכון של מילות רמז בזמנים כמו "every day" לעומת "now"', 'הבנת ההבדל המהותי בסוג הפעולה - מחזורית מול רגעית'],
        sections: ['סקירה מהירה', 'עבודה עצמית מודרכת', 'בדיקה משותפת']
    },
    { 
        id: '4', 
        title: 'עקרונות הדמוקרטיה וזכויות האזרח והפרט', 
        type: 'summary', 
        topic: 'אזרחות', 
        subtopic: 'ממשל וחברה', 
        tags: ['אזרחות', 'דמוקרטיה', 'זכויות אזרח', 'חופש הביטוי'], 
        difficulty: 'medium',
        gradeLevel: 'כיתה ח׳',
        estimatedTime: '60 דקות',
        details: `# סיכום פדגוגי מרכז: ערכי היסוד של הדמוקרטיה\n\n### 🔑 מושגי מפתח\n1. **שלטון העם**: האזרחים הם מקור הסמכות והריבון במדינה.\n2. **הכרעת הרוב**: קבלת החלטות בדרכי שלום על ידי רוב המצביעים, תוך שמירה הדוקה על זכויות המיעוט.\n3. **זכויות הפרט והאדם**: חיים וביטחון, חירות, קניין, שוויון, כבוד והליך הוגן.\n\n### 💬 המלצה לדיון כיתתי מעצים\nהציגו בפני התלמידים דילמה של התנגשות בין זכויות: למשל חופש הביטוי והפגנה לעומת זכות הציבור לחופש התנועה והתחבורה. בקשו מהם להשתמש במפת המקומות שלהם בכיתה על מנת לערוך סדר הצבעות ודיון חופשי מובנה.`, 
        status: 'organized',
        understandings: ['הבנה שדמוקרטיה אינה רק שלטון הרוב אלא הגנה הדוקה על זכויות המיעוט', 'יכולת לזהות זכויות מתנגשות בסיטואציות יום-יומיות ולבצע איזון חוקתי פשוט'],
        sections: ['מושגי היסוד', 'דילמה מעשית לדיון', 'סימולציית הצבעה בכיתה']
    }
];

const DEFAULT_TOPICS: Topic[] = [
    { name: 'מתמטיקה', subtopics: ['אלגברה בסיסית', 'גיאומטריה', 'שברים ואחוזים'] },
    { name: 'פיזיקה', subtopics: ['מכניקה', 'חשמל ומגנטיות', 'אופטיקה'] },
    { name: 'אנגלית', subtopics: ['זמנים ודקדוק', 'אוצר מילים', 'הבנת הנשרא'] },
    { name: 'אזרחות', subtopics: ['ממשל וחברה', 'זכויות אדם', 'הרשות המחוקקת'] },
    { name: 'היסטוריה', subtopics: ['בית שני', 'עידן המהפכות', 'הקמת המדינה'] }
];

export const ContentManagementView = ({ onBack }: { onBack: () => void }) => {
    // State management with LocalStorage persistence support
    const [materials, setMaterials] = useState<Material[]>(() => {
        const saved = localStorage.getItem('pedagogy_library_materials');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return DEFAULT_MATERIALS;
    });

    const [topics, setTopics] = useState<Topic[]>(() => {
        const saved = localStorage.getItem('pedagogy_library_topics');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return DEFAULT_TOPICS;
    });

    const [activeTab, setActiveTab] = useState<'materials' | 'lessons' | 'exams' | 'worksheets' | 'questions' | 'summaries' | 'ai_studio'>('materials');
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // AI Generator State
    const [aiSubject, setAiSubject] = useState<string>('חשבון ומדעים');
    const [aiTopic, setAiTopic] = useState<string>('');
    const [aiGradeLevel, setAiGradeLevel] = useState<string>('כיתה ה׳');
    const [aiDuration, setAiDuration] = useState<string>('45 דקות');
    const [aiObjectives, setAiObjectives] = useState<string>('');
    const [aiMaterialType, setAiMaterialType] = useState<'lesson' | 'exam' | 'worksheet' | 'summary'>('lesson');
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [newMaterial, setNewMaterial] = useState<Partial<Material>>({ 
        title: '', 
        type: 'lesson', 
        topic: '', 
        subtopic: '',
        tags: [], 
        difficulty: 'medium',
        gradeLevel: 'כיתה ה׳',
        estimatedTime: '45 דקות',
        details: '', 
        understandings: [], 
        options: [], 
        sections: [],
        order: ''
    });

    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isCopying, setIsCopying] = useState<boolean>(false);

    // Quiz Generator State for Selected Material
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<string | null>(null);

    // Dynamic Tags cloud calculation based on loaded materials
    const tagsCloud = useMemo(() => {
        const tagsMap: Record<string, number> = {};
        materials.forEach(m => {
            (m.tags || []).forEach(t => {
                tagsMap[t] = (tagsMap[t] || 0) + 1;
            });
        });
        return Object.entries(tagsMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    }, [materials]);

    // Save to LocalStorage whenever states alter
    useEffect(() => {
        localStorage.setItem('pedagogy_library_materials', JSON.stringify(materials));
    }, [materials]);

    useEffect(() => {
        localStorage.setItem('pedagogy_library_topics', JSON.stringify(topics));
    }, [topics]);

    const openAddModal = () => {
        setNewMaterial({ 
            title: '', 
            type: 'lesson', 
            topic: topics[0]?.name || 'כללי', 
            subtopic: '',
            tags: [], 
            difficulty: 'medium',
            gradeLevel: 'כיתה ה׳',
            estimatedTime: '45 דקות',
            details: '', 
            understandings: [], 
            options: [], 
            sections: [],
            order: ''
        });
        setEditingMaterialId(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (id: string) => {
        const material = materials.find(m => m.id === id);
        if (material) {
            setNewMaterial({ ...material });
            setEditingMaterialId(id);
            setIsAddModalOpen(true);
        }
    };

    const handleDeleteMaterial = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (confirm('האם אתה בטוח שברצונך למחוק חומר לימודי זה מהמאגר הפדגוגי?')) {
            setMaterials(prev => prev.filter(m => m.id !== id));
            if (selectedMaterial?.id === id) {
                setSelectedMaterial(null);
            }
        }
    };

    const handleAddOrEditMaterial = () => {
        if (!newMaterial.title || !newMaterial.topic) {
            alert('אנא הזן כותרת ונושא מדעי לפחות.');
            return;
        }

        if (editingMaterialId) {
            setMaterials(prev => prev.map(m => m.id === editingMaterialId ? { 
                ...m, 
                ...newMaterial as Material, 
                id: editingMaterialId 
            } : m));
        } else {
            const newItem: Material = {
                id: Date.now().toString(),
                title: newMaterial.title || 'חומר ללא שם',
                type: newMaterial.type || 'lesson',
                topic: newMaterial.topic || 'כללי',
                subtopic: newMaterial.subtopic,
                tags: newMaterial.tags && newMaterial.tags.length > 0 ? newMaterial.tags : [newMaterial.topic || 'כללי'],
                difficulty: newMaterial.difficulty || 'medium',
                gradeLevel: newMaterial.gradeLevel || 'כללי',
                estimatedTime: newMaterial.estimatedTime || '45 דקות',
                details: newMaterial.details || '',
                understandings: newMaterial.understandings || [],
                sections: newMaterial.sections || ['פתיחה', 'תרגול ומעורבות', 'סיכום'],
                order: newMaterial.order || 'סדר מהלך שיעור רגיל',
                status: 'organized'
            };
            setMaterials(prev => [newItem, ...prev]);
        }
        
        setIsAddModalOpen(false);
        setEditingMaterialId(null);
    };

    // Smart file analyzer with AI
    const analyzeMaterialWithAI = async (text: string) => {
        if (!text.trim()) {
            alert('אנא הזן תוכן תחילה כדי לנתח.');
            return;
        }
        setIsAIGenerating(true);
        
        try {
            const prompt = `Analyze the following academic summary or lesson content in Hebrew, and respond with a structured JSON format containing calculated parameters.
            
            Content:
            ${text}
            
            JSON Output layout (MUST BE VALID JSON WITH NO EXTRA TEXT, use double quotes for keys/strings):
            {
               "title": "Clean concise title representing the text in Hebrew",
               "understandings": ["pedagogical understanding 1 (Hebrew)", "pedagogical understanding 2 (Hebrew)"],
               "sections": ["Opening section name in Hebrew", "Activity section name in Hebrew", "Summary section name in Hebrew"],
               "order": "progressive chronological order description in Hebrew",
               "tags": ["tag1", "tag2", "tag3"]
            }`;

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    systemInstruction: "You are a senior pedagogical advisor and curriculum builder. You analyze texts and output strictly formatted JSON responses.",
                    model: "gemini-3.5-flash"
                })
            });

            const data = await response.json();
            if (data.text) {
                // Stripping markdown wrapper if present
                let cleanJson = data.text.trim();
                if (cleanJson.startsWith('```json')) {
                    cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
                } else if (cleanJson.startsWith('```')) {
                    cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
                }
                
                try {
                    const parsed = JSON.parse(cleanJson);
                    setNewMaterial(prev => ({
                        ...prev,
                        title: parsed.title || prev.title,
                        understandings: parsed.understandings || ["למידת נושאי ליבה", "תרגול יישומי פדגוגי"],
                        sections: parsed.sections || ["פתיחה וריכוז", "למידה פעילה", "רפלקציה פדגוגית"],
                        order: parsed.order || "שיעור הדרגתי מהקל אל הכבד",
                        tags: parsed.tags || [prev.topic || 'כללי'],
                        details: text,
                        status: 'analyzed'
                    }));
                } catch (parseErr) {
                    console.error("Parse JSON AI error:", parseErr, cleanJson);
                    // Use fallback metadata
                    setNewMaterial(prev => ({
                        ...prev,
                        title: text.split('\n')[0].replace('#', '').trim() || 'חומר לימודי חדש',
                        understandings: ['הבנת עקרונות הבסיס', 'ניתוח קבוצתי אישי'],
                        sections: ['הקדמה וחזרה', 'עבודה עצמית', 'רפלקציה'],
                        order: 'פתיחת שיעור, ביסוס החוזקות, משוב',
                        details: text,
                        status: 'analyzed'
                    }));
                }
            }
        } catch (error) {
            console.error('Error analyzing:', error);
            alert('שגיאה בניתוח ה-AI. נעשה שימוש בניתוח מטא-נתונים בסיסי.');
            setNewMaterial(prev => ({
                ...prev,
                title: text.split('\n')[0].replace('#', '').trim() || 'חומר שנותח חלקית',
                understandings: ['למידת שימוש נכון בתוכן'],
                sections: ['הקדמה פדגוגית', 'פתרון בעיות'],
                details: text,
                status: 'draft'
            }));
        } finally {
            setIsAIGenerating(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsAIGenerating(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string || '';
                analyzeMaterialWithAI(`מערך שיעור בנושא: ${file.name.replace(/\.[^/.]+$/, "")}\n\n${text}`);
                setIsAddModalOpen(true);
            };
            reader.readAsText(file);
        }
    };

    // FULL AI PEDAGOGICAL BUILDER GENERATOR
    const handleGenerateAIViaStudio = async () => {
        if (!aiTopic.trim()) {
            alert('אנא הזן נושא או כותרת ליצירת מערך ב-AI.');
            return;
        }

        setIsAIGenerating(true);
        try {
            const response = await fetch('/api/ai/lesson-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: `${aiSubject} - ${aiTopic}`,
                    gradeLevel: aiGradeLevel,
                    duration: aiDuration,
                    objectives: aiObjectives || "הבנה עמוקה, מעורבות חברתית כיתתית ותרגול מחדד."
                })
            });

            const data = await response.json();
            if (data.text) {
                // Auto-populate addition state and redirect tabs
                const generatedText = data.text;
                setNewMaterial({
                    title: `${aiTopic} - מערך שיעור מובנה AI`,
                    type: aiMaterialType,
                    topic: aiSubject,
                    difficulty: 'medium',
                    gradeLevel: aiGradeLevel,
                    estimatedTime: aiDuration,
                    details: generatedText,
                    understandings: [
                        'למידה מובנית המבוססת על מטרות השיעור וציוני הבנה',
                        'פיתוח מעורבות פעילה של התלמידים על בסיס חיזוקים כיתתיים',
                        'הערכה מעצבת בדרכים מגוונות'
                    ],
                    sections: ['תיאוריה ומושגים', 'תרגול מעשי מעניין', 'בוחן קצר לסיום'],
                    order: 'מבנה תלת-שלבי פדגוגי'
                });
                setIsAddModalOpen(true);
            }
        } catch (error) {
            console.error('AI general error:', error);
            alert('שגיאה ביצירת התוכנית. נסה שנית בעוד מספר רגעים.');
        } finally {
            setIsAIGenerating(false);
        }
    };

    // GENERATE AI QUICK CLASSROOM POP QUIZ BASED ON MATERIAL DETAILS
    const handleGenerateQuiz = async (material: Material) => {
        if (!material.details) {
            alert('לא נמצא די תוכן מפורט במערך זה כדי לג׳נרט ממנו בוחן עזר.');
            return;
        }
        setIsGeneratingQuiz(true);
        setGeneratedQuiz(null);

        try {
            const promptStr = `על בסיס המערך הלימודי הבא:
            
            נושא: ${material.title}
            פירוט התוכן:
            ${material.details}
            
            צור בוחן כיתתי קצר ומלהיב בעברית הכולל 3 שאלות אמריקאיות (ברירת מאוורר נוספת) עם ארבע תשובות אופציונליות לכל שאלה, וסימון מהי התשובה הנכונה ופירוט פדגוגי קצר מדוע היא נכונה.
            עצב זאת בפורמט Markdown קריא ויפהפה של כרטיסיות.`;

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptStr,
                    systemInstruction: "You are an expert high school and elementary assessment builder. You write beautiful, pedagogical, and clear multiple-choice quizzes in Hebrew.",
                    model: "gemini-3.5-flash"
                })
            });

            const data = await response.json();
            if (data.text) {
                setGeneratedQuiz(data.text);
            }
        } catch (e) {
            console.error('Quiz AI Error:', e);
            alert('לא ניתן היה לייצר בוחן ב-AI כעת.');
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    // Save generated quiz into the local bank
    const handleSaveGeneratedQuizToBank = () => {
        if (!generatedQuiz || !selectedMaterial) return;

        const quizItem: Material = {
            id: Date.now().toString(),
            title: `בוחן הערכה: ${selectedMaterial.title}`,
            type: 'exam',
            topic: selectedMaterial.topic,
            subtopic: selectedMaterial.subtopic,
            tags: [...selectedMaterial.tags, 'בוחן', 'AI-ג׳נרטור'],
            difficulty: selectedMaterial.difficulty || 'medium',
            gradeLevel: selectedMaterial.gradeLevel || 'כללי',
            estimatedTime: '15 דקות',
            details: generatedQuiz,
            understandings: ['הסקת מסקנות פדגוגית מהירה', 'בדיקת קצב התקדמות כיתתי'],
            sections: ['בדיקת רקע', 'שאלות אמריקאיות', 'פידבק מיידי'],
            status: 'organized'
        };

        setMaterials(prev => [quizItem, ...prev]);
        setGeneratedQuiz(null);
        alert('הבוחן נשמר בהצלחה בבנק השאלות והמבחנים שלכם!');
    };

    const handleCopyContent = (text: string) => {
        navigator.clipboard.writeText(text);
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 2000);
    };

    // Filter materials logically
    const filteredMaterialsList = useMemo(() => {
        return materials.filter(m => {
            // Type Filter
            if (activeTab === 'lessons' && m.type !== 'lesson') return false;
            if (activeTab === 'exams' && m.type !== 'exam') return false;
            if (activeTab === 'worksheets' && m.type !== 'worksheet') return false;
            if (activeTab === 'questions' && m.type !== 'question') return false;
            if (activeTab === 'summaries' && m.type !== 'summary') return false;

            // Topic Selector
            if (selectedTopic && m.topic !== selectedTopic) return false;

            // Difficulty Selector
            if (selectedDifficulty !== 'all' && m.difficulty !== selectedDifficulty) return false;

            // Interactive Tag Selector
            if (selectedTag && !m.tags.includes(selectedTag)) return false;

            // Search query text containing title, topic, tags
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchedTitle = m.title.toLowerCase().includes(query);
                const matchedTopic = m.topic.toLowerCase().includes(query);
                const matchedSub = m.subtopic?.toLowerCase().includes(query) || false;
                const matchedTag = m.tags.some(t => t.toLowerCase().includes(query));
                if (!matchedTitle && !matchedTopic && !matchedSub && !matchedTag) return false;
            }

            return true;
        });
    }, [materials, activeTab, selectedTopic, selectedDifficulty, selectedTag, searchQuery]);

    // Aggregate dynamic statistics
    const statsBreakdown = useMemo(() => {
        const counts = {
            total: materials.length,
            lessons: materials.filter(m => m.type === 'lesson').length,
            exams: materials.filter(m => m.type === 'exam').length,
            worksheets: materials.filter(m => m.type === 'worksheet').length,
            questions: materials.filter(m => m.type === 'question').length,
            summaries: materials.filter(m => m.type === 'summary').length,
        };
        return counts;
    }, [materials]);

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors text-right" dir="rtl">
            
            {/* Header section with layout improvements */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="flex items-center gap-4">
                    <button 
                      onClick={onBack}
                      className="p-3 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <BookMarked className="w-8 h-8 text-brand-600" />
                            ספריית הידע והמרחב הפדגוגי הכיתתי
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">
                            מאגר חומרי לימוד מבוזר, עיצוב מערכי שיעור, דפי תרגול, בנק שאלות וכלים ייחודיים מבוססי AI.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Fast add button */}
                    <button
                        onClick={openAddModal}
                        className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-brand-500/15"
                    >
                        <Plus className="w-4 h-4" />
                        חומר פדגוגי חדש
                    </button>
                    <button
                        onClick={() => setActiveTab('ai_studio')}
                        className="px-5 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-2xl font-black text-sm flex items-center gap-2 transition-all border border-indigo-100 dark:border-indigo-900"
                    >
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        סטודיו AI פדגוגי
                    </button>
                </div>
            </div>

            {/* Quick Metrics Visual Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">סך הכל חומרים</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">{statsBreakdown.total}</p>
                </div>
                <div className="p-4 bg-brand-50/20 dark:bg-brand-950/10 border border-brand-100/30 rounded-2xl text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-brand-500">מערכי שיעור</p>
                    <p className="text-3xl font-black text-brand-600 dark:text-brand-400 mt-1">{statsBreakdown.lessons}</p>
                </div>
                <div className="p-4 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/30 rounded-2xl text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-amber-500">מבחנים ובחנים</p>
                    <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{statsBreakdown.exams}</p>
                </div>
                <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 rounded-2xl text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500">דפי עבודה</p>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{statsBreakdown.worksheets}</p>
                </div>
                <div className="p-4 bg-sky-50/20 dark:bg-sky-950/10 border border-sky-100/30 rounded-2xl text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-sky-500">בנק שאלות</p>
                    <p className="text-3xl font-black text-sky-600 dark:text-sky-400 mt-1">{statsBreakdown.questions}</p>
                </div>
                <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 rounded-2xl text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500">סיכומים כלליים</p>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{statsBreakdown.summaries}</p>
                </div>
            </div>

            {/* Main Tabs Selection Navigation */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'materials', label: 'כל המאגר', icon: <LayoutList className="w-4 h-4" /> },
                    { id: 'lessons', label: 'מערכי שיעור', icon: <FileText className="w-4 h-4" /> },
                    { id: 'worksheets', label: 'דפי עבודה', icon: <Repeat className="w-4 h-4" /> },
                    { id: 'exams', label: 'בחנים ומבחנים', icon: <CheckCircle2 className="w-4 h-4" /> },
                    { id: 'questions', label: 'בנק שאלות', icon: <Lightbulb className="w-4 h-4" /> },
                    { id: 'summaries', label: 'סיכומי תוכן', icon: <Layers className="w-4 h-4" /> },
                    { id: 'ai_studio', label: 'מחולל פדגוגי AI', icon: <Wand2 className="w-4 h-4 text-amber-500 animate-pulse" /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as any);
                            setSelectedTag(null); // Reset tag filters back on tab switch
                        }}
                        className={cn(
                            "px-5 py-3 rounded-2xl font-black transition-all whitespace-nowrap shadow-sm flex items-center gap-2.5 text-xs",
                            activeTab === tab.id 
                                ? "bg-brand-600 text-white scale-[1.02] shadow-brand-300" 
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab !== 'ai_studio' ? (
                /* TWO COLUMN LAYOUT: SIDEBAR FILTERS + MATERIALS FEED */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* SIDEBAR FILTERS (3 Columns) */}
                    <div className="lg:col-span-3 space-y-6">
                        
                        {/* SEARCH & FILTERS CONTROLLER */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">חיפוש וסינון מתקדם</span>
                            
                            {/* Text query search */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="חיפוש חופשי..."
                                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-bold rounded-xl border border-transparent focus:border-brand-500 focus:bg-white text-slate-800 dark:text-slate-100 outline-none transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Difficulty Level Dropdown Selector */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-1.5">רמת קושי פדגוגית:</label>
                                <select
                                    value={selectedDifficulty}
                                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent text-xs font-bold rounded-xl text-slate-700 dark:text-white outline-none cursor-pointer"
                                >
                                    <option value="all">כל הרמות</option>
                                    <option value="easy">קל (יסודי)</option>
                                    <option value="medium">בינוני (חטיבה)</option>
                                    <option value="hard">מתקדם (תיגבור)</option>
                                </select>
                            </div>
                        </div>

                        {/* TOPICS ACCORDION SELECTOR */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">תחומי דעת ומקצועות</span>
                                <button 
                                    onClick={() => {
                                        const name = prompt('הכנס שם מקצוע/תחום דעת חדש:');
                                        if (name) setTopics(prev => [...prev, { name, subtopics: [] }]);
                                    }}
                                    className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-all rounded-lg"
                                    title="הוספת תחום דעת חדש"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedTopic(null)}
                                    className={cn(
                                        "w-full text-right px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-between",
                                        !selectedTopic 
                                            ? "bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400" 
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                                    )}
                                >
                                    <span>כל המקצועות</span>
                                    <span className="text-[10px] font-bold opacity-60">({materials.length})</span>
                                </button>

                                {topics.map(topic => {
                                    const count = materials.filter(m => m.topic === topic.name).length;
                                    return (
                                        <div key={topic.name} className="group relative">
                                            <button
                                                onClick={() => setSelectedTopic(topic.name)}
                                                className={cn(
                                                    "w-full text-right px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-between",
                                                    selectedTopic === topic.name 
                                                        ? "bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400" 
                                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500"
                                                )}
                                            >
                                                <span>{topic.name}</span>
                                                <span className="text-[10px] font-bold opacity-60">({count})</span>
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`האם למחוק את הנושא "${topic.name}" ומאגר המשנה שלו?`)) {
                                                        setTopics(topics.filter(t => t.name !== topic.name));
                                                        if (selectedTopic === topic.name) setSelectedTopic(null);
                                                    }
                                                }}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-rose-300 opacity-0 group-hover:opacity-100 transition-all hover:text-rose-500 rounded-md"
                                                title="מחק תחום דעת"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* TAGS CLOUD CLUSTER */}
                        {tagsCloud.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">תגיות נפוצות</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {tagsCloud.map(([tag, count]) => (
                                        <button
                                            key={tag}
                                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                            className={cn(
                                                "px-2.5 py-1 text-[10px] font-black rounded-lg transition-all",
                                                selectedTag === tag
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300"
                                            )}
                                        >
                                            #{tag} <span className="opacity-60 font-medium">({count})</span>
                                        </button>
                                    ))}
                                </div>
                                {selectedTag && (
                                    <button 
                                        onClick={() => setSelectedTag(null)}
                                        className="text-[10px] font-black text-rose-500 mt-3 block hover:underline"
                                    >
                                        • ביטול סינון תוספת תגיות
                                    </button>
                                )}
                            </div>
                        )}

                        {/* FAST FILE IMPORT / DROPZONE */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2rem] p-5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl transform -translate-x-4 -translate-y-4"></div>
                            <h4 className="text-sm font-black mb-1.5 flex items-center gap-1">
                                <FileUp className="w-4 h-4" />
                                ייבוא חומר מהיר ב-AI
                            </h4>
                            <p className="text-[10px] text-indigo-100 leading-relaxed font-semibold mb-3">
                                גררו או בחרו קובץ טקסט/מערך שיעור קיים מהמחשב, וה-AI יפרק אותו אוטומטית למדורים, הבנות ותגיות מובנות!
                            </p>
                            <label className="cursor-pointer block text-center p-2 bg-white/20 hover:bg-white/35 rounded-xl text-xs font-black transition-all">
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                                בחירת קובץ
                            </label>
                        </div>

                    </div>

                    {/* MATERIALS LIST GRID (9 Columns) */}
                    <div className="lg:col-span-9 space-y-4">
                        
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                            
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        ✨ חומרי המרכז הפדגוגי 
                                        {selectedTopic && <span className="text-brand-600">({selectedTopic})</span>}
                                        {selectedTag && <span className="text-indigo-600 font-normal text-sm">#{selectedTag}</span>}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold">מציג {filteredMaterialsList.length} חומרים במערך המדעי</p>
                                </div>

                                <span className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl font-bold">
                                    {statsBreakdown.total} סך הכל פריטים
                                </span>
                            </div>

                            {/* List layout cards */}
                            <div className="space-y-2.5">
                                {filteredMaterialsList.map(mat => {
                                    const typeMeta = {
                                        lesson: { label: 'מערך שיעור', bg: 'bg-brand-50 text-brand-700 border-brand-100' },
                                        exam: { label: 'מבחן/בוחן', bg: 'bg-amber-50 text-amber-700 border-amber-100' },
                                        worksheet: { label: 'דף עבודה', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                                        question: { label: 'בנק שאלות', bg: 'bg-sky-50 text-sky-700 border-sky-100' },
                                        summary: { label: 'אינדקס וסיכום', bg: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                    }[mat.type] || { label: 'כללי', bg: 'bg-gray-50 text-gray-700 border-gray-100' };

                                    const difficultyMeta = {
                                        easy: { label: 'קל • יסודי', bg: 'bg-emerald-100/40 text-emerald-800' },
                                        medium: { label: 'בינוני • חטיבה', bg: 'bg-amber-100/40 text-amber-800' },
                                        hard: { label: 'מתקדם • תיכון', bg: 'bg-rose-100/40 text-rose-800' },
                                    }[mat.difficulty || 'medium'];

                                    return (
                                        <div
                                            key={mat.id}
                                            onClick={() => {
                                                setSelectedMaterial(mat);
                                                setGeneratedQuiz(null); // Reset quick quiz view on switch
                                            }}
                                            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 bg-slate-50/50 hover:bg-brand-50/20 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-2xl cursor-pointer transition-all group hover:scale-[1.005] shadow-sm text-right"
                                        >
                                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl text-brand-600 flex-shrink-0 shadow-sm border border-slate-100 dark:border-slate-600">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-1.5">
                                                        <h4 className="font-black text-slate-850 dark:text-slate-100 text-sm leading-snug group-hover:text-brand-600 transition-colors truncate">
                                                            {mat.title}
                                                        </h4>
                                                        <span className={cn("px-2 py-0.5 border rounded-lg text-[9px] font-black", typeMeta.bg)}>
                                                            {typeMeta.label}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                                        <span className="text-slate-500 dark:text-slate-300 font-black">{mat.topic}</span>
                                                        <span>•</span>
                                                        <span>{mat.gradeLevel || 'כללי'}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {mat.estimatedTime || '45 דקות'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-3 mt-3 sm:mt-0" onClick={e => e.stopPropagation()}>
                                                {/* Meta details difficulty badge */}
                                                <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-black hidden md:block", difficultyMeta.bg)}>
                                                    {difficultyMeta.label}
                                                </span>

                                                {/* Action controls */}
                                                <button
                                                    onClick={() => openEditModal(mat.id)}
                                                    className="px-3 py-1.5 bg-white hover:bg-brand-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 transition-all"
                                                >
                                                    ערוך
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteMaterial(mat.id, e)}
                                                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                                    title="מחק חומר לימוד"
                                                >
                                                    מחק
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredMaterialsList.length === 0 && (
                                    <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                                        <p className="text-slate-400 font-black text-sm">לא נמצאו חומרי לימוד העונים לסינון שבחרת.</p>
                                        <button 
                                            onClick={() => {
                                                setSelectedTopic(null);
                                                setSelectedDifficulty('all');
                                                setSelectedTag(null);
                                                setSearchQuery('');
                                            }}
                                            className="text-xs text-brand-600 font-black hover:underline"
                                        >
                                            איפוס כל המסננים
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                </div>
            ) : (
                /* FULL AI PEDAGOGICAL DESIGN STUDIO WORKSPACE */
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 lg:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                        <div className="flex items-center gap-3">
                            <span className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                <Wand2 className="w-6 h-6 animate-pulse" />
                            </span>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">סטודיו תכנון ויצירת חומרים ב-AI</h3>
                                <p className="text-slate-400 text-xs font-semibold">הפק מערכי שיעור, דפי תרגול, מבחנים ממוקדים או סיכומי הדרכה מותאמים בשניות.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveTab('materials')}
                            className="text-xs font-black text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800"
                        >
                            חזרה למאגר חומרי הלמידה
                            <ArrowRight className="w-3.5 h-3.5 transform rotate-180" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* AI INPUT FORM GENERATOR PANEL (5 columns) */}
                        <div className="lg:col-span-5 bg-slate-50/50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block">מאפייני התוכן המבוקש</span>
                            
                            {/* Subject Domain list */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">תחום דעת / מקצוע:</label>
                                <select
                                    value={aiSubject}
                                    onChange={(e) => setAiSubject(e.target.value)}
                                    className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-white outline-none cursor-pointer focus:border-indigo-400"
                                >
                                    {topics.map(t => (
                                        <option key={t.name} value={t.name}>{t.name}</option>
                                    ))}
                                    <option value="כללי">כללי / רב תחומי</option>
                                </select>
                            </div>

                            {/* Topic title input */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">הנושא הלימודי המדויק:</label>
                                <input
                                    type="text"
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                    placeholder="למשל: תמיסות וריכוזים, פעלים חריגים, בעיות תנועה"
                                    className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-white outline-none focus:border-indigo-400"
                                />
                            </div>

                            {/* Parameter grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">קהל יעד / כיתה:</label>
                                    <select
                                        value={aiGradeLevel}
                                        onChange={(e) => setAiGradeLevel(e.target.value)}
                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-white outline-none"
                                    >
                                        <option value="כיתה ג׳">כיתה ג׳-ד׳</option>
                                        <option value="כיתה ה׳">כיתה ה׳-ו׳</option>
                                        <option value="כיתה ז׳">כיתה ז׳-ח׳</option>
                                        <option value="כיתה ט׳">כיתה ט׳ ויז׳</option>
                                        <option value="תיכון">תיכון (הכנה לבגרות)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">משך שיעור משוער:</label>
                                    <select
                                        value={aiDuration}
                                        onChange={(e) => setAiDuration(e.target.value)}
                                        className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-white outline-none"
                                    >
                                        <option value="45 דקות">45 דקות</option>
                                        <option value="60 דקות">60 דקות</option>
                                        <option value="90 דקות">90 דקות</option>
                                        <option value="סדרת שיעורים">סדרת שיעורים (קורס)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Material output format selection */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">סוג החומר לייצור:</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'lesson', label: 'מערך שיעור', emoji: '📚' },
                                        { id: 'worksheet', label: 'דף תרגול', emoji: '📝' },
                                        { id: 'exam', label: 'מבחן הערכה', emoji: '💯' },
                                        { id: 'summary', label: 'סיכום פדגוגי', emoji: '📖' },
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setAiMaterialType(type.id as any)}
                                            className={cn(
                                                "p-3 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 justify-center",
                                                aiMaterialType === type.id
                                                    ? "bg-indigo-600 text-white border-transparent"
                                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                                            )}
                                        >
                                            <span>{type.emoji}</span>
                                            <span>{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed objectives */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">הנחיות או יעדי למידה מיוחדים (אופציונלי):</label>
                                <textarea
                                    value={aiObjectives}
                                    onChange={(e) => setAiObjectives(e.target.value)}
                                    placeholder="דגש על מעבדה פעילה, שימוש במצגת, תרגילים הדרגתיים, או שילוב פתרונות מהחיים האמיתיים..."
                                    rows={4}
                                    className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 outline-none resize-none focus:border-indigo-400"
                                />
                            </div>

                            {/* Generate button with active loader state */}
                            <button
                                onClick={handleGenerateAIViaStudio}
                                disabled={isAIGenerating || !aiTopic.trim()}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
                            >
                                {isAIGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>מעבד ומייצר מערך תוכן ב-AI...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>חולל חומרי לימוד פדגוגיים ב-AI</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* AI VISUAL LIVE GUIDANCE & ADVISOR RECOMMENDATIONS (7 columns) */}
                        <div className="lg:col-span-7 space-y-4">
                            
                            <div className="bg-gradient-to-l from-indigo-700 to-brand-700 text-white rounded-3xl p-6 relative overflow-hidden shadow-sm">
                                <Sparkles className="w-8 h-8 opacity-40 absolute top-5 left-5" />
                                <h4 className="font-italic text-lg font-black mb-2">כיצד עובד מחולל ה-AI הפדגוגי?</h4>
                                <ul className="space-y-2 text-xs text-indigo-100 leading-relaxed font-semibold">
                                    <li className="flex items-start gap-2">
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded font-black text-[9px] mt-0.5">1</span>
                                        <span><strong>מודל העל Gemini</strong> מתאים את שפת מערך השיעור לרמת הגיל הנכונה ולהקשר החינוכי.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded font-black text-[9px] mt-0.5">2</span>
                                        <span>התוכניות כוללות אוטומטית פתיח קולט קשב (Hook), תרגול עצמי והמלצות למיקוד דירוג כיתתי.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded font-black text-[9px] mt-0.5">3</span>
                                        <span>המערכים נוצרים עם תמיכה מלאה בכתיבת Markdown המאפשרת העתקה מיידית או תוספת למאגר.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl p-8 bg-slate-50/20 dark:bg-slate-900 flex flex-col items-center justify-center text-center space-y-4 min-h-[250px]">
                                <Brain className="w-12 h-12 text-slate-300 animate-pulse" />
                                <h4 className="font-black text-slate-700 dark:text-slate-350 text-base">ממתין לקלט שלך</h4>
                                <p className="text-slate-400 font-medium text-xs max-w-sm">
                                    מלאו את מאפייני המערך בריבוע הימני והקליקו על כפתור המחולל. לאחר מכן, תוכלו לצפות בתוצר הפדגוגי המלא, לערוך אותו, ולשמור אותו ישירות במאגר הכיתה שלכם.
                                </p>
                            </div>

                        </div>

                    </div>
                </div>
            )}

            {/* MATERIAL DETAILS & ADVANCED PEDAGOGY INTERACTIVE MODAL */}
            {selectedMaterial && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6 z-[1001]" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 lg:p-10 shadow-2xl relative">
                        
                        {/* Exit button */}
                        <button 
                            onClick={() => {
                                setSelectedMaterial(null);
                                setGeneratedQuiz(null);
                            }} 
                            className="absolute top-6 left-6 p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-100 dark:border-slate-705"
                        >
                            <X className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                        </button>

                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6 text-right">
                            <div className="p-4 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex-shrink-0">
                                <BookOpen className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                    {selectedMaterial.title}
                                </h3>
                                <div className="flex items-center flex-wrap gap-2 text-xs">
                                    <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-lg font-black">{selectedMaterial.topic}</span>
                                    {selectedMaterial.subtopic && <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg font-black">{selectedMaterial.subtopic}</span>}
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black">{selectedMaterial.gradeLevel || 'כללי'}</span>
                                    <span className="text-slate-400 font-bold">משך השיעור: {selectedMaterial.estimatedTime || '45 דקות'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* RIGHT COLS: MAIN TEXT & QUICK ACTION CONTROLS */}
                            <div className="lg:col-span-7 space-y-4">
                                
                                <div className="p-5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/50 dark:border-slate-850">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300">
                                            <FileText className="w-4 h-4 text-brand-600" />
                                            <span>תוכן מפורט (Markdown)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Copy button */}
                                            <button
                                                onClick={() => handleCopyContent(selectedMaterial.details || '')}
                                                className="p-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md border text-[10px] font-black flex items-center gap-1 text-slate-600 dark:text-slate-300 transition-all"
                                                title="העתק טקסט ללוח"
                                            >
                                                {isCopying ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                                <span>{isCopying ? 'הועתק!' : 'העתקה'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {selectedMaterial.details ? (
                                        <div className="markdown-body text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-xl max-h-96 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 prose prose-slate dark:prose-invert">
                                            <Markdown>{selectedMaterial.details}</Markdown>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 opacity-30">
                                            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                                            <p className="text-xs font-bold italic">לא נכתב תוכן מפורט עבור חומר פדגוגי זה.</p>
                                        </div>
                                    )}
                                </div>

                                {/* GENERATE AI POP QUIZ DRAFT EXPANSION CHANGER */}
                                <div className="bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-5 border border-indigo-100/30 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Wand2 className="w-4.5 h-4.5 text-indigo-600" />
                                            <h4 className="font-italic text-sm font-black text-slate-900 dark:text-slate-100">מחולל בחנים ושאלות הערכה מבוסס AI</h4>
                                        </div>
                                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 px-2 py-0.5 rounded-lg font-bold">חדש</span>
                                    </div>
                                    
                                    <p className="text-slate-500 text-[10px] leading-relaxed font-semibold">
                                        צור באופן מיידי בוחן לתלמידים עם 3 שאלות רב-ברירה (אמריקאיות) לפי התוכן המפורט לעיל. אופטימלי להערכה מעצבת מהירה בסוף השיעור!
                                    </p>

                                    {!generatedQuiz ? (
                                        <button
                                            onClick={() => handleGenerateQuiz(selectedMaterial)}
                                            disabled={isGeneratingQuiz}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                        >
                                            {isGeneratingQuiz ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>מג׳נרט בוחן כיתתי ב-AI...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <span>ג׳נרט 3 שאלות בוחן לשיעור זה</span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="space-y-3 pt-3 border-t border-indigo-100/50">
                                            <div className="text-xs font-semibold leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100/60 max-h-60 overflow-y-auto custom-scrollbar">
                                                <Markdown>{generatedQuiz}</Markdown>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={handleSaveGeneratedQuizToBank}
                                                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    שמור בוחן בבנק
                                                </button>
                                                <button
                                                    onClick={() => setGeneratedQuiz(null)}
                                                    className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-all"
                                                >
                                                    נקה/ביטול
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* LEFT COLS: INTERACTIVE TIMELINE / UNDERSTANDINGS */}
                            <div className="lg:col-span-5 space-y-4">
                                
                                {/* Key pedagogical understandings */}
                                <div className="p-5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-brand-600">
                                        <Lightbulb className="w-4 h-4" />
                                        <span>הבנות מפתח לקליטה (Understandings)</span>
                                    </div>

                                    <div className="space-y-2">
                                        {selectedMaterial.understandings && selectedMaterial.understandings.length > 0 ? (
                                            selectedMaterial.understandings.map((und, idx) => (
                                                <div key={idx} className="flex items-start gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-100/60 dark:border-slate-800 rounded-xl">
                                                    <div className="w-4 h-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                                        ✓
                                                    </div>
                                                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold leading-normal">{und}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[10px] text-slate-400 italic">טרם נוסחו הבנות מפתח עבור חומר זה.</p>
                                        )}
                                    </div>
                                </div>

                                {/* INTERACTIVE DURATION PEDAGOGICAL FLOW TIMELINE CHART */}
                                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
                                            <ListTree className="w-4 h-4 text-brand-600" />
                                            <span>מבנה השיעור והסדר המומלץ</span>
                                        </div>
                                        <span className="text-[9px] bg-slate-50 dark:bg-slate-800 font-bold px-2 py-0.5 rounded-lg text-slate-400">הדרכה</span>
                                    </div>

                                    {/* Default chronological timeline structure based on section logs */}
                                    <div className="space-y-3.5 relative pr-4 text-right border-r border-slate-100 dark:border-slate-800">
                                        {(selectedMaterial.sections || ['פתיחת השיעור', 'הקניית החומר', 'תרגול מעולה', 'סיכום פדגוגי']).map((sect, idx) => {
                                            const stepNum = idx + 1;
                                            const colors = [
                                                'border-indigo-400 text-indigo-600 bg-indigo-50/50',
                                                'border-emerald-400 text-emerald-600 bg-emerald-50/50',
                                                'border-amber-400 text-amber-600 bg-amber-50/50',
                                                'border-purple-400 text-purple-600 bg-purple-50/50'
                                            ][idx % 4];

                                            return (
                                                <div key={idx} className="relative group">
                                                    {/* Outer ring */}
                                                    <span className={cn(
                                                        "absolute -right-[27px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black pointer-events-none bg-white dark:bg-slate-900 shadow-sm",
                                                        colors
                                                    )}>
                                                        {stepNum}
                                                    </span>

                                                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl leading-relaxed text-right">
                                                        <h5 className="font-black text-slate-800 dark:text-slate-100 text-[11px]">{sect}</h5>
                                                        <p className="text-[9px] text-slate-400 font-semibold">משך מומלץ: {idx === 0 ? '10 דק' : idx === 1 ? '20 דק' : idx === 2 ? '10 דק' : '5 דק'}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedMaterial.order && (
                                        <div className="p-3 bg-brand-50/30 border border-brand-100/30 rounded-xl text-right mt-2 text-[10px]">
                                            <p className="font-black text-brand-600 mb-0.5">💡 דגש הזרמה כולל:</p>
                                            <p className="text-slate-550 dark:text-slate-350 font-bold leading-relaxed">{selectedMaterial.order}</p>
                                        </div>
                                    )}
                                </div>

                            </div>

                        </div>

                        {/* Modal footer back list action */}
                        <div className="flex gap-3 justify-end pt-5 border-t border-slate-100 dark:border-slate-800 mt-6">
                            <button
                                onClick={() => openEditModal(selectedMaterial.id)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition-all"
                            >
                                עריכת חומר פדגוגי
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedMaterial(null);
                                    setGeneratedQuiz(null);
                                }}
                                className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl transition-all"
                            >
                                סגירת חלון
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* ADD/EDIT HIGH FIDELITY MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 z-[1001]" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] w-full max-w-4xl space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                {editingMaterialId ? 'עריכת חומרי למידה ומערכים' : 'הוספת חומר פדגוגי חדש'}
                            </h3>
                            <button 
                                onClick={() => setIsAddModalOpen(false)} 
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div> 

                        {/* Modal scrolling context form */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar text-right">
                            
                            {/* Parameters fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">כותרת החומר הלימודי *</label>
                                    <input
                                        type="text"
                                        placeholder="למשל: תמיסות וריכוזים - הדמיית מעבדה"
                                        value={newMaterial.title}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-bold rounded-xl text-slate-800 dark:text-white outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">סוג חומרי הלימוד</label>
                                    <select
                                        value={newMaterial.type}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value as any })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-bold rounded-xl text-slate-700 dark:text-white outline-none cursor-pointer"
                                    >
                                        <option value="lesson">מערך שיעור</option>
                                        <option value="exam">בוחן או מבחן</option>
                                        <option value="worksheet">דף עבודה ותרגול</option>
                                        <option value="question">שאלה או בנק שאלות</option>
                                        <option value="summary">סיכום וידע פדגוגי</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">נושא / מקצוע דעת *</label>
                                    <select
                                        value={newMaterial.topic}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, topic: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-bold rounded-xl text-slate-700 dark:text-white outline-none cursor-pointer"
                                    >
                                        {topics.map(t => (
                                            <option key={t.name} value={t.name}>{t.name}</option>
                                        ))}
                                        <option value="מדעים">מדעים</option>
                                        <option value="כללי">רב תחומי / אחר</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">קהל יעד (כיתה)</label>
                                    <input
                                        type="text"
                                        placeholder="למשל: כיתה ט׳"
                                        value={newMaterial.gradeLevel}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, gradeLevel: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-bold rounded-xl text-slate-800 dark:text-white outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">משך זמן מוערך</label>
                                    <input
                                        type="text"
                                        placeholder="למשל: 45 דקות, 90 דקות"
                                        value={newMaterial.estimatedTime}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, estimatedTime: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-bold rounded-xl text-slate-800 dark:text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">הבנות מפתח פדגוגיות (Understandings)</label>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const promptTerm = prompt('רשמו הבנה פדגוגית לשיעור:');
                                                if (promptTerm) setNewMaterial(prev => ({ ...prev, understandings: [...(prev.understandings || []), promptTerm] }));
                                            }}
                                            className="text-[9px] text-brand-600 hover:underline font-black"
                                        >
                                            + הוספת הבנה
                                        </button>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[80px]">
                                        <div className="flex flex-wrap gap-1.5">
                                            {(newMaterial.understandings || []).map((u, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-slate-100">
                                                    {u}
                                                    <button onClick={() => setNewMaterial(prev => ({ ...prev, understandings: prev.understandings?.filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:text-rose-700">×</button>
                                                </span>
                                            ))}
                                            {(!newMaterial.understandings || newMaterial.understandings.length === 0) && <span className="text-[10px] text-slate-400 italic">לא נוסחו עדיין הבנות לשיעור זה...</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">מבנה וחלקים מומלצים לשיעור</label>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const sectName = prompt('שם הפרק/חלק בשיעור:');
                                                if (sectName) setNewMaterial(prev => ({ ...prev, sections: [...(prev.sections || []), sectName] }));
                                            }}
                                            className="text-[9px] text-brand-600 hover:underline font-black"
                                        >
                                            + הוספת חלק
                                        </button>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[80px]">
                                        <div className="flex flex-wrap gap-1.5">
                                            {(newMaterial.sections || []).map((s, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-slate-100">
                                                    {s}
                                                    <button onClick={() => setNewMaterial(prev => ({ ...prev, sections: prev.sections?.filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:text-rose-700">×</button>
                                                </span>
                                            ))}
                                            {(!newMaterial.sections || newMaterial.sections.length === 0) && <span className="text-[10px] text-slate-400 italic">לא נוספו חלקי מבנה עדיין...</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed content writing */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">תוכן הלימוד המפורט (Markdown מומלץ)</label>
                                    <button
                                        type="button"
                                        onClick={() => analyzeMaterialWithAI(newMaterial.details || '')}
                                        disabled={isAIGenerating || !newMaterial.details?.trim()}
                                        className="px-3 py-1 bg-indigo-550 border border-indigo-200 text-white dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100 text-[10px] font-black rounded-lg transition-all flex items-center gap-1"
                                    >
                                        <Brain className="w-3.5 h-3.5" />
                                        נתח תוכן זה ב-AI וג׳נרט הבנות פדגוגיות
                                    </button>
                                </div>
                                <textarea
                                    value={newMaterial.details}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, details: e.target.value })}
                                    placeholder="כותרות, תכנים, שאלות תרגול, המלצות דיון ופיתוח מהלך..."
                                    rows={8}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-semibold rounded-xl text-slate-800 dark:text-slate-205 outline-none resize-none custom-scrollbar"
                                />
                            </div>

                            {/* Order guideline */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">סדר הזרמה וסגנון פדגוגי מיוחד</label>
                                <input
                                    type="text"
                                    placeholder="למשל: סדר הנדסי הדרגתי, פיתוח עבודה בקבוצות, לריכוז מעוצב..."
                                    value={newMaterial.order}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, order: e.target.value })}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-bold rounded-xl text-slate-800 dark:text-white outline-none"
                                />
                            </div>

                            {/* Tags list split prompt finder */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">תגיות (השתמש בפסיק מפריד)</label>
                                <input
                                    type="text"
                                    placeholder="מתמטיקה, גיאומטריה, יסודי, x-נעלם"
                                    value={(newMaterial.tags || []).join(', ')}
                                    onChange={(e) => {
                                        const splitArray = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                                        setNewMaterial({ ...newMaterial, tags: splitArray });
                                    }}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 text-xs font-bold rounded-xl text-slate-800 dark:text-white outline-none"
                                />
                            </div>

                        </div>

                        {/* Modal buttons actions */}
                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleAddOrEditMaterial}
                                className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {editingMaterialId ? 'שמור שינויים' : 'שמור והוסף למאגר'}
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-2xl font-black text-xs transition-all"
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
