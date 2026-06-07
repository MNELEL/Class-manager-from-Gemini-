import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Student } from "../types";

export const exportStudentPDF = (student: Student) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text(`Pedagogical Profile: ${student.name}`, 10, 20);

  doc.setFontSize(12);
  doc.text(`Behavior Notes: ${student.notes || 'None'}`, 10, 40);
  doc.text(`AI Recommendations: ${student.ai_pedagogy_recommendation || 'None'}`, 10, 60);

  const tableData = student.grades?.map(g => [g.subject, g.grade.toString(), g.date]) || [];
  (doc as any).autoTable({
    head: [['Subject', 'Grade', 'Date']],
    body: tableData,
    startY: 80,
  });

  doc.save(`Profile_${student.name}.pdf`);
};
