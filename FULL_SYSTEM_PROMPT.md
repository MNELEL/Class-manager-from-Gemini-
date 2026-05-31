# ClassManager Pro - פרומפט המאסטר ומפרט השחזור המלא 🎓🤖

זהו מסמך ההנחיות המלא והמפורט (Master Prompt) שנוצר על מנת לאפשר שחזור ובנייה עצמאית של מערכת **ClassManager Pro** בכל מודל בינה מלאכותית אחר (כמו Claude, ChatGPT, Cursor, v0 ועוד). המסמך כולל מפרט פונקציונלי מלא, ארכיטקטורה, מבני נתונים, אלגוריתמיקה, חוקים קשוחים לפיתוח ו**מפת אתר/תכונות (Sitemap)** מפורטת וחווייתית.

---

## 📋 פרומפט המאסטר להעתקה ישירה (Master Prompt)

> **העתק והדבק את הטקסט הבא לכל כלי AI כדי לבנות את האפליקציה מאפס:**

```text
You are an expert full-stack developer specializing in modern React 19, TypeScript, Tailwind CSS v4, and Framer Motion (importing from "motion/react").
Your task is to build "ClassManager Pro" - an elite, professional, and pedagogical classroom layout and student placement coordinator. 

Apply a highly polished, aesthetic, and clean design:
- Primary theme: Light mode fallback (soft off-whites, neutral slate, deep charcoal text, sophisticated rich indigo/brand accents).
- High visual contrast, spacious margins (generous negative space), balanced typography using elegant sans-serif, and JetBrains Mono for numbers and metadata.
- Motion animations for modal transitions, smooth dragging, contextual sidebar toggling, and list animations.

Core Modules to Build:
1. Dashboard & Interactive Grid Editor (2D/3D views):
   - A free-form classroom setup editor with "Placement Mode" (drag & drop students to desks, lock seats, view conflicts) and "Structure Mode" (toggle desks active/inactive, change row/column grid size, increase/decrease gaps dynamically).
   - Show table numbering, high-contrast indicators for social requirements, and realtime pedgogical violations tracker.
   - Fully optimized ResizeObserver canvas.

2. Student & Preference Manager:
   - Expandable profiles with full demographics, physical heights (Low, Medium, Tall), seat row preference (Front, Middle, Back), and specific corner requirements.
   - Comprehensive Social Graph Matrix: "Loves/Preferred partner" (green/heart icon ❤️), "Forbids/No contact" (red/ban icon 🚫), and "Distance spacing" (relative isolation ↔️).
   - "Pedagogical & Emotional Notes" field enabling sentiment-based dynamic arrangement logic.

3. Grouping & Sub-groups Engine:
   - Nested hierarchical group setup (groups inside groups) with collapsible trees.
   - Strict group constraints: "Keep group nested together" OR "Enforce separation between members on the map".

4. AI-Powered Smart Placement Solver & Sentiment Parser:
   - An intelligent layout placement engine using Google Gemini (via server-side agent proxy or local spring-force local fallback model).
   - The engine must parse natural language educator comments (Sentiment Analysis) to extract implicit safety/behavior requirements, combine physical parameters (height constraints so tall kids don't block short kids), honor strict social constraints (Loves/Forbids/Distance), and ensure zero violations.

5. Operations & Workspace Exporters:
   - Full Excel (.xlsx) file import/export for rosters and custom subgroup configurations.
   - Elegant JSON backup importer/exporter.
   - PDF exports containing classroom visual schematics and list views.
   - Full local persistence with automatic LocalStorage backup system and reactive visual save indicator.

6. Pedagogical Tools Panel:
   - Seat-by-seat historical timeline dashboard (re-assignment history logs).
   - Welcoming landing interface explaining how pedagogy meets AI on first-load.

Code Quality Requirements:
- Organize code modularly: separate files for types, constants, utilities, sub-components (avoid putting everything only in App.tsx).
- All meaningful interactive buttons, cards, list items must have unique IDs.
- Ensure strict zero-render loops in React hooks.
- Handle missing environment variables gracefully (display nice error notifications if GEMINI_API_KEY is not defined).
```

---

## 🗺️ מפת אתר ותכונות חווייתית (Interactive Sitemap & Feature Map)

כדי להתמצא בקלות באפליקציה ולבנות אותה חלק אחר חלק, להלן מפת הממשק המלאה שמפרטת כל אזור במסך, מהו תפקידו הפיזי וכיצד לגשת אליו:

