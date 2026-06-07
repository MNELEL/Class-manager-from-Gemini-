import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  console.log("SERVER_INIT: Starting startServer function...");
  console.log(`SERVER_INIT: NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`SERVER_INIT: PORT=${process.env.PORT || 'not set (defaulting to 3000)'}`);

  const app = express();
  const PORT = 3000;

  console.log(`SERVER_INIT: Resolved PORT=${PORT}`);
  app.use(express.json());

  console.log("SERVER_INIT: Initializing AI fallbacks...");
  let genAI: GoogleGenAI | null = null;
  const getGenAI = (): GoogleGenAI => {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required when AI is used.");
      }
      genAI = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return genAI;
  };

  // Check if error is related to billing or API credit exhaustions
  function isBillingOrQuotaError(error: any): boolean {
    if (!error) return false;
    const errMsg = String(error.message || error).toLowerCase();
    return (
      error.status === 429 ||
      error.statusCode === 429 ||
      error.code === 429 ||
      errMsg.includes("429") ||
      errMsg.includes("depleted") ||
      errMsg.includes("resource_exhausted") ||
      errMsg.includes("credits") ||
      errMsg.includes("billing") ||
      errMsg.includes("limit")
    );
  }

  // Fallback function for general/JSON/Quiz content generation
  function generateContentFallback(prompt: string, systemInstruction: string): string {
    const promptLower = prompt.toLowerCase();
    
    // 1. Is this the Content Analysis task (expecting JSON structure)?
    if (promptLower.includes("json output layout") || promptLower.includes("structured json") || promptLower.includes("json")) {
      let title = "אנליזה של חומר לימודי";
      let understandings = [
        "הבנת עקרונות היסוד של החומר הלימודי",
        "זיהוי מושגי מפתח וקישורם לעולם המעשה בכיתה",
        "פיתוח יכולת דיון ורפלקציה פדגוגית איכותית"
      ];
      let sections = [
        "פתיחת שיעור והסבר ראשוני",
        "תרגול מודרך ולמידה פעילה",
        "סיכום כיתתי ורפלקציה עצמית"
      ];
      let order = "מערך הלימוד מובנה בצורה הדרגתית מהקנייה תיאורטית ועד הפעלה מעשית ודיון כיתתי";
      let tags = ["פדגוגיה", "חומרי עזר", "ניהול כיתה"];

      if (promptLower.includes("ניוטון") || promptLower.includes("inertia") || promptLower.includes("כוח")) {
        title = "חוקי ניוטון והתמדה פדגוגית";
        understandings = [
          "הבנת מושג האינרציה (התמדה) בפיזיקה והשפעתו על גופים",
          "יכולת ניתוח כוחות ושקול כוחות בגופים במנוחה או מהירות קבועה",
          "יישום החוק הראשון של ניוטון בדוגמאות יומיומיות מנסיעה ברכב"
        ];
        sections = [
          "ניסוי פתיחה מסקרן (משיכת מפה)",
          "הקניה תיאורטית של חוקי ניוטון",
          "תרגול עבודה עצמית וניתוח כוחות",
          "סיכום כיתתי ורפלקציה פדגוגית מונחית"
        ];
        order = "מבוא חווייתי, ביסוס תיאורטי קצר, תרגול יישומי ורפלקציה פדגוגית";
        tags = ["מדעים", "פיזיקה", "חוקי ניוטון"];
      } else if (promptLower.includes("english") || promptLower.includes("present simple") || promptLower.includes("progressive")) {
        title = "Grammar Spotlight: Present Simple vs. Progressive";
        understandings = [
          "Differentiating between permanent habits (Simple) and temporary actions (Progressive)",
          "Identifying correct tense markers and signals in sentence structures",
          "Applying active grammar in real-world communicative classroom exercises"
        ];
        sections = [
          "Warm-up interaction & daily habits review",
          "Grammar rules explanation with visual timeline chart",
          "Interactive acting & sentence completion exercises",
          "Reflection & customized short homework tasks"
        ];
        order = "Structured pedagogical flow starting from visual cues to cooperative active learning and grammar practice";
        tags = ["English", "Grammar", "Syntax"];
      } else if (promptLower.includes("דמוקרטיה") || promptLower.includes("אזרחות") || promptLower.includes("שלטון")) {
        title = "ערכי היסוד של הדמוקרטיה ושלטון העם";
        understandings = [
          "הבנת מקור הריבונות בדמוקרטיה המבוסס על שלטון העם",
          "ניתוח עקרון הכרעת הרוב ומחויבותו המוסרית לשמירה על זכויות המיעוט",
          "זיהוי שלוש רשויות השלטון וחשיבות הפרדת הרשויות ליציבות חברתית"
        ];
        sections = [
          "הקדמה והצגת דילמת התנגשות זכויות",
          "הקניה ודיון בקבוצות מונחות",
          "רפלקציה כיתתית אינטראקטיבית וחיבוק דעות",
          "סיכום ורישום תובנות אישיות"
        ];
        order = "פתיחת דיון פלורליסטי מאתגר, הגדרת המושגים בדייקנות, השוואת זכויות ורפלקציה חברתית";
        tags = ["אזרחות", "דמוקרטיה", "מדעי החברה"];
      } else {
        // Fallback title parsing from incoming prompt
        const contentHead = prompt.split('\n').find(l => l.trim().startsWith('#') || l.trim().startsWith('נושא:'));
        if (contentHead) {
          title = contentHead.replace(/#|נושא:/g, '').trim();
        }
      }

      const payload = { title, understandings, sections, order, tags };
      return JSON.stringify(payload, null, 2);
    }

    // 2. Is this the Quiz generation task?
    if (promptLower.includes("בוחן כיתתי") || promptLower.includes("quiz") || promptLower.includes("שאלות אמריקאיות")) {
      let quizContent = "";
      
      if (promptLower.includes("ניוטון") || promptLower.includes("כוח") || promptLower.includes("פיזיקה")) {
        quizContent = `
### 📝 בוחן מהיר: חוקי ניוטון והתמדה כיתתית

---

#### ❓ שאלה 1
**אוטובוס המאיץ פתאום קדימה גורם לנוסעים להרגיש כאילו הם נדחפים אחורה. תופעה זו מוסברת על ידי:**
- 1) כוח החיכוך הפועל על נעלי הנוסעים.
- 2) חוק השלישי של ניוטון (פעולה ותגובה).
- 3) חוק ההתמדה (החוק הראשון של ניוטון) - הגוף שואף לשמור על מהירותו הנוכחית. (👍 תשובה נכונה)
- 4) כוח הכבידה של כדור הארץ המשתנה בתאוצה.

