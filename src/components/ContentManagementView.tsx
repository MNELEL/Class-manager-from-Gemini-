import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FolderOpen,
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
  FileSpreadsheet,
  Bold,
  Italic,
  Heading,
  Quote,
  List,
  ListOrdered,
  Eye,
  Columns,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Table
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
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
    sections?: string[]; // חלק
    attachments?: { id: string; name: string; type: string; url: string }[];
    status?: 'draft' | 'organized' | 'analyzed';
};

type Topic = {
    name: string;
    subtopics: string[];
    hidden?: boolean;
};

type UploadedFile = {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    date: string;
    topic?: string;
    subtopic?: string;
};

const DEFAULT_MATERIALS: Material[] = [
    { 
        id: '1', 
        title: 'סוגיית אלו מציאות וייאוש שלא מדעת', 
        type: 'lesson', 
        topic: 'גמרא', 
        subtopic: 'בבא מציעא', 
        tags: ['גמרא', 'בבא מציעא', 'שקלא וטריא', 'עמלה של תורה', 'חברותא'], 
        difficulty: 'medium',
        gradeLevel: 'כיתה ז׳',
        estimatedTime: '45 דקות',
        details: `# מערך שיעור: היכרות עם יסודות מסכת בבא מציעא - פרק אלו מציאות\n\n### 🎯 מטרות השיעור\n- התלמידים יבינו את יסוד המחלוקת בין אביי לרבא בעניין ייאוש שלא מדעת.\n- התלמידים ילמדו לנתח את השקלא וטריא של הגמרא ולזהות קושיות ותירוצים.\n- פיתוח אהבת התורה וחדוות הלמידה על ידי פתרון קושיות מורכבות בחברותא.\n\n### 📦 ספרים ועזרים נדרשים\n1. גמרות מסכת בבא מציעא עיון (דף כא:)\n2. לוח כיתתי לתרשים זרימה של סוגיית הגמרא\n\n---\n\n### 🕰️ מהלך השיעור\n\n#### 1. פתיחה ועוררות הלב (10 דקות)\nהרבי מציג מקרה מעשי: אדם מצא מעות מפוזרות ברחוב לפני שהבעלים גילה שנפלו לו. האם זה שייך למוצא או שעליו להכריז? \nנסביר את המושג "ייאוש שלא מדעת" - הגדרת מחלוקת אביי ורבא.\n\n#### 2. הקניה ולימוד פרונטלי (15 דקות)\nקריאת לשון הגמרא בנעימה מסורתית והסבר המילים הקשות על פי פירוש רש"י הקדוש.\n- קושיא ראשונית של אביי והוכחתו מדברי המשנה.\n- ניתוח תירוצו של רבא והסבר סברתו העמוקה.\n\n#### 3. לימוד בחברותות מונחות (15 דקות)\nכל זוג חברותא מקבל דף חזרה עם שאלות הבנה על סברת אביי וסברת רבא. הרבי מסתובב בין השולחנות ומנחה את עמלה של תורה.\n\n#### 4. שנון וסיכום (5 דקות)\nחזרה מהירה בעל פה על השקלא וטריא וסבב רפלקציה פדגוגית שמחה: איזו סברא התלמידים הרגישו שמובנת להם יותר?`, 
        status: 'analyzed', 
        understandings: ['הבנת המושג ייאוש שלא מדעת ומקורו בסברות הראשונים', 'זיהוי מהלכי קושיא ותירוץ בלשון הגמרא', 'עבודה אחראית ושיתוף פעולה פורה בסדר חברותא'], 
        sections: ['עוררות וחידת הפתיחה', 'קריאה והסבר הסוגיא מהרבי', 'עמל התורה בחברותות', 'סיכום ושנון בעל פה'],
        order: 'פרוגרסיבי - פתיחה מסקרנת, קריאה בנעימה, לימוד עצמי בחברותא ושנון קולקטיבי',
        attachments: [
            { id: '1a', name: 'דפי חזרה ומשוב - סוגיית אלו מציאות.pdf', type: 'pdf', url: 'https://example.com/gemara_revision.pdf' }
        ]
    },
    { 
        id: '2', 
        title: 'חומש בראשית - עשרת הניסיונות של אברהם אבינו', 
        type: 'lesson', 
        topic: 'חומש', 
        subtopic: 'חומש בראשית', 
        tags: ['חומש', 'רש"י', 'שבחי האבות', 'יראת שמיים'], 
        difficulty: 'hard',
        gradeLevel: 'כיתה ה׳',
        estimatedTime: '90 דקות',
        details: `# שיעור חומש ורש"י: פרשת וירא - ניסיון עקדת יצחק\n\n### 🎯 מטרות השיעור\n- התלמיד יגדיר ויסביר את המושג "ניסיון" ואמונת האבות העצומה.\n- הבנה שלמילים "קח נא את בנך" יש משמעות עמוקה של חיבה ורצון הבורא.\n- ניתוח פירוש רש"י הקדוש על כל היבטיו פשטניים ומדרשיים.\n\n### 🕰️ שלבי השיעור המרכזיים\n1. **עוררות הרגש והלב (15 דקות)**: שיחה על גודל אמונתו של אברהם אבינו ע"ה.\n2. **הוראה והקראה (30 דקות)**: קריאת הפסוקים וביאור רש"י מילה במילה.`,
        status: 'analyzed',
        understandings: ['הבנת המושג ניסיון ודרכי האמונה של אברהם אבינו ע"ה', 'פענוח ביאורי רש"י הקדוש על הפסוקים ביראת שמיים'],
        sections: ['פתיחה ועוררות הלב', 'הוראה והקראת הפסוקים', 'עבודה עצמית בדפי חזרה', 'שעשועי תורה וסיכום הלכתי'],
        attachments: []
    },
    { 
        id: '4', 
        title: 'לימוד מעשי: קיצור שולחן ערוך והלכות ברכות', 
        type: 'summary', 
        topic: 'הלכה', 
        subtopic: 'משנה ברורה', 
        tags: ['הלכה', 'קיצור שולחן ערוך', 'ברכות', 'הלכה למעשה'], 
        difficulty: 'medium',
        gradeLevel: 'כיתה ז׳',
        estimatedTime: '60 דקות',
        details: `# סיכום הלכתי ממוקד: סדר קדימה בברכות הנהנין\n\n### 🔑 מושגי יסוד הלכתיים\n1. **כלל קדימות הברכות:** כאשר יש לפני האדם כמה סוגי אוכל, עליו לברך קודם החשוב והחביב ביותר (מג"ע א"ש - מזונות, גפן, עץ, אדמה, שהכל).\n2. **שבעת המינים:** פירות שנשתבחה בהם ארץ ישראל קודמים בברכה לשאר פירות העץ.\n3. **ברכת היין והפת:** ברכות החשובות ומיוחדות הקובעות ברכה לעצמן ופוטרות מאכלים אחרים.\n\n### 💬 הצעה לדיון וסימולציה כיתתית חיה\nהמלמד יציב על שולחנו מספר פרטי מתיקה, פירות, מיצי פירות וקרקרים. נזמין בכל פעם תלמיד אחד שיבצע סימולציה ויסביר לחבריו את סדר הברכות הנכון תוך הגיית הברכות ביראת שמיים שלמה.`, 
        status: 'organized',
        understandings: ['ידיעה ברורה של סדרי הברכות וההלכות למעשה', 'קישור ידע ערוך למקרים מעשיים בסעודת שבת או בהפסקת האוכל'],
        sections: ['מפת הלכות קצרה', 'סימולציית שולחן ברכות', 'רישום תובנות ומבחן קצר']
    },
    { 
        id: '5', 
        title: 'מילון מונחי יסוד ושפה בגמרא', 
        type: 'summary', 
        topic: 'ביאורי מילים ומילות מפתח בגמרא', 
        subtopic: 'לשון הגמרא וארמית', 
        tags: ['ארמית', 'מונחי מפתח', 'שפה', 'גמרא'], 
        difficulty: 'easy',
        gradeLevel: 'כיתה ז׳',
        estimatedTime: '45 דקות',
        details: `# ביאורי מילים ומילות מפתח בגמרא\n\n### 🔑 מונחי יסוד נפוצים ופירושם\n1. **תיקו:** תעמוד (תשלם קושיות ואיבעיות) - שאלה שנותרה ללא הכרעה, ותישאר כך עד שיבוא אליהו הנביא להכריע בה.\n2. **קשיא:** קשה - קושיא על שיטה מסוימת שנותרה ללא תירוץ מלא, אך בניגוד לפירכא גמורה אין היא מפריכה לחלוטין את השיטה.\n3. **תניא:** שנינו/שנויה - פתיחה להצגת מקור תנאי (ברייתא).\n4. **מתקיף ליה:** מקיש עליו/מקשה עליו בשאלה הגיונית (סברא).\n5. **מאי קא משמע לן:** מה משמיע לנו? - מה החידוש בדבר זה?\n\n### 📝 תרגיל שנון הלשון\n- השלימו את מילת המפתח המתאימה לכל משפט:\n1. כאשר הגמרא מציגה קושיא מברייתא היא פותחת במילה _________.\n2. שאלה שנותרת בעינה ללא פתרון מסתיימת במילה _________.\n\n---\n\n### 💬 דילוג לקריאה פעילה ושיתופית בחברותא\nהזמינו זוג תלמידים להציג דיון קצר והדגימו בעזרת כרטיסיות מילים כיצד מילת מפתח משנה את כל כיוון הדיון ופניה של הסוגיה הקדושה!`, 
        status: 'draft',
        understandings: ['פענוח מילות קישור בארמית המקדמות את הדיון בגמרא', 'יכולת לזהות הבדל בין קושיא לתירוץ לפי מילות המפתח'],
        sections: ['פתיחה וסקירת שפת הגמרא', 'עבודה עצמית על כרטיסיות מילים', 'שנון משותף ושימוש מדויק'],
        attachments: []
    }
];