```
[ מסך ראשי / ClassManager Pro ]
 │
 ├── 🌟 דף נחיתה אינטראקטיבי (Landing Welcome View) - מופיע בכניסה ראשונה או בלחיצה על הלוגו
 │    └── כרטיסי תדרוך קצרים: "כיצד פדגוגיה פוגשת AI"
 │    └── כפתור "דילוג וכניסה מהירה" הפותח את סביבת העבודה הכיתתית
 │
 ├── 📊 סרגל עליון (Top Navigation & Stats Bar) - ראש הכיתה
 │    ├── 🏷️ שם הכיתה הנוכחית ובורר קונפיגורציות (לעבור בין כיתות/סידורים שונים)
 │    ├── 📈 סיכום מדדים מהיר (KPIs):
 │    │    ├── % שביעות רצון פדגוגית חכם (מחושב דינמית על בסיס פתרון אקלוצים)
 │    │    ├── % נוכחות / כמות תלמידים משובצים מתוך סך הכל בכיתה
 │    │    └── מדד פתרון קונפליקטים חברתיים
 │    └── ⚙️ כפתורי פעולה מהירים: הדפסה פדגוגית, ייבוא/ייצוא Excel, שמירה ידנית/חיווי שמירה אוטומטית שבוצעה
 │
 ├── 📐 אזור העבודה הראשי (Main Working Canvas Grid) - מרכז המפה
 │    ├── 🎛️ בורר מצבי עבודה (Mode Selector Tab):
 │    │    ├── 📍 מצב שיבוץ (Placement Mode): גרירת תלמידים, נעילת שולחנות, הצגת מספרי מושבים בלחיצה
 │    │    └── 🛠️ מצב מבנה (Structure Mode): לחיצה להפעלת/השבתת שולחנות (יצירת כיתת U, קבוצות שולחנות, או חצי סהר)
 │    │
 │    ├── 🖥️ בורר מבט (View Mode Toggle):
 │    │    ├── 📐 מבט דו-ממדי (2D Design View) - מדויק, נקי עם שמות ומזהים חברתיים
 │    │    └── 🧊 מבט תלת-ממדי (3D Immersive View) - ייצוג פרספקטיבי של הכיתה עם שולחנות מעוצבים ונפח
 │    │
 │    ├── 🪑 גריד השולחנות הדינמי (The Interactive Grid):
 │    │    ├── לחצן "פינוי שיבוצים" 🗑️ - מוחק את כל שיבוצי התלמידים הנוכחיים מהמפה בקליק יחיד ומחזיר אותם לסרגל הצד (בלעדי למצב Placement).
 │    │    ├── כרטיסי שולחן (Desk Nodes):
 │    │    │    ├── תלמיד משובץ: מציג שם, חיווי מגדר, אייקון מנעול, ומדד התראות
 │    │    │    ├── שולחן ריק: כיתוב "פנוי" או מספר שולחן, מוכן לגרירה או ללחיצה
 │    │    │    └── שולחן מושבת: מראה אזור מסדרון/רווח כהה לחציצה פדגוגית
 │    │    │
 │    │    └── 🕰️ היסטוריית שולחן (Desk History Log):
 │    │         └── לחיצה ארוכה או לחיצה על כפתור שעון בשולחן פותחת חלונית עם רשימת כל התלמידים שישבו בכיסא זה בעבר כולל חותמות זמן מדויקות.
 │    │
 │    └── ✨ בועת הסבר AI (Smart Placement Tooltip):
 │         └── מופיעה אוטומטית בעת הרצת אלגוריתם ה-AI. מסבירה להדיוטות כיצד הגורמים (גובה, חברים, סנטימנט) משתלבים בפתרון הכיתתי.
 │
 ├── 👥 סרגל צד ימין (Dynamic Sidebar) - מסד הנתונים של הכיתה
 │    ├── 🔍 שורת חיפוש וסינון מהיר (מחפש לפי שם, סטטוס שיבוב, או קבוצה)
 │    ├── 🗂️ טאב 1: תלמידים (Students List)
 │    │    ├── רשימת התלמידים שטרם שובצו (גרירה נוחה אל המפה)
 │    │    ├── הדגשת יחסים חכמה (Contextual Highlighting): לחיצה על תלמיד צובעת ומעירה בסביבה שלו את המועדפים 💚, האסורים 🚫 והפרדת המרחקים ↔️.
 │    │    ├── כפתור "הוספת תלמיד חדש"
 │    │    └── כפתור "עריכה" לפרופיל תלמיד (אילוצי גובה, שורות, קבוצות, קשרי חברים, וכתיבת הערות פדגוגיות)
 │    │
 │    ├── 👥 טאב 2: קבוצות (Groups Tree Manager)
 │    │    ├── רשימה היררכית מרובת רמות (קבוצות אב ותתי קבוצות)
 │    │    ├── הגדרת חוק חברתי לקבוצה (למשל: "חייבים לשבת סמוכים במפה" או "חייבים להתפזר")
 │    │    └── הוספה מהירה של תבניות קבוצה מובנות (קבוצות קריאה, מצטיינים, חונכות)
 │    │
 │    └── 🧠 טאב 3: כלי AI וכלים חכמים (AI Dashboard Panel)
 │         ├── 🪄 כפתור "סידור AI חכם מלא" (AI Smart Sort Optimizer) - אלגוריתם משולב לבניית כיתה אידיאלית
 │         ├── 🎲 כפתור "סידור מהיר" - פיזור מהיר של לא משובצים על בסיס מקום פנוי בלבד
 │         ├── ⚠️ רשימת הפרות חוקים וקונפליקטים בזמן אמת (Pedagogical Rule Violations) - רשימה דינמית שמראה חריגות (גבוהים שמסתירים, בעיות של שלילת הושבה חברתית)
 │         └── 📑 אזור ייבוא העדפות מהיר באמצעות קובץ JSON מובנה
 │
 └── 💬 מודאלים דינמיים וחלוניות צפות (Modals & Overlays)
      ├── 💾 ניהול אשף קובצי ייצוא/ייבוא (Excel Manager Dialog)
      ├── 👥 חלון הגדרות תלמיד מתקדם (Advanced Student Configuration)
      └── 🔔 התראות קופצות מסגנון Toast (חיווי שמירה, שגיאות, הצלחת הפעלת AI)
```