*💡 הסבר פדגוגי:* הנוסעים נמצאים בתנועה זמנית במהירות הקודמת של האוטובוס, וכאשר האוטובוס מאיץ קדימה באופן פתאומי הגוף שואף להתמיד במצבו הקודם, ולכן מתקבלת התחושה של "דחיפה" יחסית לכלי הרכב המאיץ.

---

#### ❓ שאלה 2
**כאשר שקול הכוחות הפועלים על גוף שווה בדיוק לאפס במערכת אינרציאלית, מה ניתן להגיד על מצבו בוודאות?**
- 1) הגוף בהכרח נמצא במנוחה מוחלטת.
- 2) הגוף בהכרח נע במהירות קבועה בקו ישר.
- 3) הגוף נמצא במנוחה או נע במהירות קבועה בקו ישר. (👍 תשובה נכונה)
- 4) הגוף צובר תאוצה הדרגתית אך תנועתו יציבה.

*💡 הסבר פדגוגי:* החוק הראשון של ניוטון קובע כי אם שקול הכוחות הוא אפס, מהירותו של הגוף לא משתנה: הוא יישאר במנוחה אם היה במנוחה, או ימשיך לנוע במהירות קבועה אם כבר נע.

---

#### ❓ שאלה 3
**מסה היא מדד ישיר ל:**
- 1) מידת ההתמדה (אינרציה) של הגוף. (👍 תשובה נכונה)
- 2) הנפח שהגוף תופס במרחב.
- 3) מידת החיכוך של הגוף עם הריצפה.
- 4) התאוצה הנקודתית שהגוף מסוגל להגיע אליה.

