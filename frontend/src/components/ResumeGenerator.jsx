import React from 'react';
import jsPDF from 'jspdf';

const ResumeGenerator = ({ user }) => {
  const generatePDF = () => {
    // Create new A4 PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const marginX = 50;
    let cursorY = 50;

    // Helper: Add text and return new cursor position
    const addText = (text, size, isBold, yOffset) => {
      if (!text) return cursorY;
      doc.setFontSize(size);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(text, marginX, cursorY);
      return cursorY + yOffset;
    };

    // Helper: Parse date for sorting
    const parseDate = (dateStr) => {
      if (!dateStr || dateStr.toLowerCase().trim() === 'present') return Infinity;
      const parsed = Date.parse(dateStr);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper: Check for page break
    const checkPageBreak = (currentY, neededSpace) => {
      if (currentY + neededSpace > doc.internal.pageSize.getHeight() - marginX) {
        doc.addPage();
        return marginX;
      }
      return currentY;
    };

    // Helper: Add section header with background
    const addSectionHeader = (title) => {
      cursorY = checkPageBreak(cursorY, 20);
      cursorY += 15;
      doc.setFillColor(230, 230, 230);
      doc.rect(marginX, cursorY - 12, 545 - marginX, 16, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text(title.toUpperCase(), marginX + 5, cursorY);
      doc.setTextColor(0, 0, 0); // reset
      cursorY += 15;
    };

    // Helper: Draw a wrapping table row
    const drawTableRow = (cols, startX, y) => {
      let maxLines = 1;
      const parsedCols = cols.map(col => {
        const text = String(col.text || '');
        const lines = doc.splitTextToSize(text, col.width);
        if (lines.length > maxLines) maxLines = lines.length;
        return { lines, x: col.x };
      });
      
      parsedCols.forEach(col => {
        doc.text(col.lines, startX + col.x, y);
      });
      
      return maxLines * 15; // Returns the vertical height taken by this row
    };

    // --- TITLE ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUME', 297, cursorY, { align: 'center' });
    cursorY += 30;

    // --- HEADER (Name & Contact) ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(user.name || 'Your Name', marginX, cursorY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let rightY = cursorY - 10;
    
    if (user.email) {
      doc.text(`Email: ${user.email}`, 545, rightY, { align: 'right' });
      rightY += 12;
    }
    if (user.phone) {
      doc.text(`Phone: ${user.phone}`, 545, rightY, { align: 'right' });
      rightY += 12;
    }
    if (user.location) {
      doc.text(`Address: ${user.location}`, 545, rightY, { align: 'right' });
    }
    
    cursorY = Math.max(cursorY + 20, rightY + 10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(marginX, cursorY, 545, cursorY);
    cursorY += 10;

    // --- 1. CAREER OBJECTIVE ---
    addSectionHeader('Career Objective');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const objectiveText = "To secure a challenging position in a reputable organization to expand my learnings, knowledge, and skills. Secure a responsible career opportunity to fully utilize my training and skills, while making a significant contribution to the success of the company.";
    const splitObjective = doc.splitTextToSize(objectiveText, 545 - marginX);
    doc.text(splitObjective, marginX, cursorY);
    cursorY += (splitObjective.length * 12) + 10;

    // --- 2. ACADEMIC QUALIFICATIONS ---
    if (user.education && user.education.length > 0) {
      addSectionHeader('Academic Qualifications');
      
      // Draw a simple table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const headerCols = [
        { text: 'Degree / Course', x: 5, width: 140 },
        { text: 'University / Board', x: 150, width: 170 },
        { text: 'Year of Passing', x: 330, width: 90 },
        { text: 'Percentage / GPA', x: 430, width: 90 }
      ];
      
      let rowHeight = drawTableRow(headerCols, marginX, cursorY);
      doc.line(marginX, cursorY + rowHeight - 10, 545, cursorY + rowHeight - 10);
      cursorY += rowHeight;
      
      doc.setFont('helvetica', 'normal');
      const sortedEducation = [...user.education].sort((a, b) => parseDate(b.endDate) - parseDate(a.endDate));
      
      sortedEducation.forEach(edu => {
        cursorY = checkPageBreak(cursorY, 15);
        const eduCols = [
          { text: edu.degree || 'Degree', x: 5, width: 140 },
          { text: edu.university || 'University', x: 150, width: 170 },
          { text: edu.endDate || 'Present', x: 330, width: 90 },
          { text: edu.gpa ? edu.gpa.toString() : 'N/A', x: 430, width: 90 }
        ];
        let h = drawTableRow(eduCols, marginX, cursorY);
        cursorY += h;
      });
    }

    // --- 3. TECHNICAL SKILLS ---
    if (user.technicalSkills && user.technicalSkills.length > 0) {
      addSectionHeader('Technical Skills');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Technologies:', marginX + 5, cursorY);
      
      doc.setFont('helvetica', 'normal');
      doc.text(user.technicalSkills.join(', '), marginX + 90, cursorY);
      cursorY += 20;
    }

    // --- 4. ACADEMIC PROJECTS ---
    if (user.projects && user.projects.length > 0) {
      addSectionHeader('Academic Projects');
      
      user.projects.forEach(proj => {
        doc.setFont('helvetica', 'bold');
        doc.text(`Project Name: ${proj.name || 'Project'}`, marginX + 5, cursorY);
        cursorY += 15;
        
        doc.setFont('helvetica', 'normal');
        if (proj.technologies) {
          doc.text(`Technologies: ${proj.technologies.join(', ')}`, marginX + 5, cursorY);
          cursorY += 15;
        }
        if (proj.description) {
          doc.text(`Description: ${proj.description.join(' ')}`, marginX + 5, cursorY);
          cursorY += 15;
        }
        cursorY += 5;
      });
    }

    // --- 5. EXPERIENCE (If any) ---
    if (user.experience && user.experience.length > 0) {
      addSectionHeader('Experience');
      
      const sortedExperience = [...user.experience].sort((a, b) => parseDate(b.endDate) - parseDate(a.endDate));
      sortedExperience.forEach(exp => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${exp.title || 'Role'} at ${exp.company || 'Company'}`, marginX + 5, cursorY);
        
        if (exp.startDate || exp.endDate) {
          doc.setFont('helvetica', 'normal');
          doc.text(`${exp.startDate || ''} - ${exp.endDate || 'Present'}`, 545, cursorY, { align: 'right' });
        }
        
        cursorY += 15;
        
        if (exp.description && exp.description.length > 0) {
          doc.setFontSize(10);
          exp.description.forEach(point => {
            if (point.trim()) {
              doc.text(`• ${point.trim()}`, marginX + 15, cursorY);
              cursorY += 12;
            }
          });
        }
        cursorY += 10;
      });
    }

    // --- 6. PERSONAL PROFILE ---
    addSectionHeader('Personal Profile');
    doc.setFont('helvetica', 'bold');
    doc.text('Name', marginX + 5, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${user.name}`, marginX + 100, cursorY);
    cursorY += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('Languages Known', marginX + 5, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: English, Hindi`, marginX + 100, cursorY);
    cursorY += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('Nationality', marginX + 5, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: Indian`, marginX + 100, cursorY);
    cursorY += 25;

    // --- 7. DECLARATION ---
    addSectionHeader('Declaration');
    const declText = "I hereby declare that all the above-mentioned information is true and correct to the best of my knowledge and belief.";
    const splitDecl = doc.splitTextToSize(declText, 545 - marginX);
    doc.setFont('helvetica', 'normal');
    doc.text(splitDecl, marginX + 5, cursorY);
    cursorY += 40;

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', marginX, cursorY);
    doc.text('Signature', 545, cursorY, { align: 'right' });
    cursorY += 15;
    doc.text('Place:', marginX, cursorY);
    doc.text(`(${user.name})`, 545, cursorY, { align: 'right' });

    // Download the generated PDF
    doc.save(`${user.name.replace(/\s+/g, '_')}_Resume.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer border-none flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      Generate Resume PDF
    </button>
  );
};

export default ResumeGenerator;
