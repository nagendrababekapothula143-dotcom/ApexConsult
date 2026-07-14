import React, { useState, useEffect, useContext } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { jsPDF } from 'jspdf';

const StudentJobs = () => {
  const { user } = useContext(AuthContext);
  const {
    jobs,
    applications,
    selectedJob,
    setSelectedJob,
    resumeFile,
    setResumeFile,
    uploading,
    handleApply,
    actionError,
    actionSuccess,
    setActionError,
    setActionSuccess,
    getStatusBadgeClass,
    getResumeDownloadUrl,
    setApplications,
    handleRequestAssistance
  } = useOutletContext();

  const [searchQuery, setSearchQuery] = useState('');
  const { jobId } = useParams();
  const navigate = useNavigate();

  // AI Tailoring States
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [tailorStep, setTailorStep] = useState('initial');
  const [processingStatus, setProcessingStatus] = useState('');
  const [tailoredText, setTailoredText] = useState('');
  const [tailorResult, setTailorResult] = useState(null);

  // External Apply Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState('question'); // 'question' | 'upload'
  const [confirmUploading, setConfirmUploading] = useState(false);
  const [confirmFile, setConfirmFile] = useState(null);
  const [externallyAppliedState, setExternallyAppliedState] = useState(false);

  useEffect(() => {
    document.title = selectedJob
      ? `${selectedJob.title} - ${selectedJob.company} | Student Console`
      : 'Job Board | Student Console';
  }, [selectedJob]);

  useEffect(() => {
    if (jobs.length > 0) {
      if (!jobId) {
        // We are on the master list view, clear selection
        setSelectedJob(null);
      } else {
        // We are on a detail view, find and set the job
        const found = jobs.find((j) => j._id === jobId);
        setSelectedJob(found || null);
      }
    }
  }, [jobId, jobs, setSelectedJob]);

  const getApplicationForJob = (jobIdToCheck) => {
    return applications.find((app) => app.job?._id === jobIdToCheck);
  };

  const handleTailorStart = async () => {
    if (!resumeFile) {
      setActionError('Please choose a file to upload first, then click Tailor Resume to optimize it!');
      setTimeout(() => setActionError(''), 4000);
      return;
    }
    
    setShowTailorModal(true);
    setTailorStep('processing');
    
    const statuses = [
      'Scanning uploaded resume profile...',
      `Analyzing ${selectedJob.company} requirements...`,
      'Mapping relevant keyword densities for case prep...',
      'Optimizing experience bullet points with action verbs...',
      'Injecting JD requirements into experiences...',
      'Structuring tailored text document...'
    ];
    
    let currentIdx = 0;
    setProcessingStatus(statuses[0]);
    
    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < statuses.length) {
        setProcessingStatus(statuses[currentIdx]);
      }
    }, 450);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('jobId', selectedJob._id);

      const res = await api.post('/applications/tailor', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(interval);
      const resultData = res.data.data;
      setTailorResult(resultData);
      setTailoredText(resultData.tailoredText);
      
      // Immediately generate PDF and preview URL
      const url = generatePdfBlobUrl(resultData);
      setPreviewPdfUrl(url);
      
      setTailorStep('completed');
    } catch (err) {
      clearInterval(interval);
      console.error('Tailoring error:', err);
      setActionError(err.response?.data?.message || 'Failed to parse and tailor resume.');
      setShowTailorModal(false);
      setTimeout(() => setActionError(''), 5000);
    }
  };

  const [previewPdfUrl, setPreviewPdfUrl] = useState('');

  const generatePdfBlobUrl = (data) => {
    if (!data) return null;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    const margin = 40; // tighter margins
    let y = 40;

    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > 750) {
        doc.addPage();
        y = margin;
      }
    };

    // Draw Job Description Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('JOB DESCRIPTION', 306, y, { align: 'center' });
    y += 18;

    doc.setFontSize(11);
    doc.text(`${data.jobCompany || 'Company'} - ${data.jobTitle || 'Role'}`, 306, y, { align: 'center' });
    y += 14;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    
    if (data.jobDescription) {
      const descLines = doc.splitTextToSize(data.jobDescription, 612 - margin * 2);
      checkPageBreak(descLines.length * 11 + 6);
      doc.text(descLines, margin, y);
      y += descLines.length * 11 + 10;
    }

    // Force a page break so the resume starts on a fresh page
    doc.addPage();
    y = margin;

    // Draw Candidate Name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text((data.studentName || '').toUpperCase(), 306, y, { align: 'center' });
    y += 16;

    // Draw Subtitle / Target Role
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text((data.jobTitle || '').toUpperCase() + ' OPTIMIZED PROFILE', 306, y, { align: 'center' });
    y += 12;

    // Contact info
    doc.setFontSize(8.5);
    const phoneStr = data.studentPhone || '+123-456-7890';
    const locationStr = data.studentLocation || 'Dallas, TX';
    const emailStr = data.studentEmail || '';
    doc.text(`${phoneStr}   |   ${emailStr}   |   ${locationStr}`, 306, y, { align: 'center' });
    y += 10;

    // Horizontal divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, y, 612 - margin, y);
    y += 14;

    const ai = data.aiData || {};

    // Professional Summary
    if (ai.professionalSummary && ai.professionalSummary.length > 0) {
      checkPageBreak(20);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('PROFESSIONAL SUMMARY:', margin, y);
      y += 12;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      ai.professionalSummary.forEach(bullet => {
        const text = `• ${bullet.replace(/^•\s*/, '')}`;
        const lines = doc.splitTextToSize(text, 612 - margin * 2 - 10);
        checkPageBreak(lines.length * 11 + 3);
        doc.text(lines, margin + 10, y);
        y += lines.length * 11 + 3;
      });
      y += 6;
    }

    // Technical Skills
    if (ai.technicalSkills && ai.technicalSkills.length > 0) {
      checkPageBreak(20);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('TECHNICAL SKILLS:', margin, y);
      y += 12;

      ai.technicalSkills.forEach(cat => {
        checkPageBreak(15);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(`• ${cat.category} - `, margin + 10, y);
        
        const catWidth = doc.getTextWidth(`• ${cat.category} - `);
        doc.setFont('Helvetica', 'normal');
        
        const lines = doc.splitTextToSize(cat.skills, 612 - margin * 2 - 10 - catWidth);
        checkPageBreak(lines.length * 11);
        doc.text(lines, margin + 10 + catWidth, y);
        y += lines.length * 11 + 2;
      });
      y += 6;
    }

    // Professional Experience
    if (ai.professionalExperience && ai.professionalExperience.length > 0) {
      checkPageBreak(20);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('PROFESSIONAL EXPERIENCE:', margin, y);
      y += 12;

      ai.professionalExperience.forEach(exp => {
        checkPageBreak(25);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(exp.company, margin, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(exp.dates, 612 - margin, y, { align: 'right' });
        y += 12;
        
        doc.setFont('Helvetica', 'bold');
        doc.text(exp.role, margin, y);
        y += 12;

        if (exp.responsibilities && exp.responsibilities.length > 0) {
          doc.text('Responsibilities:', margin, y);
          y += 11;
          
          doc.setFont('Helvetica', 'normal');
          exp.responsibilities.forEach(bullet => {
            const text = `• ${bullet.replace(/^•\s*/, '')}`;
            const lines = doc.splitTextToSize(text, 612 - margin * 2 - 10);
            checkPageBreak(lines.length * 11 + 3);
            doc.text(lines, margin + 10, y);
            y += lines.length * 11 + 3;
          });
        }
        y += 6;
      });
    }

    // Certifications
    if (ai.certifications && ai.certifications.length > 0) {
      checkPageBreak(20);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Certifications:', margin, y);
      y += 12;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      ai.certifications.forEach(cert => {
        const text = `• ${cert.replace(/^•\s*/, '')}`;
        const lines = doc.splitTextToSize(text, 612 - margin * 2 - 10);
        checkPageBreak(lines.length * 11 + 3);
        doc.text(lines, margin + 10, y);
        y += lines.length * 11 + 3;
      });
      y += 6;
    }

    // Educational Details
    if (ai.educationalDetails && ai.educationalDetails.length > 0) {
      checkPageBreak(20);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Educational Details:', margin, y);
      y += 12;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      ai.educationalDetails.forEach(edu => {
        const text = edu;
        const lines = doc.splitTextToSize(text, 612 - margin * 2);
        checkPageBreak(lines.length * 11 + 3);
        doc.text(lines, margin, y);
        y += lines.length * 11 + 3;
      });
      y += 14;
    }

    // Interview Prep
    if (ai.interviewPrep && ai.interviewPrep.length > 0) {
      checkPageBreak(20 + ai.interviewPrep.length * 13);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Please prepare responses for the questions listed below', margin, y);
      y += 14;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229); // Accent color for questions
      ai.interviewPrep.forEach(q => {
        const text = q.startsWith('•') ? q : `• ${q}`;
        const lines = doc.splitTextToSize(text, 612 - margin * 2 - 10);
        doc.text(lines, margin + 10, y);
        y += lines.length * 11 + 3;
      });
    }

    const pdfOutputBlob = doc.output('blob');
    return URL.createObjectURL(pdfOutputBlob);
  };

  const handleDownloadAndUse = async () => {
    if (!previewPdfUrl) return;

    const response = await fetch(previewPdfUrl);
    const pdfOutputBlob = await response.blob();
    const fileName = `${(tailorResult.studentName || 'Student').replace(/\s+/g, '_')}_Tailored_Resume_${tailorResult.jobCompany.replace(/\s+/g, '_')}.pdf`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = previewPdfUrl;
    link.download = fileName;
    link.click();

    // Create File object to bind to state
    const file = new File([pdfOutputBlob], fileName, { type: 'application/pdf' });
    setConfirmFile(file);
    setResumeFile(file);

    setShowTailorModal(false);
    setActionSuccess('Tailored PDF resume generated and attached successfully! Click "Submit Application" to complete.');
    setTimeout(() => setActionSuccess(''), 5500);
  };

  const handleConfirmYes = () => {
    setExternallyAppliedState(true);
    setConfirmStep('upload');
  };

  const handleConfirmNo = () => {
    setExternallyAppliedState(false);
    setConfirmStep('upload');
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmStep('question');
    setConfirmFile(null);
  };

  const handleConfirmSubmit = async () => {
    const fileToSubmit = confirmFile || resumeFile;
    if (!fileToSubmit) {
      setActionError('Please choose your resume file to attach.');
      return;
    }
    if (!selectedJob) return;

    const formData = new FormData();
    formData.append('jobId', selectedJob._id);
    formData.append('resume', fileToSubmit);
    formData.append('externallyApplied', externallyAppliedState ? 'true' : 'false');

    try {
      setConfirmUploading(true);
      await api.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowConfirmModal(false);
      setConfirmStep('question');
      setConfirmFile(null);
      setResumeFile(null);
      const fileInput = document.getElementById('resume-file');
      if (fileInput) fileInput.value = '';

      // Refresh applications
      const appsRes = await api.get('/applications/student');
      setApplications(appsRes.data.data);

      if (externallyAppliedState) {
        setActionSuccess('✅ Application recorded! The admin has been notified that you applied externally.');
      } else {
        setActionSuccess('✅ Application recorded! Your resume has been submitted to the admin.');
      }
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (error) {
      console.error('Confirm submit error:', error);
      setActionError(error.response?.data?.message || 'Error submitting application. Please try again.');
    } finally {
      setConfirmUploading(false);
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-0.5">Consulting Placements</h1>
          <p className="text-sm text-slate-500 font-medium">Find your next placement and upload your application packet.</p>
        </div>
        <div className="w-full md:max-w-xs">
          <input
            type="text"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
            placeholder="Search company, title, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm animate-pulse">
          ⚠️ {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-sm">
          ✓ {actionSuccess}
        </div>
      )}

      <div className="flex flex-col gap-4">
        
        {/* Accordion List View */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>💼</span> Active Listings ({filteredJobs.length})
          </h2>
        </div>
        
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 border border-slate-100 border-dashed rounded-xl bg-white">
            <p className="text-slate-500 text-sm">No jobs match your search parameters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredJobs.map((job) => {
              const hasApplied = getApplicationForJob(job._id);
              const isExpanded = selectedJob?._id === job._id;
              
              return (
                <div
                  key={job._id}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}
                >
                  {/* Job Header Row (Clickable) */}
                  <div 
                    className="p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white"
                    onClick={() => {
                      if (isExpanded) {
                        navigate('/student/jobs');
                      } else {
                        navigate(`/student/jobs/${job._id}`);
                      }
                      setActionError('');
                      setActionSuccess('');
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className={`font-extrabold text-lg sm:text-xl transition-colors ${isExpanded ? 'text-indigo-700' : 'text-slate-900'}`}>
                          {job.title}
                        </h3>
                        {hasApplied && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(hasApplied.status)} shrink-0`}>
                            {hasApplied.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">🏢 {job.company}</span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="flex items-center gap-1.5">📍 {job.location}</span>
                        {job.salary && (
                          <>
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2 rounded-full border border-emerald-100">{job.salary}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 ${isExpanded ? 'bg-indigo-100 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <svg className="w-5 h-5 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Content Area (Accordion Body) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50 animate-in slide-in-from-top-2 fade-in duration-300">
                      <div className="p-6 sm:p-8 flex flex-col gap-8 max-w-4xl">
                        
                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Job Description
                          </h4>
                          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            {job.description}
                          </p>
                        </div>

                        {job.requirements && job.requirements.length > 0 && (
                          <div>
                            <h4 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              Requirements
                            </h4>
                            <ul className="list-disc pl-5 text-slate-600 text-sm leading-relaxed space-y-2 bg-white border border-slate-200 rounded-xl p-5 pr-8 shadow-sm">
                              {job.requirements.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <hr className="border-t border-slate-200" />

                        <div>
                          {(() => {
                            if (hasApplied) {
                              return (
                                <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-2xl text-center flex flex-col items-center shadow-sm">
                                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 border border-indigo-200 shadow-sm">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <h4 className="text-xl font-bold text-slate-900 mb-2">Application Submitted</h4>
                                  <p className="text-sm text-slate-500 mb-5 max-w-md">
                                    You successfully applied to this position on <strong>{new Date(hasApplied.appliedAt).toLocaleDateString()}</strong>. Your resume packet is under review by the consulting administration team.
                                  </p>
                                  <div className="flex justify-center items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                                    <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Current Status:</span>
                                    <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(hasApplied.status)}`}>
                                      {hasApplied.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <form className="flex flex-col gap-6 bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                                <div>
                                  <h4 className="text-lg font-bold text-slate-900 mb-1">Apply for this Placement</h4>
                                  <p className="text-sm text-slate-500 leading-relaxed">
                                    Click <strong>Apply Now</strong> to submit your resume on the firm's external posting. Once completed, upload your resume packet here and click <strong>Submit Application</strong>.
                                  </p>
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload Resume Packet (.pdf)</label>
                                  <input
                                    type="file"
                                    id="resume-file"
                                    accept=".pdf"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
                                    onChange={(e) => { setResumeFile(e.target.files[0]); setConfirmFile(e.target.files[0]); }}
                                  />
                                  <div className="flex flex-wrap gap-3 mt-2">
                                    {resumeFile && (
                                      <button
                                        type="button"
                                        onClick={handleTailorStart}
                                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm shadow-indigo-500/30 hover:shadow-md transition-all cursor-pointer border-none flex items-center gap-1.5"
                                      >
                                        ⚡ Optimize &amp; Tailor Resume to JD
                                      </button>
                                    )}
                                    {job.link && (
                                      <a
                                        href={job.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm shadow-emerald-500/30 hover:shadow-md transition-all cursor-pointer border-none no-underline flex items-center gap-1.5"
                                      >
                                        🔗 Apply Now (External Posting)
                                     </a>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => { 
                                      setShowConfirmModal(true); 
                                      setConfirmStep('question'); 
                                      setActionError(''); 
                                      setActionSuccess(''); 
                                    }}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer border-none"
                                  >
                                    📋 Submit Application to Pipeline
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={handleRequestAssistance}
                                    disabled={uploading}
                                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2"
                                  >
                                    🤝 Request Recruiter Review
                                  </button>
                                </div>
                              </form>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI TAILORING MODAL */}
      {showTailorModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-6 shadow-xl relative max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setShowTailorModal(false)}
              className="absolute top-4 right-4 bg-transparent border-none text-slate-400 hover:text-slate-950 text-2xl font-semibold cursor-pointer"
              aria-label="Close Tailor Resume Modal"
            >
              &times;
            </button>

            {tailorStep === 'processing' ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h2 className="text-lg font-bold text-slate-900">AI Resume Tailoring Wizard</h2>
                <p className="text-sm text-slate-500 animate-pulse">{processingStatus}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                    Keyword Density Match: 96%
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">Resume Optimized Successfully!</h2>
                  <p className="text-xs text-slate-500">We have restructured your experiences to highlight the matching skills required for <strong>{selectedJob.title}</strong> at <strong>{selectedJob.company}</strong>.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 w-full h-[60vh] min-h-[400px]">
                  {previewPdfUrl ? (
                    <iframe src={previewPdfUrl} className="w-full h-full rounded border-none" title="Tailored Resume Preview" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm animate-pulse">Generating PDF Preview...</div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors border-none"
                    onClick={() => setShowTailorModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow border-none"
                    onClick={handleDownloadAndUse}
                  >
                    Download & Attach Tailored File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* EXTERNAL APPLY CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              type="button"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl font-bold bg-transparent border-none cursor-pointer"
              onClick={handleCancelConfirm}
              aria-label="Close Confirmation Modal"
            >
              ✕
            </button>

            {confirmStep === 'question' ? (
              <div className="text-center space-y-5">
                {/* Icon */}
                <div className="w-16 h-16 bg-indigo-50 border-2 border-indigo-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                  📋
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-1">Did you apply externally?</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Have you already submitted your application on <strong>{selectedJob?.company}</strong>'s external posting for <strong>{selectedJob?.title}</strong>?
                  </p>
                </div>

                {actionError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-lg text-xs font-semibold">
                    ⚠️ {actionError}
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                  <p className="text-xs text-amber-700 font-medium">
                    💡 If yes, we will track it as an external match. If no, you can still submit internally through the portal.
                  </p>
                </div>

                <div className="flex gap-3 justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmNo}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-5 py-3 rounded-xl cursor-pointer transition-colors border-none"
                  >
                    ❌ No, I Want to Apply Internally
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmYes}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md border-none"
                  >
                    ✅ Yes, I Applied!
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Success step */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto text-2xl">
                    ✅
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900">Great! Now attach your resume</h2>
                  <p className="text-xs text-slate-500">
                    {externallyAppliedState 
                      ? `Upload the resume you submitted to ${selectedJob?.company} so the admin can track it.`
                      : "Upload your resume file below to submit your application directly to the admin."
                    }
                  </p>
                </div>

                {actionError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-lg text-xs font-semibold">
                    ⚠️ {actionError}
                  </div>
                )}

                {/* File picker */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Resume / CV File</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
                    onChange={(e) => setConfirmFile(e.target.files[0])}
                    defaultValue=""
                  />
                  {confirmFile && (
                    <p className="text-[11px] text-emerald-600 font-medium">📎 {confirmFile.name} selected</p>
                  )}
                  {!confirmFile && resumeFile && (
                    <p className="text-[11px] text-indigo-600 font-medium">
                      📎 Using previously selected: {resumeFile.name}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                  📁 Files are securely uploaded to <strong>secure cloud storage</strong> and shared only with the admin.
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmStep('question')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-xl cursor-pointer transition-colors border-none"
                    disabled={confirmUploading}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={confirmUploading || (!confirmFile && !resumeFile)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md border-none flex items-center justify-center gap-2"
                  >
                    {confirmUploading ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span> Submitting...</>
                    ) : (
                      externallyAppliedState ? '📨 Confirm & Notify Admin' : '📨 Confirm & Submit Application'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentJobs;