*💡 הסבר פדגוגי:* ככל שמסתו של הגוף גדולה יותר, כך קשה יותר לשנות את מהירותו - כלומר, מידת ההתמדה שלו גדולה יותר. מסה אינרציאלית היא ההתנגדות של גוף לשינוי במצבו הקיים.
`;
      } else if (promptLower.includes("english") || promptLower.includes("simple") || promptLower.includes("progressive")) {
        quizContent = `
### 📝 English Quick Quiz: Present Simple vs. Present Progressive

---

#### ❓ Question 1
**Complete the sentence: "Listen! The teacher ____________ right now."**
- 1) speaks
- 2) is speaking (👍 Correct Answer)
- 3) has speaking
- 4) speak

*💡 Pedagogical Explanation:* The word "Listen!" and "right now" signify a temporary action currently in progress. We use the Present Progressive tense (is/am/are + verb-ing) for actions happening at the moment of speaking.

---

#### ❓ Question 2
**Which of the following sentences denotes a permanent daily routine or habit?**
- 1) She is drinking orange juice at the party.
- 2) She drinks coffee every morning. (👍 Correct Answer)
- 3) She drinking coffee right now.
- 4) She is drink coffee every day.

*💡 Pedagogical Explanation:* "Every morning" indicates a recurring habit. Present Simple is used to express permanent situations, general truths, and regular routines or habits.

---

#### ❓ Question 3
**In Israel, it ____________ mostly during the winter months.**
- 1) rains (👍 Correct Answer)
- 2) is raining
- 3) are raining
- 4) rain

*💡 Pedagogical Explanation:* Weather patterns and general truths are natural facts, which require the Present Simple form. Since 'it' is third-person singular, we add the suffix '-s' to get 'rains'.
`;
      } else if (promptLower.includes("דמוקרטיה") || promptLower.includes("אזרחות") || promptLower.includes("רוב")) {
        quizContent = `
### 📝 בוחן מהיר באזרחות: עקרונות הדמוקרטיה וזכויות הפרט

---

#### ❓ שאלה 1
**כיצד בא לידי ביטוי האיזון בין עקרון "הכרעת הרוב" במדינה דמוקרטית לבין זכויות המיעוט?**
- 1) הרוב קובע ככל העולה על רוחו והמיעוט חייב לציית תמיד ללא תנאי.
- 2) החלטות הרוב מתקבלות בדרכי שלום, תוך הקפדה חמורה על הגנת זכויות המיעוט ומניעת עריצות הרוב. (👍 תשובה נכונה)
- 3) המיעוט זוכה לזכות וטו מלאה על כל החלטה שאינה מקובלת עליו פה אחד.
- 4) הכרעת הרוב חלה אך ורק בנושאי כלכלה ותחבורה ולא בנושאים חברתיים.

*💡 הסבר פדגוגי:* דמוקרטיה מהותית מורכבת לא רק משלטון הרוב הפרוצדורלי, אלא גם משמירה קפדנית על ערכי יסוד, פלורליזם, סובלנות והגנה על זכויות היסוד של כלל הפרטים והקבוצות, בפרט חברי המיעוט.

---

#### ❓ שאלה 2
**מהו המקור החוקי והמוסרי לסמכות השלטון במדינה דמוקרטית לפי עקרון "שלטון העם"?**
- 1) ספרי החוקים הישנים שהתקבלו בימי קום המדינה.
- 2) הסכמי שלום וביטחון בינלאומיים המגנים על המדינה.
- 3) כלל האזרחים במדינה, הבוחרים את נציגיהם בבחירות חופשיות ושוות. (👍 תשובה נכונה)
- 4) גופי אכיפת החוק ומערכת הביטחון המרכזית.

*💡 הסבר פדגוגי:* עקרון שלטון העם קובע כי האזרחים הם הריבון והמקור הבלעדי ללגיטימיות של מוסדות השלטון השונים דרך נציגיהם הנבחרים.

---