const DEFAULT_TOPICS: Topic[] = [
    { name: 'גמרא', subtopics: ['בבא קמא', 'ברכות', 'אלו מציאות', 'פסחים'], hidden: false },
    { name: 'חומש', subtopics: ['חומש בראשית', 'חומש שמות', 'חומש ויקרא', 'פרשת השבוע'], hidden: false },
    { name: 'משנה', subtopics: ['מסכת ברכות', 'מסכת אבות', 'מסכת שבת', 'סדר מועד'], hidden: false },
    { name: 'הלכה', subtopics: ['הלכות שבת', 'הלכות ברכות', 'קיצור שולחן ערוך', 'משנה ברורה'], hidden: false },
    { name: 'ביאורי מילים ומילות מפתח בגמרא', subtopics: ['מילון מונחי יסוד', 'ארמית', 'מילות קישור'], hidden: false },
    { name: 'נביא', subtopics: ['ספר יהושע', 'ספר שופטים', 'ספר שמואל', 'נביאים ראשונים'], hidden: false }
];

export const ContentManagementView = ({ 
    onBack,
    students = [],
    currentConfig = {},
    updateCurrentConfig
}: { 
    onBack: () => void;
    students?: any[];
    currentConfig?: any;
    updateCurrentConfig?: (config: any) => void;
}) => {
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

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => {
        const saved = localStorage.getItem('pedagogy_library_uploaded_files');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return [
            {
                id: '1',
                name: 'מערך שיעור - הלכות ברכות.pdf',
                type: 'application/pdf',
                size: 245,
                url: '#',
                date: new Date().toISOString(),
                topic: 'הלכה'
            },
            {
                id: '2',
                name: 'דוגמאות לברכת הנהנין.xlsx',
                type: 'document',
                size: 110,
                url: '#',
                date: new Date().toISOString(),
                topic: 'הלכה'
            },
            {
                id: '3',
                name: 'משנה ברורה - חלק ג.txt',
                type: 'text/plain',
                size: 45,
                url: '#',
                date: new Date().toISOString(),
                topic: 'הלכה'
            }
        ];
    });

    const [generalDocuments, setGeneralDocuments] = useState<UploadedFile[]>(() => {
        const saved = localStorage.getItem('pedagogy_library_general_documents');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('pedagogy_library_uploaded_files', JSON.stringify(uploadedFiles));
    }, [uploadedFiles]);

    useEffect(() => {
        localStorage.setItem('pedagogy_library_general_documents', JSON.stringify(generalDocuments));
    }, [generalDocuments]);

    const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
    const [customizerTab, setCustomizerTab] = useState<'topics' | 'buttons'>('topics');

    const [customButtonNames, setCustomButtonNames] = useState<Record<string, { label: string, hidden: boolean }>>(() => {
        const saved = localStorage.getItem('pedagogy_custom_buttons');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return {
            materials: { label: 'כל המאגר', hidden: false },
            lessons: { label: 'מערכי שיעור', hidden: false },
            worksheets: { label: 'דפי עבודה', hidden: false },
            exams: { label: 'בחנים ומבחנים', hidden: false },
            questions: { label: 'בנק שאלות', hidden: false },
            summaries: { label: 'סיכומי תוכן', hidden: false },
            files: { label: 'מנהל קבצי עזר', hidden: false },
            ai_studio: { label: 'מחולל פדגוגי AI', hidden: false },
        };
    });

    useEffect(() => {
        localStorage.setItem('pedagogy_custom_buttons', JSON.stringify(customButtonNames));
    }, [customButtonNames]);

    const [activeTab, setActiveTab] = useState<'materials' | 'lessons' | 'exams' | 'worksheets' | 'questions' | 'summaries' | 'ai_studio' | 'files' | 'general_docs'>('materials');
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
        order: '',
        attachments: []
    });

    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isCopying, setIsCopying] = useState<boolean>(false);

    // Rich Text Editor states
    const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('edit');
    const detailsTextareaRef = useRef<HTMLTextAreaElement>(null);

    // NEW STATES: File attachment forms, Drag-and-drop Uploading feedback, Progress, and Assignments mappings
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [uploadingFile, setUploadingFile] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string>('');
    const [newAttachmentName, setNewAttachmentName] = useState<string>('');
    const [newAttachmentType, setNewAttachmentType] = useState<'link' | 'video' | 'pdf' | 'document'>('link');
    const [newAttachmentUrl, setNewAttachmentUrl] = useState<string>('');

    const [assignments, setAssignments] = useState<Record<string, string[]>>(() => {
        const saved = localStorage.getItem('pedagogy_material_assignments');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return {};
    });

    useEffect(() => {
        localStorage.setItem('pedagogy_material_assignments', JSON.stringify(assignments));
    }, [assignments]);

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

    const insertMarkdown = (before: string, after: string = '') => {
        if (!detailsTextareaRef.current) return;
        const textarea = detailsTextareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value || '';
        const selectedText = text.substring(start, end);
        const replacement = before + selectedText + after;
        
        const updatedValue = text.substring(0, start) + replacement + text.substring(end);
        setNewMaterial(prev => ({ ...prev, details: updatedValue }));
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + before.length + selectedText.length + after.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 10);
    };

    const handleInsertTemplate = (templateType: string) => {
        if (!templateType) return;
        let templateText = '';
        if (templateType === 'gemara') {
            templateText = `\n# סוגיית הגמרא: [כתוב שם סוגיה או דף]\n\n### 📜 קריאת המשנה\n> "הקלד כאן לשון המשנה הקדושה..." \n\n### 💬 מהלך השקלא וטריא (גמרא עיון)\n- **הקושיא (מנא הני מילי / מאימתי):** \n- **התירוץ והסורא של המקשה:** \n- **סברת רש"י ותוספות:** \n\n### ⚖️ פסק הלכה למעשה\n- [הלכות התואמות את הסוגיה לפי קיצור שולחן ערוך מונח לפנינו]\n\n### 💡 שינון ועמלה של תורה (דיון חברותא)\n- אלה שאלות לשינוי וחידוד בחברותות:\n1. ...\n2. ...`;
        } else if (templateType === 'chumash') {
            templateText = `\n# שיעור חומש ורש"י: פרשת [שם הפרשה] - [פרק ופסוקים]\n\n### 🎯 מטרת העיון המרכזית\n- הבנת המילים הקדושות והקניית יראת שמיים אמיצה דרך דרכי האבות.\n\n### 📖 מקרא ופירוש רש"י הקדוש\n- **פסוק [כתוב פסוק]:** \n- **ביאור רש"י מילה במילה:** \n- **שאלה העולה בדברי רש"י:** \n\n### 🍎 מוסר השכל והפנמה פדגוגית\n- כיצד כל אחד ואחד מתינוקות של בית רבן זוכה ליישם מידות אלו היום בביתו?`;
        } else if (templateType === 'halacha') {
            templateText = `\n# הלכות מעשיות: הלכות [כתוב נושא, כגון: ברכות / שבת / כיבוד אב ואם]\n\n### 🔑 מושגי יסוד הלכתיים\n1. **דין קדימה:** \n2. **מקרים מעשיים ושאלות הלכה ברחוב:** \n\n### 🎲 שעשועי תורה ומשחקי שנון דפי עבודה\n- שאלה 1 לחזרה:\n- שאלה 2 לחזרה:\n\n### 🏆 קבלות טובות ומידות קודש\n- [החלטה משותפת להלכה ולמעשה לכיתה]`;
        } else if (templateType === 'discussion') {
            templateText = `\n### 💬 שאלה פדגוגית מוסרית לדיון כיתתי מונחה\n> **🤔 דילמה מוסרית:** \n> [תאר כאן סיפור מקרה יומיומי המשלב יצר טוב וכללי דרך ארץ שקדמה לתורה...]\n>\n> **📌 שלבי הדיון בכיתה:**\n> 1. הצגת המקרה על ידי המלמד.\n> 2. שמיעת דברי התלמידים מתוך כבוד הדדי ("יהי כבוד חברך חביב עליך כשלך").\n> 3. סיכום תורני ומידותי של הרבי.`;
        }
        
        if (templateText) {
            insertMarkdown(templateText);
        }
    };

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
            order: '',
            attachments: []
        });
        setEditingMaterialId(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (id: string) => {
        const material = materials.find(m => m.id === id);
        if (material) {
            setNewMaterial({ 
                attachments: [],
                ...material 
            });
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
                status: 'organized',
                attachments: newMaterial.attachments || []
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

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const processFile = (file: File) => {
        setUploadingFile(true);
        setUploadProgress(10);
        setUploadedFileName(file.name);

        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev === null) return 10;
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 20;
            });
        }, 150);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string || '';
            const simulatedText = `[קובץ מידע פדגוגי: ${file.name}]\n\nתקציר חומרי הלימוד שהועלה:\nגודל הקובץ: ${(file.size / 1024).toFixed(1)} KB\nסוג הקובץ: ${file.type || 'טקסט פוענח'}\n\n${text || 'תוכן קוגניטיבי מנותח ומותאם...'}`;
            
            clearInterval(progressInterval);
            setUploadProgress(100);
            
            setTimeout(async () => {
                await analyzeMaterialWithAI(`נוצר מקובץ שהועלה: ${file.name.replace(/\.[^/.]+$/, "")}\n\n${simulatedText}`);
                
                // Save file association
                const newFileObj: UploadedFile = {
                    id: Date.now().toString() + Math.random().toString().substring(2, 6),
                    name: file.name,
                    type: file.type || 'text/plain',
                    size: Math.round(file.size / 1024) || 1,
                    url: '#',
                    date: new Date().toISOString(),
                    topic: selectedTopic || undefined
                };
                setUploadedFiles(prev => [newFileObj, ...prev]);

                setUploadingFile(false);
                setUploadProgress(null);
                setDragActive(false);
                setIsAddModalOpen(true);
            }, 500);
        };
        
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            setTimeout(() => {
                clearInterval(progressInterval);
                setUploadProgress(100);
                setTimeout(async () => {
                    await analyzeMaterialWithAI(`מערך שיעור ומצגת הרצאה בנושא: ${file.name.replace(/\.[^/.]+$/, "")}\n\nהתוכן הופק ופוענח בהצלחה מתוך הקובץ הבינארי "${file.name}" (${(file.size / 1024).toFixed(1)} KB) בעזרת מודלי עיבוד שפה מתקדמים.\nמערך שיעור זה מציע מהלך מקיף, כולל הגדרות יסוד, תרגול מעשי והנחיות דיון פדגוגיות ומקצועיות לכיתה.`);
                    
                    // Save file association
                    const newFileObj: UploadedFile = {
                        id: Date.now().toString() + Math.random().toString().substring(2, 6),
                        name: file.name,
                        type: file.type || 'binary/octet-stream',
                        size: Math.round(file.size / 1024) || 1,
                        url: '#',
                        date: new Date().toISOString(),
                        topic: selectedTopic || undefined
                    };
                    setUploadedFiles(prev => [newFileObj, ...prev]);

                    setUploadingFile(false);
                    setUploadProgress(null);
                    setDragActive(false);
                    setIsAddModalOpen(true);
                }, 500);
            }, 800);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
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

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Workspace Customizer */}
                    <button
                        onClick={() => setIsCustomizerOpen(true)}
                        className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700"
                        title="התאמת שמות כפתורים ומקצועות"
                    >
                        <Sliders className="w-4 h-4 text-slate-500" />
                        התאמת כפתורים ותחומים
                    </button>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                    { id: 'materials', key: 'total', label: customButtonNames.materials?.label || 'כל המאגר', count: statsBreakdown.total, theme: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-800/80' },
                    { id: 'lessons', key: 'lessons', label: customButtonNames.lessons?.label || 'מערכי שיעור', count: statsBreakdown.lessons, theme: 'bg-brand-50/20 dark:bg-brand-950/10 text-brand-600 dark:text-brand-400 border-brand-100/30' },
                    { id: 'exams', key: 'exams', label: customButtonNames.exams?.label || 'בחנים ומבחנים', count: statsBreakdown.exams, theme: 'bg-amber-50/20 dark:bg-amber-950/10 text-amber-600 dark:text-amber-400 border-amber-100/30' },
                    { id: 'worksheets', key: 'worksheets', label: customButtonNames.worksheets?.label || 'דפי עבודה', count: statsBreakdown.worksheets, theme: 'bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border-emerald-100/30' },
                    { id: 'questions', key: 'questions', label: customButtonNames.questions?.label || 'בנק שאלות', count: statsBreakdown.questions, theme: 'bg-sky-50/20 dark:bg-sky-950/10 text-sky-600 dark:text-sky-400 border-sky-100/30' },
                    { id: 'summaries', key: 'summaries', label: customButtonNames.summaries?.label || 'סיכומי תוכן', count: statsBreakdown.summaries, theme: 'bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 border-indigo-100/30' },
                ].filter(card => !customButtonNames[card.id]?.hidden).map(card => (
                    <div key={card.id} className={cn("p-4 border rounded-2xl shadow-sm text-right", card.theme)}>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-80">{card.label}</p>
                        <p className="text-3xl font-black mt-1">{card.count}</p>
                    </div>
                ))}
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
                    { id: 'files', label: 'מנהל קבצי עזר', icon: <FolderOpen className="w-4 h-4 text-indigo-500" /> },
                    { id: 'general_docs', label: 'מסמכים כיתתיים כלליים', icon: <BookMarked className="w-4 h-4 text-emerald-500" /> },
                    { id: 'ai_studio', label: 'מחולל פדגוגי AI', icon: <Wand2 className="w-4 h-4 text-amber-500 animate-pulse" /> },
                ].filter(tab => !customButtonNames[tab.id]?.hidden).map((tab) => (
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
                        <span>{customButtonNames[tab.id]?.label || tab.label}</span>
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

                                {topics.filter(t => !t.hidden).map(topic => {
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
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                                "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2rem] p-5 shadow-lg relative overflow-hidden transition-all duration-300 border-2",
                                dragActive ? "border-dashed border-white scale-105 shadow-2xl" : "border-transparent"
                            )}
                        >
                            <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl transform -translate-x-4 -translate-y-4"></div>
                            
                            {uploadingFile ? (
                                <div className="space-y-3 relative z-10 text-center py-2 animate-pulse">
                                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-250" />
                                    <p className="text-xs font-black">מנתח ומפענח את הקובץ...</p>
                                    <p className="text-[10px] truncate text-indigo-100 font-bold">{uploadedFileName}</p>
                                    <div className="w-full bg-indigo-950 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-emerald-400 h-1.5 transition-all duration-350" 
                                            style={{ width: `${uploadProgress || 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[9px] font-sans font-black text-indigo-200">{uploadProgress || 0}% מתוך 100%</p>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-sm font-black mb-1.5 flex items-center gap-1">
                                        <FileUp className="w-4 h-4" />
                                        ייבוא חומר מהיר ב-AI
                                    </h4>
                                    <p className="text-[10px] text-indigo-100 leading-relaxed font-semibold mb-3">
                                        גררו או בחרו קובץ (טקסט, PDF, Excel, תמונה, Word) מהמחשב, וה-AI יפרק אותו אוטומטית למדורים, הבנות ותגיות מובנות!
                                    </p>
                                    <label className="cursor-pointer block text-center p-2 bg-white/20 hover:bg-white/35 rounded-xl text-xs font-black transition-all">
                                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.json,.pdf,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.doc,.docx" />
                                        בחירת קובץ
                                    </label>
                                    {dragActive && (
                                        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                                            <Upload className="w-8 h-8 animate-bounce text-emerald-400 mb-2" />
                                            <p className="text-xs font-black text-white">שחרר קובץ כאן לייבוא וניתוח מהיר!</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                    </div>

                    {/* MATERIALS LIST GRID (9 Columns) */}
                    <div className="lg:col-span-9 space-y-4">
                            {activeTab === 'files' ? (
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-right" dir="rtl">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div className="space-y-0.5">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                            📁 מחלקת קבצים ועדות למידת תלמידים
                                            {selectedTopic && <span className="text-brand-600">({selectedTopic})</span>}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-bold">נהל את כל הקבצים המשויכים לנושאי הלימוד וכותרות עץ הלמידה.</p>
                                    </div>

                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-black transition-all">
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>העלה קובץ חדש</span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const newFileObj: UploadedFile = {
                                                    id: Date.now().toString(),
                                                    name: file.name,
                                                    type: file.type || 'plain',
                                                    size: Math.round(file.size / 1024) || 1,
                                                    url: '#',
                                                    date: new Date().toISOString(),
                                                    topic: selectedTopic || undefined
                                                };
                                                setUploadedFiles(prev => [newFileObj, ...prev]);
                                            }} 
                                        />
                                    </label>
                                </div>

                                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-350 flex items-center gap-2">
                                    <span>💡</span>
                                    <span>באפשרותך לגרור קבצים לתיבת הייבוא המהיר שבצידו הימני של המסך או להעלות אותם ישירות, ולאחר מכן לשייך אותם למקצוע ספציפי בעץ הלימוד!</span>
                                </div>

                                <div className="space-y-3">
                                    {uploadedFiles
                                        .filter(file => !selectedTopic || file.topic === selectedTopic)
                                        .map(file => {
                                            const isPDF = file.type?.includes('pdf') || file.name.endsWith('.pdf');
                                            const isDoc = file.type?.includes('document') || file.name.endsWith('.docx') || file.name.endsWith('.xlsx');
                                            const isText = file.type?.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md');
                                            
                                            return (
                                                <div 
                                                    key={file.id}
                                                    className="p-4 bg-slate-50/50 hover:bg-brand-50/20 dark:bg-slate-800/40 dark:hover:bg-slate-850/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                        <span className="p-3 bg-white dark:bg-slate-700/80 text-xl rounded-xl shadow-xs border border-slate-100 dark:border-slate-600 flex-shrink-0 flex items-center justify-center">
                                                            {isPDF ? '🔴' : isDoc ? '📊' : isText ? '📝' : '🔗'}
                                                        </span>
                                                        <div className="space-y-1 min-w-0 text-right">
                                                            <h4 className="font-black text-slate-850 dark:text-slate-100 text-sm leading-snug group-hover:text-brand-600 transition-colors truncate text-right">
                                                                {file.name}
                                                            </h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase text-right">
                                                                גודל: {file.size} KB • תאריך: {new Date(file.date).toLocaleDateString('he-IL')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center flex-wrap gap-2 justify-end">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-black text-slate-400">שיוך לעץ הלימוד:</span>
                                                            <select
                                                                value={file.topic || ''}
                                                                onChange={(e) => {
                                                                    const newTopic = e.target.value;
                                                                    setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, topic: newTopic || undefined } : f));
                                                                }}
                                                                className="text-[10px] font-black p-1.5 focus:border-brand-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-white outline-none cursor-pointer text-right"
                                                            >
                                                                <option value="">-- ללא שיוך --</option>
                                                                {topics.filter(t => !t.hidden).map(t => (
                                                                    <option key={t.name} value={t.name}>{t.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`האם אתה בטוח שברצונך למחוק את הקובץ "${file.name}"?`)) {
                                                                    setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                                                                }
                                                            }}
                                                            className="p-1.5 text-rose-400 hover:text-rose-605 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-black text-xs"
                                                            title="מחק קובץ חלוטין"
                                                        >
                                                            מחק
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    {uploadedFiles.filter(file => !selectedTopic || file.topic === selectedTopic).length === 0 && (
                                        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                                            <FolderOpen className="w-8 h-8 text-slate-350 mx-auto" />
                                            <p className="text-slate-400 font-extrabold text-xs">לא הועלו קבצים או שאין קבצים הנתונים לסינון הנוכחי.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'general_docs' ? (
                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-right" dir="rtl">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        📚 מסמכים כיתתיים כלליים
                                    </h3>
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black transition-all">
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>העלה מסמך חדש לכיתה</span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const newDocObj: UploadedFile = {
                                                    id: Date.now().toString(),
                                                    name: file.name,
                                                    type: file.type || 'plain',
                                                    size: Math.round(file.size / 1024) || 1,
                                                    url: '#',
                                                    date: new Date().toISOString(),
                                                };
                                                setGeneralDocuments(prev => [newDocObj, ...prev]);
                                            }} 
                                        />
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    {generalDocuments.map(doc => (
                                        <div key={doc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-emerald-600" />
                                                <span className="font-bold text-sm">{doc.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => setGeneralDocuments(prev => prev.filter(d => d.id !== doc.id))}
                                                className="text-rose-500 font-bold text-xs"
                                            >מחק</button>
                                        </div>
                                    ))}
                                    {generalDocuments.length === 0 && <p className="text-slate-400 text-center text-sm font-bold p-8">טרם הועלו מסמכים כלליים.</p>}
                                </div>
                            </div>
                        ) : (
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
                        )}
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
                                    {topics.filter(t => !t.hidden).map(t => (
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
                                        <div className="markdown-body text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-xl max-h-96 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 prose prose-slate dark:prose-invert text-right font-sans [&_*]:text-right [&_ul]:list-outside [&_ol]:list-outside" dir="rtl" style={{ fontFamily: 'var(--font-sans), sans-serif', direction: 'rtl', textAlign: 'right' }}>
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

                                {/* ATTACHMENTS COLLECTION PANEL */}
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3 text-right">
                                    <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 justify-start uppercase tracking-wider">
                                        <BookMarked className="w-4 h-4 text-indigo-500" />
                                        <span>עזרי שיעור וחומרי מדיה מצורפים ({(selectedMaterial.attachments || []).length})</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedMaterial.attachments && selectedMaterial.attachments.length > 0 ? (
                                            selectedMaterial.attachments.map((att) => (
                                                <a 
                                                    key={att.id || att.name}
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 rounded-xl transition-all flex items-center justify-between text-right group shadow-xs"
                                                >
                                                    <div className="flex items-center gap-2 text-right">
                                                        <span className="text-base">
                                                            {att.type === 'video' ? '📺' : att.type === 'pdf' ? '🔴' : att.type === 'document' ? '📊' : '🔗'}
                                                        </span>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 line-clamp-1">{att.name}</p>
                                                            <p className="text-[8px] text-slate-400 font-bold uppercase">{att.type === 'video' ? 'סרטון וידאו' : att.type === 'pdf' ? 'מסמך PDF' : att.type === 'document' ? 'מצגת / גיליון' : 'קישור אינטרנט'}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[8px] px-2 py-0.5 bg-slate-50 dark:bg-slate-850 text-slate-450 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors font-black uppercase">פתיחה</span>
                                                </a>
                                            ))
                                        ) : (
                                            <div className="col-span-2 py-2 text-center text-slate-400 italic text-[10px]">
                                                לא מחברים קבצי עזר או סרטונים לחומר לימודי זה. ניתן להוסיף אותם בעריכת חומר.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* STUDENT ASSIGNMENT & PEDAGOGICAL MATCHING ROW */}
                                <div className="p-5 bg-gradient-to-l from-brand-50/10 to-transparent dark:from-indigo-950/20 dark:to-transparent rounded-2xl border border-brand-100/30 dark:border-indigo-900/40 space-y-4 text-right">
                                    <div className="flex items-center gap-2 justify-start">
                                        <GraduationCap className="w-5 h-5 text-brand-600 dark:text-indigo-400" />
                                        <div>
                                            <h4 className="text-[11px] font-black text-slate-850 dark:text-slate-100">שיבוץ והתאמה לתלמידי הכיתה (דפרנציאליות)</h4>
                                            <p className="text-[9px] text-slate-400 font-semibold">המלצות AI לשיוך חומרים מותאמים אישית לפי רמה וציונים</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 text-right custom-scrollbar">
                                        {(students && students.length > 0 ? students : [
                                            { id: 'st1', name: 'אורי לוי', grade: 92, behavior: 'excellent' },
                                            { id: 'st2', name: 'רוני כהן', grade: 64, behavior: 'need_attention' },
                                            { id: 'st3', name: 'מאיה דניאל', grade: 87, behavior: 'distracted' },
                                            { id: 'st4', name: 'גלעד שגיא', grade: 58, behavior: 'need_attention' },
                                            { id: 'st5', name: 'נועם אברג׳יל', grade: 98, behavior: 'excellent' },
                                            { id: 'st6', name: 'עדי אפרת', grade: 76, behavior: 'good' }
                                        ]).map((student) => {
                                            const studentGrade = student.grade || student.performanceScore || 80;
                                            const assignedList = assignments[selectedMaterial.id] || [];
                                            const isAssigned = assignedList.includes(student.id);
                                            
                                            // Recommendation logic
                                            let recommendation = "";
                                            let recColor = "";
                                            if (selectedMaterial.difficulty === 'hard') {
                                                if (studentGrade >= 85) {
                                                    recommendation = "לאתגור והעלאת קצב צמיחה";
                                                    recColor = "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400";
                                                }
                                            } else if (selectedMaterial.difficulty === 'easy') {
                                                if (studentGrade <= 75) {
                                                    recommendation = "מומלץ לחיזוק והבנת פערים";
                                                    recColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400";
                                                }
                                            } else { // medium
                                                if (studentGrade >= 75 && studentGrade <= 88) {
                                                    recommendation = "תמיכה שוטפת ברמת הכיתה";
                                                    recColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                                                }
                                            }

                                            return (
                                                <div 
                                                    key={student.id}
                                                    className={cn(
                                                        "p-2.5 bg-white dark:bg-slate-900 border rounded-xl flex flex-col justify-between text-right transition-all text-xs",
                                                        isAssigned 
                                                            ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/10 dark:bg-emerald-950/20 shadow-xs" 
                                                            : "border-slate-100 dark:border-slate-800"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start gap-1">
                                                        <div>
                                                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">{student.name}</span>
                                                            <span className="text-[8px] font-mono text-slate-400 block">ציון שוטף: {studentGrade}</span>
                                                        </div>
                                                        {isAssigned ? (
                                                            <span className="text-[8px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-black">
                                                                משויך
                                                            </span>
                                                        ) : recommendation ? (
                                                            <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black text-center leading-tight shrink-0", recColor)}>
                                                                {recommendation}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAssignments(prev => {
                                                                const currentList = prev[selectedMaterial.id] || [];
                                                                const newList = currentList.includes(student.id)
                                                                    ? currentList.filter(id => id !== student.id)
                                                                    : [...currentList, student.id];
                                                                return {
                                                                    ...prev,
                                                                    [selectedMaterial.id]: newList
                                                                };
                                                            });
                                                        }}
                                                        className={cn(
                                                            "w-full mt-2 py-1 rounded-lg text-[9px] font-black transition-all",
                                                            isAssigned
                                                                ? "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/45 dark:text-rose-400"
                                                                : "bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                                                        )}
                                                    >
                                                        {isAssigned ? "ביטול שיוך פדגוגי" : "שייך לתלמיד"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
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
                                        {topics.filter(t => !t.hidden).map(t => (
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

                            {/* Detailed content writing with Custom Hebrew Rich Text Editor */}
                            <div className="space-y-2 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-sm animate-fade-in">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">עורך תוכן עשיר (Rich Text) תומך עברית</label>
                                        <p className="text-[10px] text-slate-400 font-semibold">ניתן להקליד כחופשי או להשתמש באפשרויות העיצוב המהירות</p>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold self-start">
                                        <button
                                            type="button"
                                            onClick={() => setEditorMode('edit')}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md transition-all flex items-center gap-1",
                                                editorMode === 'edit' 
                                                    ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm" 
                                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                            )}
                                        >
                                            ✏️ עריכה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditorMode('split')}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 hidden md:flex",
                                                editorMode === 'split' 
                                                    ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm" 
                                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                            )}
                                        >
                                            <Columns className="w-3.5 h-3.5" />
                                            <span>מפוצל</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditorMode('preview')}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md transition-all flex items-center gap-1",
                                                editorMode === 'preview' 
                                                    ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm" 
                                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                            )}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>תצוגה מקדימה</span>
                                        </button>
                                    </div>
                                </div>

                                {editorMode !== 'preview' && (
                                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
                                        
                                        {/* Row 1: Basic Text formatting toolbar */}
                                        <div className="flex flex-wrap gap-1 items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded-lg">
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1.5 select-none border-l pl-1.5">בסיסי</span>
                                            
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('**', '**')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-xs text-slate-700 dark:text-slate-300 flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="טקסט מודגש"
                                            >
                                                <Bold className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('*', '*')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-xs text-slate-700 dark:text-slate-300 flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="טקסט נטוי"
                                            >
                                                <Italic className="w-3.5 h-3.5" />
                                            </button>
                                            
                                            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1.5" />

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('# ')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-[9px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="כותרת ראשית א׳"
                                            >
                                                H1
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('## ')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-[9px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="כותרת משנה ב׳"
                                            >
                                                H2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('### ')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-[9px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="כותרת ג׳ קטנה"
                                            >
                                                H3
                                            </button>

                                            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1.5" />

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('> ')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-xs text-slate-700 dark:text-slate-300 flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="ציטוט או מקור חז״ל"
                                            >
                                                <Quote className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('- ')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-xs text-slate-700 dark:text-slate-300 flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="רשימת תבליטים"
                                            >
                                                <List className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('1. ')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-xs text-slate-700 dark:text-slate-300 flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="רשימה ממוספרת"
                                            >
                                                <ListOrdered className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('\n---\n')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-[9px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="קו מפריד אופקי"
                                            >
                                                —
                                            </button>
                                        </div>

                                        {/* Row 2: Torah highlights & custom YESHIVA markup colors */}
                                        <div className="flex flex-wrap gap-1 items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded-lg">
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1.5 select-none border-l pl-1.5">מרקרים פדגוגיים</span>
                                            
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<span class="bg-yellow-105 dark:bg-yellow-950/45 text-yellow-900 dark:text-yellow-101 px-1.5 py-0.5 rounded font-black border-b-2 border-yellow-405">', '</span>')}
                                                className="p-1 px-2 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/25 border border-yellow-200 text-[10px] font-extrabold text-yellow-800 dark:text-yellow-400 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                                title="מרקר צהוב (סברא, דיון)"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                                צהוב סברא
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<span class="bg-emerald-51 dark:bg-emerald-950/45 text-emerald-950 dark:text-emerald-101 px-1.5 py-0.5 rounded font-black border-b-2 border-emerald-405">', '</span>')}
                                                className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/25 border border-emerald-200 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                                title="מרקר ירוק (מקור, פסוק)"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                ירוק מקור
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<span class="bg-sky-51 dark:bg-sky-950/45 text-sky-905 dark:text-sky-101 px-1.5 py-0.5 rounded font-black border-b-2 border-sky-405">', '</span>')}
                                                className="p-1 px-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/25 border border-sky-200 text-[10px] font-extrabold text-sky-800 dark:text-sky-400 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                                title="מרקר כחול (קושיא, חקירה)"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-sky-400" />
                                                כחול קושיא
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<span class="bg-rose-51 dark:bg-rose-950/45 text-rose-955 dark:text-rose-101 px-1.5 py-0.5 rounded font-black border-b-2 border-rose-405">', '</span>')}
                                                className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 border border-rose-200 text-[10px] font-extrabold text-rose-800 dark:text-rose-400 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                                title="מרקר אדום (הלכה פסוקה, תירוץ)"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                                אדום הלכה
                                            </button>

                                            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<span class="font-serif italic text-amber-900 dark:text-amber-300 leading-relaxed font-semibold text-xs bg-amber-50/20 px-1.5 py-0.5 rounded">', '</span>')}
                                                className="p-1 px-2 border border-amber-200 dark:border-amber-900 hover:bg-amber-50 rounded text-[10px] font-bold text-amber-800 dark:text-amber-400 transition-all active:scale-95"
                                                title="גופן כתב רש״י פדגוגי"
                                            >
                                                📜 כתב רש״י
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<span class="text-rose-600 font-extrabold font-serif">[</span>', '<span class="text-rose-600 font-extrabold font-serif">]</span>')}
                                                className="p-1 px-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded text-[10px] font-black text-rose-600 dark:text-rose-400 transition-all active:scale-95"
                                                title="סוגריים מרובעים אדומים"
                                            >
                                                [סוגריים אדומים]
                                            </button>
                                        </div>

                                        {/* Row 3: Alignments & comparisons helper tools */}
                                        <div className="flex flex-wrap gap-1 items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded-lg">
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1.5 select-none border-l pl-1.5">יישור פסקאות ומבנה</span>
                                            
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<div class="text-right" dir="rtl">\n', '\n</div>')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-855 rounded text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="יישור לימין"
                                            >
                                                <AlignRight className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<div class="text-center">\n', '\n</div>')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-855 rounded text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="יישור למרכז"
                                            >
                                                <AlignCenter className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('<div class="text-left" dir="ltr">\n', '\n</div>')}
                                                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-855 rounded text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                                                title="יישור לשמאל"
                                            >
                                                <AlignLeft className="w-3.5 h-3.5" />
                                            </button>

                                            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1.5" />

                                            <button
                                                type="button"
                                                onClick={() => insertMarkdown('\n| ביאור מקצועי / מונח | מקור הגמרא והמדרש | הגדרה פדגוגית לשינון |\n| :--- | :--- | :--- |\n| הקלד מונח... | הקלד מקור... | הקלד הגדרה... |\n')}
                                                className="p-1 px-2 border border-indigo-205 bg-indigo-50/10 hover:bg-indigo-50 dark:border-indigo-900 rounded text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 transition-all active:scale-95 flex items-center gap-1"
                                                title="הוספת טבלת השוואה אקדמית"
                                            >
                                                <Table className="w-3 h-3 text-indigo-600" />
                                                טבלת השוואה פדגוגית
                                            </button>

                                            <div className="flex-1" />

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(newMaterial.details || '');
                                                    alert('תוכן החומר הועתק ללוח בהצלחה!');
                                                }}
                                                className="p-1 px-2 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                                            >
                                                <Copy className="w-3 h-3" />
                                                העתק הכל
                                            </button>
                                        </div>

                                        {/* Row 4: Specialized templates & AI generator assistant dropdowns */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {/* Specialized Talmud-Torah Quick Formatting */}
                                                <button
                                                    type="button"
                                                    onClick={() => insertMarkdown('\n> **💡 דגש פדגוגי למלמד:**\n> ')}
                                                    className="p-1 px-2.5 hover:bg-amber-100 dark:hover:bg-amber-950/65 rounded text-[10px] font-bold text-amber-850 dark:text-amber-400 border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-0.5 transition-all active:scale-95"
                                                    title="הוספת תיבת דגש פדגוגי למלמד"
                                                >
                                                    💡 דגש פדגוגי
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => insertMarkdown('\n> **📜 מקור ותנא:** ')}
                                                    className="p-1 px-2.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/65 rounded text-[10px] font-bold text-emerald-850 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-0.5 transition-all active:scale-95"
                                                    title="הוספת מקור חז״ל"
                                                >
                                                    📜 מקור חז״ל
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => insertMarkdown(' | ')}
                                                    className="p-1 px-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all active:scale-95"
                                                    title="מפריד חציצה לפסוקים"
                                                >
                                                    | חציצה
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {/* Custom Template Dropdown selector */}
                                                <select
                                                    onChange={(e) => {
                                                        handleInsertTemplate(e.target.value);
                                                        e.target.value = ''; // Reset select
                                                    }}
                                                    defaultValue=""
                                                    className="p-1.5 px-3 text-[10px] bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 rounded font-bold cursor-pointer outline-none shadow-sm"
                                                >
                                                    <option value="" disabled>📐 טען מבנה פדגוגי ושיעור מוכן</option>
                                                    <option value="gemara">📚 מערך סוגיית גמרא (עיון)</option>
                                                    <option value="chumash">📖 שיעור חומש ופירוש רש״י</option>
                                                    <option value="halacha">⚖️ הלכה למעשה ושעשועי תורה</option>
                                                    <option value="discussion">🤔 דילמה מוסרית לדיון כיתתי</option>
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={() => analyzeMaterialWithAI(newMaterial.details || '')}
                                                    disabled={isAIGenerating || !newMaterial.details?.trim()}
                                                    className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black flex items-center gap-1 transition-all disabled:opacity-40 select-none shadow-sm cursor-pointer"
                                                    title="ניתוח AI פדגוגי"
                                                >
                                                    <Brain className="w-3 h-3" />
                                                    <span>ניתוח AI</span>
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                <div className={cn(
                                    "grid gap-4",
                                    editorMode === 'split' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                                )}>
                                    {/* Textarea Input Container */}
                                    {editorMode !== 'preview' && (
                                        <div className="relative">
                                            <textarea
                                                ref={detailsTextareaRef}
                                                value={newMaterial.details || ''}
                                                onChange={(e) => setNewMaterial({ ...newMaterial, details: e.target.value })}
                                                placeholder="כאן כותבים את מערך השיעור, המשניות, השאלות או הסיכום הפדגוגי. מומלץ להשתמש בלחצני העיצוב מעל כדי לצבוע, להדגיש ולבנות כותרות מרהיבות לתלמידים..."
                                                rows={editorMode === 'split' ? 12 : 8}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-brand-500 hover:border-slate-200 dark:hover:border-slate-600 outline-none text-xs font-semibold rounded-xl text-slate-800 dark:text-slate-200 resize-none transition-all custom-scrollbar outline-none min-h-[180px] text-right font-sans"
                                                dir="rtl"
                                                style={{ fontFamily: 'var(--font-sans), sans-serif', direction: 'rtl', textAlign: 'right' }}
                                            />
                                            <div className="absolute left-3 bottom-2 text-[9px] text-slate-400 font-mono select-none">
                                                {(newMaterial.details || '').length} תווים
                                            </div>
                                        </div>
                                    )}

                                    {/* Markdown Live Preview Render Panel */}
                                    {editorMode !== 'edit' && (
                                        <div className="flex flex-col border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                                            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">תצוגה מקדימה עשירה (חי לעיני המלמד)</span>
                                            </div>
                                            {newMaterial.details ? (
                                                <div className="markdown-body text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300 p-2 prose prose-slate dark:prose-invert max-w-none text-right font-sans [&_*]:text-right [&_ul]:list-outside [&_ol]:list-outside" dir="rtl" style={{ fontFamily: 'var(--font-sans), sans-serif', direction: 'rtl', textAlign: 'right' }}>
                                                    <Markdown>{newMaterial.details}</Markdown>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-600 select-none">
                                                    <FileText className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                                                    <p className="text-[11px] font-bold italic">הקלד טקסט או בחר תבנית כדי להתחיל בתצוגה החיה...</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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

                            {/* Attachments external resources editor interface */}
                            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">עזרי מדיה וקישורים נלווים (מצגות, וידאו, קבצים חופשיים)</label>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-400 font-bold block">שם הקובץ/הקישור:</span>
                                        <input 
                                            type="text" 
                                            placeholder="למשל: סרטון הסבר יוטיוב" 
                                            value={newAttachmentName}
                                            onChange={(e) => setNewAttachmentName(e.target.value)}
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border-none text-[11px] font-bold rounded-xl text-slate-850 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-400 font-bold block">סוג מדיה:</span>
                                        <select 
                                            value={newAttachmentType}
                                            onChange={(e) => setNewAttachmentType(e.target.value as any)}
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border-none text-[11px] font-bold rounded-xl outline-none cursor-pointer text-slate-705 dark:text-white"
                                        >
                                            <option value="link">קישור כללי</option>
                                            <option value="video">סרטון וידאו</option>
                                            <option value="pdf">קובץ PDF קבוע</option>
                                            <option value="document">מצגת או מסמך WORD</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2 flex items-center gap-2">
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[9px] text-slate-400 font-bold block">כתובת (URL):</span>
                                            <input 
                                                type="text" 
                                                placeholder="https://example.com/file..." 
                                                value={newAttachmentUrl}
                                                onChange={(e) => setNewAttachmentUrl(e.target.value)}
                                                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border-none text-[11px] font-bold rounded-xl text-slate-850 dark:text-white outline-none"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (!newAttachmentName || !newAttachmentUrl) {
                                                    alert('אנא הזן שם וכתובת קישור לפני ההוספה.');
                                                    return;
                                                }
                                                const att = { 
                                                    id: Date.now().toString(), 
                                                    name: newAttachmentName, 
                                                    type: newAttachmentType, 
                                                    url: newAttachmentUrl 
                                                };
                                                setNewMaterial(prev => ({
                                                    ...prev,
                                                    attachments: [...(prev.attachments || []), att]
                                                }));
                                                setNewAttachmentName('');
                                                setNewAttachmentUrl('');
                                            }}
                                            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-150 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-xl transition-all self-end"
                                        >
                                            הוסף
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex flex-wrap gap-2">
                                        {(newMaterial.attachments || []).map((att) => (
                                            <div 
                                                key={att.id} 
                                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2"
                                            >
                                                <span>
                                                    {att.type === 'video' ? '📺' : att.type === 'pdf' ? '🔴' : att.type === 'document' ? '📊' : '🔗'}
                                                </span>
                                                <span>{att.name}</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewMaterial(prev => ({
                                                        ...prev,
                                                        attachments: prev.attachments?.filter(a => a.id !== att.id)
                                                    }))}
                                                    className="text-rose-500 hover:text-rose-700 font-extrabold focus:outline-none"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {(!newMaterial.attachments || newMaterial.attachments.length === 0) && (
                                            <span className="text-[10px] text-slate-400 italic">לא נוספו חומרי עזר ומדיה חיצוניים...</span>
                                        )}
                                    </div>
                                </div>
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

            {/* WORKSPACE CUSTOMIZER MODAL */}
            {isCustomizerOpen && (
                <div id="workspace-customizer-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-705 dark:text-slate-300">
                                    <Sliders className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">ניהול והתאמת מרחב הלמידה</h3>
                                    <p className="text-xs text-slate-400">הגדר, שנה שמות או הסתר תחומי דעת, מקצועות וכפתורים במערכת בהתאם לצורכי הכיתה.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsCustomizerOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Custom Tab Toggles */}
                        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/40 flex gap-2">
                            <button
                                onClick={() => setCustomizerTab('topics')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black transition-all",
                                    customizerTab === 'topics' 
                                        ? "bg-brand-600 text-white" 
                                        : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                )}
                            >
                                תחומי דעת ומקצועות
                            </button>
                            <button
                                onClick={() => setCustomizerTab('buttons')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black transition-all",
                                    customizerTab === 'buttons' 
                                        ? "bg-brand-600 text-white" 
                                        : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                )}
                            >
                                שמות ותצוגת כפתורים
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
                            
                            {customizerTab === 'topics' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">תחומי דעת פעילים</span>
                                            <span className="text-[10px] text-slate-400">התאם את השמות הקיימים, הוסף תתי-נושאים או הסתר תחומים זמנית במערכת.</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const name = prompt('הכנס שם מקצוע/תחום דעת חדש:');
                                                if (name) {
                                                    if (topics.some(t => t.name === name)) {
                                                        alert('מקצוע זה כבר קיים במערכת!');
                                                        return;
                                                    }
                                                    setTopics(prev => [...prev, { name, subtopics: [], hidden: false }]);
                                                }
                                            }}
                                            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            תחום דעת חדש
                                        </button>
                                    </div>

                                    {/* Topics List Card Loop */}
                                    <div className="space-y-3">
                                        {topics.map((topic, topicIdx) => (
                                            <div key={topic.name} className={cn(
                                                "p-4 border rounded-2xl flex flex-col gap-3 transition-colors",
                                                topic.hidden 
                                                    ? "bg-slate-50/50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-850 opacity-60" 
                                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                            )}>
                                                <div className="flex items-center justify-between gap-4">
                                                    
                                                    {/* Editable name & status code */}
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="text"
                                                            value={topic.name}
                                                            onChange={(e) => {
                                                                const newName = e.target.value;
                                                                if (!newName) return;
                                                                setTopics(prev => prev.map((t, idx) => {
                                                                    if (idx === topicIdx) {
                                                                        return { ...t, name: newName };
                                                                    }
                                                                    return t;
                                                                }));
                                                            }}
                                                            className="bg-transparent text-sm font-black text-slate-850 dark:text-white border-b border-transparent focus:border-brand-500 hover:border-slate-300 outline-none px-1 py-0.5 flex-1 max-w-[200px]"
                                                            placeholder="שם מקצוע..."
                                                        />
                                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-md">
                                                            {(topic.subtopics || []).length} תתי-נושאים
                                                        </span>
                                                    </div>

                                                    {/* Hide Toggle and Delete */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setTopics(prev => prev.map((t, idx) => {
                                                                    if (idx === topicIdx) {
                                                                        return { ...t, hidden: !t.hidden };
                                                                    }
                                                                    return t;
                                                                }));
                                                            }}
                                                            className={cn(
                                                                "px-2.5 py-1.5 rounded-xl font-bold text-[10px] transition-all flex items-center gap-1 border",
                                                                topic.hidden
                                                                    ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30"
                                                                    : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30"
                                                            )}
                                                            title={topic.hidden ? "הצג נושא במערכת" : "הסתר נושא במערכת"}
                                                        >
                                                            {topic.hidden ? 'מוסתר מהתצוגה' : 'פעיל במערכת'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`האם אתה בטוח שברצונך למחוק את הנושא "${topic.name}" ותתי-נושאיו?`)) {
                                                                    setTopics(prev => prev.filter((_, idx) => idx !== topicIdx));
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="מחק תחום"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                </div>

                                                {/* Subtopics row */}
                                                <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl space-y-2">
                                                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">תתי-נושאים לימודיים:</span>
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        {(topic.subtopics || []).map((sub, sIdx) => (
                                                            <div key={sIdx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                                                <span>{sub}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        setTopics(prev => prev.map((t, idx) => {
                                                                            if (idx === topicIdx) {
                                                                                return { ...t, subtopics: t.subtopics.filter((_, s) => s !== sIdx) };
                                                                            }
                                                                            return t;
                                                                        }));
                                                                    }}
                                                                    className="text-slate-400 hover:text-rose-500 font-extrabold"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => {
                                                                const newSub = prompt('הכנס שם תת-נושא חדש:');
                                                                if (newSub) {
                                                                    setTopics(prev => prev.map((t, idx) => {
                                                                        if (idx === topicIdx) {
                                                                            return { ...t, subtopics: [...(t.subtopics || []), newSub] };
                                                                        }
                                                                        return t;
                                                                    }));
                                                                }
                                                            }}
                                                            className="text-[9px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 px-2 py-1 rounded-lg border border-dashed border-brand-200 bg-brand-50/20 flex items-center gap-0.5"
                                                        >
                                                            <Plus className="w-2.5 h-2.5" />
                                                            הוסף
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Linked documents list from across all students */}
                                                {(() => {
                                                    const linkedDocs = (students || []).reduce((acc: any[], s: any) => {
                                                        if (s.documents && Array.isArray(s.documents)) {
                                                            s.documents.forEach((doc: any) => {
                                                                if (doc.associatedTopic === topic.name) {
                                                                    acc.push({
                                                                        studentName: s.name,
                                                                        ...doc
                                                                    });
                                                                }
                                                            });
                                                        }
                                                        return acc;
                                                    }, []);

                                                    return (
                                                        <div className="mt-2 bg-indigo-50/25 dark:bg-slate-950/30 p-2.5 rounded-xl border border-indigo-500/10 space-y-1">
                                                            <div className="flex justify-between items-center text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                                                <span>קבצים מקושרים מתוך מחלקת קבצים ({linkedDocs.length}):</span>
                                                            </div>
                                                            {linkedDocs.length > 0 ? (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                                                    {linkedDocs.map((doc, dIdx) => (
                                                                        <div 
                                                                            key={doc.id || dIdx} 
                                                                            className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2 rounded-lg flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300"
                                                                        >
                                                                            <div className="flex items-center gap-1.5 truncate">
                                                                                <span className="text-[11px]">{doc.type?.includes('pdf') ? '🔴' : '🔗'}</span>
                                                                                <div className="truncate text-right">
                                                                                    <span className="block truncate font-black text-slate-700 dark:text-slate-200" title={doc.name}>{doc.name}</span>
                                                                                    <span className="text-[8px] text-slate-400 font-bold block">תלמיד: {doc.studentName}</span>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const link = document.createElement('a');
                                                                                    link.href = doc.data;
                                                                                    link.download = doc.name;
                                                                                    link.click();
                                                                                }}
                                                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-brand-600 select-none cursor-pointer text-xs"
                                                                                title="הורדת קובץ"
                                                                            >
                                                                                📥
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic">לא קושרו קבצים עדיין לנושא זה ממחלקת קבצים...</span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {customizerTab === 'buttons' && (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">עריכת שמות כפתורים וכרטיסיות תצוגה</span>
                                        <span className="text-[10px] text-slate-400">שנה את השמות המופיעים בכפתורי הניווט הראשיים ובסטטיסטיקות של ספריית הידע או הסתר אותם.</span>
                                    </div>

                                    <div className="space-y-2">
                                        {[
                                            { id: 'materials', defaultLabel: 'כל המאגר' },
                                            { id: 'lessons', defaultLabel: 'מערכי שיעור' },
                                            { id: 'worksheets', defaultLabel: 'דפי עבודה' },
                                            { id: 'exams', defaultLabel: 'בחנים ומבחנים' },
                                            { id: 'questions', defaultLabel: 'בנק שאלות' },
                                            { id: 'summaries', defaultLabel: 'סיכומי תוכן' },
                                            { id: 'ai_studio', defaultLabel: 'מחולל פדגוגי AI' },
                                        ].map((item) => {
                                            const custom = customButtonNames[item.id] || { label: item.defaultLabel, hidden: false };
                                            return (
                                                <div key={item.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">מפתח כפתור: {item.id} (ברירת מחדל: "{item.defaultLabel}")</span>
                                                        <input
                                                            type="text"
                                                            value={custom.label}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setCustomButtonNames(prev => ({
                                                                    ...prev,
                                                                    [item.id]: { ...custom, label: val }
                                                                }));
                                                            }}
                                                            className="w-full text-xs font-black text-slate-800 dark:text-white p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none"
                                                            placeholder="ערוך שם כפתור..."
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end md:self-center">
                                                        <button
                                                            onClick={() => {
                                                                setCustomButtonNames(prev => ({
                                                                    ...prev,
                                                                    [item.id]: { ...custom, hidden: !custom.hidden }
                                                                }));
                                                            }}
                                                            className={cn(
                                                                "px-3 py-2 rounded-xl text-[10px] font-black transition-all border",
                                                                custom.hidden
                                                                    ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30"
                                                                    : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30"
                                                            )}
                                                        >
                                                            {custom.hidden ? 'כפתור מוסתר' : 'כפתור פעיל'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer actions */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    if (confirm('האם אתה בטוח שברצונך לאפס הכל להגדרות ברירת המחדל המקוריות?')) {
                                        setTopics(DEFAULT_TOPICS);
                                        setCustomButtonNames({
                                            materials: { label: 'כל המאגר', hidden: false },
                                            lessons: { label: 'מערכי שיעור', hidden: false },
                                            worksheets: { label: 'דפי עבודה', hidden: false },
                                            exams: { label: 'בחנים ומבחנים', hidden: false },
                                            questions: { label: 'בנק שאלות', hidden: false },
                                            summaries: { label: 'סיכומי תוכן', hidden: false },
                                            ai_studio: { label: 'מחולל פדגוגי AI', hidden: false },
                                        });
                                    }
                                }}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[10px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                איפוס לברירת מחדל
                            </button>
                            <button
                                onClick={() => setIsCustomizerOpen(false)}
                                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-black text-xs rounded-xl shadow-md transition-colors"
                            >
                                שמירה וסגירה
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};