---

## 🏗️ ארכיטקטורה, מפת קבצים ומבני נתונים (Tech Spec & Data Structures)

להובלת ההקמה בכל סביבת עבודה, להלן מבני הנתונים הראשיים (TypeScript Interfaces) שיש ליישם:

### 1. ישות תלמיד (Student Interface)
```typescript
export interface Student {
  id: string | number;
  name: string;
  gender: 'male' | 'female' | 'other';
  height: 'low' | 'medium' | 'high';         // מונע הסתרת ראייה
  rowPreference: 'front' | 'middle' | 'back' | 'none'; // העדפת מרחק מהלוח
  cornerPreference: boolean;                  // רוצה לשבת בקצה הטור/שולחן
  isLocked?: boolean;                         // שומר על מיקום מקובע ב-AI
  groupIds?: string[];                        // שיוך קבוצתי
  preferences: {
    loves: (string | number)[];               // חברים מועדפים (💚)
    forbids: (string | number)[];             // תלמידים שאסור שיישבו קרוב (🚫)
    distance: (string | number)[];            // דורש ריחוק מרווח חצי כוח (↔️)
  };
  notes?: string;                             // הערות פדגוגיות (חומר לניתוח סנטימנט)
}
```

### 2. ישות קבוצה (Group Interface)
```typescript
export interface StudentGroup {
  id: string;
  name: string;
  parentGroupId?: string;                     // לתמיכה בתת-קבוצות היררכיות
  constraint: 'together' | 'separate' | 'none';// דרישת מיקום לקבוצה
  color?: string;                             // תג צבע קבוצתי
}
```

### 3. ישות קונפיגורציית סידור (Configuration Settings)
```typescript
export interface ClassroomConfig {
  id: string;
  name: string;
  rows: number;                               // מספר שורות בגריד
  cols: number;                               // מספר עמודות בגריד
  grid: (string | number | null)[];           // מערך באורך (Rows * Cols) המכיל מזהי תלמידים או null
  inactiveSeats: number[];                     // אינדקסים של שולחנות מושבתים במבנה הכיתה
  gaps: {
    columns: number[];                        // רווחים גדולים יותר ליצירת מעברים (Gaps) בין טורים
    rows: number[];                           // רווחים גדולים יותר בין שורות
  };
}
```