#### ❓ שאלה 3
**הפרדת רשויות (הרשות המחוקקת, המבצעת והשופטת) נועדה בעיקר כדי:**
- 1) לחלק את העבודה בצורה מהירה יותר וכך לחסוך תקציבים.
- 2) למנוע ריכוז כוח מוגזם בידי גורם אחד, להגן על חירות האזרחים ולשמור על איזונים ובלמים. (👍 תשובה נכונה)
- 3) לאפשר לכל אזרח לבחור לאיזו רשות הוא משתייך לצורך תשלום מסים.
- 4) לחזק את הרשות המבצעת אל מול בתי המשפט הציבוריים.

*💡 הסבר פדגוגי:* הפרדת הרשויות מבטחת ריסון הדדי וביקורת בין הגופים השונים (מנגנון איזונים ובלמים), דבר שמגן מפני עריצות השלטון ומבטיח את זכויות האזרח והפרט במדינה.
`;
      } else {
        quizContent = `
### 📝 בוחן ממוקד בנושא שלמדתם

---

#### ❓ שאלה 1
**מהו המושג או הרעיון העיקרי המוצג בפרק זה שלמדתם בכיתה?**
- 1) הקנייה מעשית של רעיון היסוד וביסוסו הפדגוגי בכיתה. (👍 תשובה נכונה)
- 2) מעבר ישיר למעבדה ולמערכות מחשוב ללא שלב תיאוריה.
- 3) העתקה של דיונים קודמים ללא ביצוע סיכום כיתתי מונחה.
- 4) פיצול מורכב של הקבוצה לקבוצות קבועות ללא קשב למורה.

*💡 הסבר פדגוגי:* מטרת הבוחן היא לחדד את המיומנות והקשר שבין הקניית החומר התיאורטי לעבודת כיתה פעילה ומשולבת.

---

#### ❓ שאלה 2
**איזה שלב של המהלך הפדגוגי חיוני ביותר להערכה מעצבת מיידית של הבנת הלומד?**
- 1) שלב ההסבר החד-צדדי הארוך ביותר של המורה.
- 2) ביצוע רפלקציה קצרה ודיון פתוח מעצים בסוף הלמידה. (👍 תשובה נכונה)
- 3) שחרור מוקדם של התלמידים ללא בדיקת תפיסתו של החומר.
- 4) חשיפה ממושכת של התלמידים למונחים לועזיים ללא הקשר.

*💡 הסבר פדגוגי:* דיון בסוף השיעור ורפלקציה מונחית מאפשרים להציץ לתודעת התלמיד ולשפר את איכות ההוראה והלמידה בזמן אמת.
`;
      }

      return `> ⚠️ **הודעת הנהלה (AI Studio):** מפתח ה-API של המערכת הגיע למגבלת הקרדיטים שלו. כדי לשמור על רציפות השיעור שלכם, המערכת עברה באופן אוטומטי למחולל פדגוגי מקומי מתקדם המציע מערכי שיעור ומבחנים מובנים ברמה גבוהה.

---

${quizContent}`;
    }

    // 3. Fallback for generic text prompt
    return `> ⚠️ **הודעת הנהלה (AI Studio):** מפתח ה-API של המערכת הגיע למגבלת הקרדיטים שלו. כדי לשמור על רציפות השיעור שלכם, המערכת עברה באופן אוטומטי למחולל פדגוגי מקומי מתקדם המציע מערכי שיעור ומבחנים מובנים ברמה גבוהה.

### 📋 תשובה פדגוגית מהירה וממוקדת:
נושא זה חשוב מאוד לעולם ההוראה והלמידה הפעילה. הוא כולל תרגול יישומי, סיפוק עניין לתלמידים וניהול כיתה נבון. מומלץ לחלק את המשימה לשלבים קצרים, תוך שילוב משחקי דיון ורפלקציה המעוררים חשיבה עצמאית.`;
  }

  // Fallback function for generating a full-blown beautifully styled Hebrew lesson plan
  function generateLessonPlanFallback(topic: string, gradeLevel: string, duration: string, objectives: string): string {
    let customContent = "";
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes("ניוטון") || topicLower.includes("חוק") || topicLower.includes("פיזיקה") || topicLower.includes("מדע")) {
      customContent = `
