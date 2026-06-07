import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const exportStudentPDF = (student: any, grades: any[], behaviorNotes: string, aiRecommendations: string) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text(`Pedagogical Profile: ${student.name}`, 10, 20);

  doc.setFontSize(12);
  doc.text(`Behavior Notes: ${behaviorNotes}`, 10, 40);
  doc.text(`AI Recommendations: ${aiRecommendations}`, 10, 60);

  const tableData = grades.map(g => [g.subject, g.grade, g.date]);
  (doc as any).autoTable({
    head: [['Subject', 'Grade', 'Date']],
    body: tableData,
    startY: 80,
  });

  doc.save(`Profile_${student.name}.pdf`);
};