### 4. תיעוד רשימת קבצים מומלצת לפרויקט (Standard Project Files Structure)
```text
/
├── package.json               # הגדרת ספריות (כמו @google/genai, xlsx, motion)
├── vite.config.ts             # הגדרות שרת פיתוח ותמיכה ב-TypeScript
├── server.ts                  # שרת Express המנהל את פרוקסי ה-AI ושומר על סודיות מפתח ה-Gemini
├── index.html                 # קובץ ה-HTML הראשי
├── src/
│   ├── main.tsx               # נקודת כניסה
│   ├── index.css              # הגדרת Tailwind CSS v4 וייבוא פונטים פדגוגיים אהובים (Inter, JetBrains Mono)
│   ├── App.tsx                # קומפוננטת המנהל הראשית (לוגיקה וניהול סטייט הוליסטי)
│   ├── types.ts               # הגדרת ממשקי הנתונים המפורטים לעיל
│   └── components/
│       ├── LayoutGrid.tsx     # קומפוננטת תצוגת הכיתה הדו-ממדית והתלת-ממדית (2D/3D)
│       ├── StudentCard.tsx    # כרטיס תלמיד נגרר עם תגים חזותיים
│       ├── StudentSidebar.tsx # ניהול רשימת התלמידים, החיפוש וההוספה
│       ├── GroupsManager.tsx  # סיידבר ניהול הקבוצות ההיררכיות
│       └── AIPanel.tsx        # פאנל אופטימיזציית AI דשבורד, והתראות בזמן אמת מפרקסי סנטימנט
```

---

## 💡 הלוגיקה החכמה של אלגוריתם ה-AI (The Placement Optimizer logic)

במידה והפרומפטים מוזנים למודל מוגבל ללא שרת, הנה אלגוריתם הגיבוי המקומי הפיזיקלי (Force-Directed System Fallback) הבונה סימולציה מהירה:

1. **שלב הכנה**: 
   מזהה מושבים פעילים בלבד (להוריד `inactiveSeats`). ממיין את התלמידים הלא-משובצים. שומר בצד את התלמידים שמוגדרים כ-`isLocked` במיקומם המקורי.
2. **החלת אילוצי גובה וראייה (Height Logic)**:
   - תלמידים המסומנים כ-`height: 'high'` ימצאו עדיפות במבנה בשורות האחוריות של הכיתה.
   - תלמידים המסומנים כ-`height: 'low'` יקבלו עדיפות ראשונית בשורות הקדמיות ביותר כדי למנוע חסימת ראות.
3. **החלת העדפת שורות אישיות (Row Preferences)**:
   מייצר משקולות (Bonus scores) לכל מיקום פוטנציאלי בגריד בהתאם לדרישת ה-`rowPreference` של התלמיד.
4. **מטריצת יחסים חברתיים (Social Optimization Score)**:
   עבור כל תלמיד נבדקים השכנים הישירים (מרחק מבוסס פיתגורס בגריד $\le c$):
   - אם שכן נמצא ברשימת `loves` $\rightarrow$ התלמיד יקבל תוספת ציון משמעותית.
   - אם שכן נמצא ברשימת `forbids` $\rightarrow$ יוטל קנס מרחק מקסימלי (Penalty Score) המעודד פירוד מיידי.
   - אם שכן שייך לקבוצה שנושאת כלל `separate` $\rightarrow$ המנוע פועל להפריד בין התלמידים למרחקים שונים.
5. **ניתוח סנטימנט טקסטואלי (Text Sentiment Analysis)**:
   - בשרת הפומבי: מתבצעת שליחה של ה-`notes` של התלמיד ל-Gemini. המודל מחזיר סקור רגישות מקבלי החלטות, לדוגמה: איבזור רפואי, בעיות קשב ("להושיב קרוב למורה/קיר"), או תסיסה חברתית.
   - השילוב תמיד מרכיב משקל נוסף ב-Score הכללי של השולחן המיועד.

---

## 📦 הכנה להפצה מלאה ושחרור מושלם (Release & Production Readiness)

האפליקציה תואמת באופן מוחלט לדרישות ההעלאה ושימושיות ייצור רשמיים:
- השרת הכללי `server.ts` מוגדר לתמוך במשתנה `PORT` דינמי באופן בטוח ובעל פרוקסי ייעודי API המגונן על מפתחות Gemini.
- מערכי הבדיקה `test-cloud-run.cjs` ופעולות הבנייה עבר בדיקות והתקמפלו בהצלחה רבה ללא שגיאות טיפוסים (Linter passed fully).
- התמיכה ב-PWA מוגדרת כך שלקוחות יוכלו להשתמש באפליקציה בטאבלט או בסמארטפון באופליין מלאה באמצעות ה-Manifest המצורף.

**שתף את הפרומפט הזה עם כל כלי פיתוח של AI, והוא יקים עבורך את המהדורה המובילה בעולם של ClassManager Pro!**