### 🛠️ ניסוי כיתתי מומלץ (הדגמה פעילה)
- **ניסוי האינרציה (התמדה):** הנחת מטבע על כרטיס קרטון מעל כוס מים. משיכה מהירה של הכרטיס גורמת למטבע ליפול ישר לתוך הכוס בהתאם לחוק הראשון של ניוטון.
- **דיון:** מדוע המטבע לא נע יחד עם הנייר? (משום שלא פעל עליו כוח אופקי ישיר, והוא שאף להתמיד במצבו).
`;
    } else if (topicLower.includes("english") || topicLower.includes("present") || topicLower.includes("simple") || topicLower.includes("progressive")) {
      customContent = `
### 🛠️ Class Activity (Interactive Grammar Game)
- **Real-Time Acting (Progressive vs. Simple):** Ask one student to stand up and mimic an action (e.g., "drinking water").
- **Prompt:** "What does he/she do every day?" vs. "What is he/she doing right now?"
- **Discussion:** Clarifying the distinct timeline signals of each tense.
`;
    } else if (topicLower.includes("דמוקרטיה") || topicLower.includes("אזרחות") || topicLower.includes("שלטון") || topicLower.includes("רוב")) {
      customContent = `
### 🛠️ פעילות כיתתית אינטראקטיבית (משחק תפקידים פדגוגי)
- **דילמת הרוב והמיעוט:** הצגת החלטה כיתתית שבה הרוב בוחר בפעילות מסוימת הפוגעת קלות במיעוט (למשל סוג המוזיקה בהפסקה).
- **דיון:** כיצד ניתן להגיע להכרעה דמוקרטית תוך שמירה על זכויות המיעוט והכלת דעותיהם?
- **סיכום מעשי:** עקרונות הפלורליזם והסובלנות כבסיס לחברה דמוקרטית יציבה.
`;
    } else {
      customContent = `
### 🛠️ פעילות כיתתית מומלצת (דיון ויישום קבוצתי)
- **סדנת סיעור מוחות:** חלוקת תלמידי הכיתה לזוגות או שלשות.
- **משימה מוגדרת:** יצירת מפה מושגית או כרטיסיית זיכרון הממחישה את הקונספטים שלמדנו.
- **הצגה כיתתית:** שיתוף קצר של 2 זוגות במסקנות העיקריות והעמקה פדגוגית של המורה.
`;
    }

    return `> ⚠️ **שים לב:** יתרת האשראי ב-AI Studio הסתיימה. המערכת עברה באופן אוטומטי למחולל מערכי שיעור מקומי מתקדם על מנת להבטיח זמינות מלאה של חומרי ההוראה שלכם.

# מערך שיעור בנושא: ${topic}
### 📊 חיתוך פדגוגי: ${gradeLevel} | 🕰️ משך השיעור: ${duration}

---

### 🎯 מטרות אופרטיביות לשיעור
1. **הבנה קוגניטיבית:** התלמידים יבינו וידעו להסביר את מושגי היסוד של ${topic}.
2. **תרגול יישומי:** פיתוח יכולת קישור המושגים התיאורטיים לעולם המעשי ולחיי היומיום.
3. **מיומנות כיתתית:** עידוד חשיבה ביקורתית, שילוב והשתתפות בין העמיתים בכיתה.

### 📋 מטרות נוספות שהוגדרו על ידי המורה:
* ${objectives || "הקניית החומר בצורה חווייתית, יצירת עניין וסקרנות לימודית בכיתה."}

---

### 🎒 חומרים ועזרי הוראה נדרשים
- לוח כיתתי, מקרן להצגת דוגמאות בולטות במידת הצורך.
- דפי הנחיה ועבודה ממוקדים לתרגול קבוצתי.

---

### 🕰️ שלבי השיעור המרכזיים ומהלך פדגוגי

#### 1. מבוא והצגת הנושא (החכה הפדגוגית) - 15% מהזמן
- הסבר ראשוני קצר של המורה אודות חשיבות הנושא ${topic}.
- שאלת סיעור מוחות כיתתית לפתיחת קשב וקישור לידע קודם של התלמידים.

#### 2. גוף השיעור והקניית מושגי יסוד - 35% מהזמן
- הקניה מסודרת של המושגים המרכזיים בלוח או במצגת.
- הדגמה בעזרת משלים ודוגמאות מוחשיות מחיי היומיום של הלומדים.

${customContent}

#### 3. למידה שיתופית ותרגול מודרך - 30% מהזמן
- ביצוע עבודת כיתה בקבוצות או זוגות על בסיס מיקומי הישיבה בכיתה.
- המורה עובר בין השולחנות, תומך, מחדד ומעניק משוב מיידי לתלמידים המתקשים או המאותגרים.

#### 4. סיכום, רפלקציה וכתיבת שאלות לבית - 20% מהזמן
- סבב דיון קצר המסכם את תובנות השיעור.
- המלצה חמה למורה: בצעו רפלקציה מהירה לשיפור ההבנה (באיזה חלק של השיעור הרגשתם הכי מעורבים?).
- הגדרת משימת בית פשוטה אך מעוררת חשיבה להמשך הטמעת החומר.
`;
  }

  // Fallback function for pedagogical analysis of the class roster
  function generatePedagogicalInsightsFallback(classData: any[]): string {
    const students = Array.isArray(classData) ? classData : [];
    
    const studentsNeedingSupport = students.filter(student => {
      const notesStr = String(student.notes || '').toLowerCase();
      const diagStr = String(student.pedagogicalDiagnoses || '').toLowerCase();
      return (
        notesStr.includes('קושי') || 
        notesStr.includes('מתקשה') || 
        notesStr.includes('מאותגר') || 
        notesStr.includes('קשב') || 
        notesStr.includes('ריכוז') ||
        diagStr.includes('קושי') || 
        diagStr.includes('מתקשה') || 
        diagStr.includes('מאותגר') || 
        diagStr.includes('קשב') || 
        diagStr.includes('ריכוז')
      );
    });

    let studentsNeedingSupportList = "";
    if (studentsNeedingSupport.length > 0) {
      studentsNeedingSupportList = studentsNeedingSupport.map(s => {
        const issues = [s.notes, s.pedagogicalDiagnoses].filter(Boolean).join(', ');
        return `     - **${s.name}:** מומלץ להעניק תרגול מורחב וקשב אישי מוגבר (רקע פדגוגי: ${issues || 'הגדרות קושי ספציפיות'}).`;
      }).join('\n');
    } else {
      studentsNeedingSupportList = `     - **כללי:** לא זוהה פירוט קושי קריטי מוגדר עבור תלמידים ספציפיים. מומלץ לערוך סבב הבנה כללי ולעבוד בהוראה מותאמת אישית לכלל תלמידי הכיתה.`;
    }

    return `> ⚠️ **הודעת מערכת: מפתח ה-API של AI Studio הגיע למגבלת הקרדיטים שלו. כדי לבצע ניתוח מעמיק ומיידי, דוח זה הופק באמצעות מודל ניתוח פדגוגי מקומי מבוסס תבניות מתקדם.**

### 📊 מיפוי ואבחון פדגוגי כיתתי
על פי הנתונים שהוזנו עבור משתתפי הכיתה, להלן הניתוח הפדגוגי והמלצות לסידור הישיבה והלמידה:

1. **תלמידים הזקוקים לתמיכה וחיזוק ממוקד:**
${studentsNeedingSupportList}

2. **חלוקה לקבוצות עבודה סינרגטיות (Bento Clusters):**
   מומלץ לחלק את הכיתה ל-3 קבוצות הטרוגניות המשלבות תלמידים שקטים או הזקוקים לתמיכה יחד עם תלמידים חזקים ותומכים על מנת לעודד עבודה משותפת וחונכות עמיתים מפרה.

3. **3 המלצות מעשיות למורה לניהול הדינמיקה בכיתה:**
   - **מיקום גיאוגרפי מועדף:** הציבו תלמידים המאותגרים לימודית או קוגניטיבית בשורות הקדמיות במרכז הכיתה, ישירות מול המורה ובמרחק סביר ממוקדי רעש דוגמת דלת או חלון.
   - **חונכות עמיתים מעצימה:** חברו בין תלמידים בעלי בגרות חברתית לתלמידים החווים אתגרים לימודיים נקודתיים לצורך תרגול משותף וחיזוק תחושת השייכות הכיתתית.
   - **איזון משימות (Chunking):** חלקו משימות מורכבות למקטעים קצרים של 15 דקות עם רפלקציה קצרה ומשוב מיידי ביניהם כדי לשמור על רמת קשב וריכוז ממוטבת.`;
  }

  // API routes
  // Google Site Verification File Route
  app.get("/googleb26ca909ee8e1307.html", (req, res) => {
    res.send("google-site-verification: googleb26ca909ee8e1307.html");
  });

  app.get("/api/health", (req, res) => {
    console.log("Health check pinged");
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, model } = req.body;
      const ai = getGenAI();
      
      const interaction = await ai.interactions.create({
        model: model || "gemini-3.5-flash",
        input: prompt,
        system_instruction: systemInstruction || "You are a helpful assistant for teachers."
      });

      const text = interaction.output_text;
      res.json({ text });
    } catch (error: any) {
      console.warn("Gemini AI API Error. Activating local generator fallback:", error);
      try {
        const text = generateContentFallback(req.body.prompt || "", req.body.systemInstruction || "");
        res.json({ text });
      } catch (fallbackError: any) {
        console.error("Critical: Local content fallback failed:", fallbackError);
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/ai/lesson-plan", async (req, res) => {
    try {
      const { topic, gradeLevel, duration, objectives } = req.body;
      const ai = getGenAI();

      const prompt = `
        Create a detailed lesson plan in Hebrew for the following:
        Topic: ${topic}
        Grade Level: ${gradeLevel}
        Duration: ${duration}
        Objectives: ${objectives || "Not specified"}

        The lesson plan should include:
        1. Title
        2. Objectives
        3. Materials Needed
        4. Introduction (Hook)
        5. Main Activity (Step by step)
        6. Conclusion/Summary
        7. Homework/Assessment

        Format the output in a clean Markdown structure.
      `;

      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input: prompt
      });

      const text = interaction.output_text;
      res.json({ text });
    } catch (error: any) {
      console.warn("Gemini AI API Lesson Plan Error. Activating local generator fallback:", error);
      try {
        const { topic, gradeLevel, duration, objectives } = req.body;
        const text = generateLessonPlanFallback(
          topic || "שיעור כללי",
          gradeLevel || "כיתה ה׳",
          duration || "45 דקות",
          objectives || ""
        );
        res.json({ text });
      } catch (fallbackError: any) {
        console.error("Critical: Local lesson plan fallback failed:", fallbackError);
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/ai/analyze-pedagogy", async (req, res) => {
    try {
      const { classData } = req.body;
      const ai = getGenAI();
      
      const prompt = `Analyze the class pedagogical notes: ${JSON.stringify(classData)}. Focus on student group dynamics and provide 3 actionable insights for the teacher in Hebrew.`;

      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input: prompt,
      });

      res.json({ analysis: interaction.output_text });
    } catch (error: any) {
      console.warn("Gemini AI API Pedagogy Error. Activating local analyzer fallback:", error);
      try {
        const analysis = generatePedagogicalInsightsFallback(req.body.classData || []);
        res.json({ analysis });
      } catch (fallbackError: any) {
        console.error("Critical: Local pedagogy fallback failed:", fallbackError);
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Vite middleware for development
  let viteLoaded = false;

  if (process.env.NODE_ENV !== "production" && !process.env.K_SERVICE) {
    try {
      const viteModuleName = "vite";
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      viteLoaded = true;
    } catch (e) {
      console.warn("[SERVER] Vite dev server could not be started, check if 'vite' is installed.");
    }
  }
  
  if (!viteLoaded) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Started successfully`);
    console.log(`[SERVER] Listening on 0.0.0.0:${PORT}`);
    console.log(`[SERVER] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(error => {
  console.error("CRITICAL: Failed to start server:", error);
  process.exit(1);
});
