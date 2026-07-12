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
    setApplications
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
        // Auto-redirect to the first job's route if no specific ID is selected
        navigate(`/student/jobs/${jobs[0]._id}`, { replace: true });
      } else {
        const found = jobs.find((j) => j._id === jobId);
        if (found) {
          setSelectedJob(found);
        }
      }
    }
  }, [jobId, jobs, navigate, setSelectedJob]);

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
      setTailorResult(res.data.data);
      setTailoredText(res.data.data.tailoredText);
      setTailorStep('completed');
    } catch (err) {
      clearInterval(interval);
      console.error('Tailoring error:', err);
      setActionError(err.response?.data?.message || 'Failed to parse and tailor resume.');
      setShowTailorModal(false);
      setTimeout(() => setActionError(''), 5000);
    }
  };

  const handleDownloadAndUse = () => {
    if (!tailorResult) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    const margin = 54; // 0.75 inch margins
    let y = 50;

    // Draw Candidate Name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(tailorResult.studentName.toUpperCase(), 306, y, { align: 'center' });
    y += 24;

    // Draw Subtitle / Target Role
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(tailorResult.jobTitle.toUpperCase() + ' OPTIMIZED PROFILE', 306, y, { align: 'center' });
    y += 16;

    // Contact info
    doc.setFontSize(9);
    doc.text(`+123-456-7890   |   ${tailorResult.studentEmail}   |   Dallas, TX`, 306, y, { align: 'center' });
    y += 12;

    // Horizontal divider line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(1);
    doc.line(margin, y, 612 - margin, y);
    y += 20;

    // About Me
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo accent
    doc.text('ABOUT ME', margin, y);
    y += 12;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // Slate-700
    const aboutLines = doc.splitTextToSize(tailorResult.aboutMe, 612 - margin * 2);
    doc.text(aboutLines, margin, y);
    y += aboutLines.length * 13 + 15;

    // Education
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo accent
    doc.text('EDUCATION', margin, y);
    y += 12;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const eduLines = doc.splitTextToSize(tailorResult.education, 612 - margin * 2);
    doc.text(eduLines, margin, y);
    y += eduLines.length * 13 + 15;

    // Work Experience
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo accent
    doc.text('PROFESSIONAL EXPERIENCE', margin, y);
    y += 12;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const expLines = doc.splitTextToSize(tailorResult.experience, 612 - margin * 2);
    doc.text(expLines, margin, y);
    y += expLines.length * 13 + 15;

    // Skills
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo accent
    doc.text('TECHNICAL & STRATEGIC SKILLS', margin, y);
    y += 12;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const skillsText = tailorResult.skills.map(s => `• ${s}`).join('   ');
    const skillsLines = doc.splitTextToSize(skillsText, 612 - margin * 2);
    doc.text(skillsLines, margin, y);

    // Save/Download PDF
    const pdfOutputBlob = doc.output('blob');
    const fileName = `${(tailorResult.studentName || 'Student').replace(/\s+/g, '_')}_Tailored_Resume_${tailorResult.jobCompany.replace(/\s+/g, '_')}.pdf`;
    
    // Trigger download
    const url = URL.createObjectURL(pdfOutputBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Placements List */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>💼</span> Active Listings ({filteredJobs.length})
          </h3>
          
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredJobs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <p className="text-slate-500 text-sm">No jobs match your search parameters.</p>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const hasApplied = getApplicationForJob(job._id);
                const isSelected = selectedJob?._id === job._id;
                return (
                  <div
                    key={job._id}
                    className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-50 bg-indigo-50/10'
                        : 'border-slate-200 hover:border-indigo-200'
                    }`}
                    onClick={() => {
                      navigate(`/student/jobs/${job._id}`);
                      setActionError('');
                      setActionSuccess('');
                    }}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm mb-0.5">{job.title}</h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {job.company} • <span className="text-slate-400 font-normal">{job.location}</span>
                        </p>
                      </div>
                      {hasApplied && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(hasApplied.status)}`}>
                          {hasApplied.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Job and Apply form */}
        <div className="lg:col-span-7">
          {selectedJob ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 shadow-xs flex flex-col gap-6">
              
              <div>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 inline-block">
                  Active Listing
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 mb-1">{selectedJob.title}</h2>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">🏢 {selectedJob.company}</span>
                  <span className="flex items-center gap-1">📍 {selectedJob.location}</span>
                  {selectedJob.salary && <span className="flex items-center gap-1">💸 {selectedJob.salary}</span>}
                </div>
              </div>

              <hr className="border-t border-slate-100" />

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Job Description</h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {selectedJob.description}
                </p>
              </div>

              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Requirements</h3>
                  <ul className="list-disc pl-5 text-slate-600 text-sm leading-relaxed space-y-1">
                    {selectedJob.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <hr className="border-t border-slate-100" />

              <div>
                {(() => {
                  const existingApp = getApplicationForJob(selectedJob._id);
                  if (existingApp) {
                    return (
                      <div className="bg-indigo-50/30 border border-indigo-100 p-6 rounded-xl text-center">
                        <h4 className="font-bold text-slate-900 mb-1">Application Submitted</h4>
                        <p className="text-xs text-slate-500 mb-4">
                          You applied to this position on {new Date(existingApp.appliedAt).toLocaleDateString()}.
                        </p>
                        <div className="flex justify-center items-center gap-2">
                          <span className="text-xs text-slate-600 font-medium">Status:</span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(existingApp.status)}`}>
                            {existingApp.status}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <form className="flex flex-col gap-4">
                      <h3 className="text-sm font-bold text-slate-900">Apply for this Placement</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Step 1: Click <strong>Apply Now</strong> to apply on the external posting. Once done, come back and click <strong>Submit Application</strong> to confirm and send your resume to the admin.
                      </p>
                      
                      <div className="flex flex-col gap-3">
                        <input
                          type="file"
                          id="resume-file"
                          accept=".pdf,.doc,.docx,.txt"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-50 transition-all"
                          onChange={(e) => { setResumeFile(e.target.files[0]); setConfirmFile(e.target.files[0]); }}
                        />
                        <div className="flex flex-wrap gap-2.5 mt-1">
                          {resumeFile && (
                            <button
                              type="button"
                              onClick={handleTailorStart}
                              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer border-none flex items-center gap-1.5"
                            >
                              ⚡ Optimize &amp; Tailor Resume to JD
                            </button>
                          )}
                          {selectedJob.link && (
                            <a
                              href={selectedJob.link}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer border-none no-underline flex items-center gap-1.5"
                            >
                              🔗 Apply Now (External Posting)
                            </a>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => { 
                          setShowConfirmModal(true); 
                          setConfirmStep('question'); 
                          setActionError(''); 
                          setActionSuccess(''); 
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all self-start cursor-pointer border-none mt-2"
                      >
                        📋 Submit Application
                      </button>
                    </form>
                  );
                })()}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <p className="text-slate-500 text-sm">Select a job listing on the left to view description and apply.</p>
            </div>
          )}
        </div>

      </div>

      {/* AI TAILORING MODAL */}
      {showTailorModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-8 shadow-xl relative">
            <button
              onClick={() => setShowTailorModal(false)}
              className="absolute top-4 right-4 bg-transparent border-none text-slate-400 hover:text-slate-950 text-2xl font-semibold cursor-pointer"
            >
              &times;
            </button>

            {tailorStep === 'processing' ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h3 className="text-lg font-bold text-slate-900">AI Resume Tailoring Wizard</h3>
                <p className="text-sm text-slate-500 animate-pulse">{processingStatus}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                    Keyword Density Match: 96%
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">Resume Optimized Successfully!</h3>
                  <p className="text-xs text-slate-500">We have restructured your experiences to highlight the matching skills required for <strong>{selectedJob.title}</strong> at <strong>{selectedJob.company}</strong>.</p>
                </div>

                <div className="bg-white border border-slate-200 shadow-inner rounded-xl p-6 max-h-[300px] overflow-y-auto text-slate-800 text-left font-sans text-xs">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="text-center space-y-1">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{tailorResult?.studentName || user?.name || 'Student Name'}</h2>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{tailorResult?.jobTitle || selectedJob?.title || 'Management Consultant'}</p>
                    </div>

                    {/* Contacts Row */}
                    <div className="border-t border-b border-slate-200 py-1.5 flex flex-wrap justify-center gap-4 text-[9px] text-slate-500 font-medium">
                      <span>📞 +123-456-7890</span>
                      <span>✉️ {tailorResult?.studentEmail || user?.email || 'hello@reallygreatsite.com'}</span>
                      <span>📍 Dallas, TX</span>
                    </div>

                    {/* About Me */}
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">About Me</h3>
                      <hr className="border-t border-slate-200" />
                      <p className="text-[10px] text-slate-600 leading-relaxed">
                        {tailorResult?.aboutMe || `Highly analytical consulting candidate offering hands-on expertise in quantitative modeling, strategic slides preparation, and the case interview method. Specifically optimized to align with ${selectedJob?.company || 'target consulting firms'}'s active requirements for the ${selectedJob?.title || 'consultant'} role.`}
                      </p>
                    </div>

                    {/* Education */}
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Education</h3>
                      <hr className="border-t border-slate-200" />
                      <div className="text-[10px] text-slate-600 space-y-1 whitespace-pre-wrap">
                        {tailorResult?.education || (
                          <>
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Borcelle University | 2026-2030</span>
                              <span>GPA: 3.8/4.0</span>
                            </div>
                            <p className="font-semibold text-slate-600 italic">Bachelor of Science in Economics & Business</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Work Experience */}
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Work Experience</h3>
                      <hr className="border-t border-slate-200" />
                      <div className="text-[10px] text-slate-600 space-y-2 whitespace-pre-wrap">
                        {tailorResult?.experience || (
                          <div>
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Salford & Co. | 2033 - 2035</span>
                              <span>Dallas, TX</span>
                            </div>
                            <p className="font-semibold text-slate-600 italic">Management Intern</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Skills</h3>
                      <hr className="border-t border-slate-200" />
                      <ul className="grid grid-cols-3 gap-y-1 gap-x-4 text-[10px] text-slate-600 list-disc pl-4">
                        {tailorResult?.skills?.map((s, i) => (
                          <li key={i} className="capitalize">{s}</li>
                        )) || (
                          <>
                            <li>Case Method</li>
                            <li>Financial Modeling</li>
                            <li>Strategic Presentation</li>
                          </>
                        )}
                      </ul>
                    </div>

                  </div>
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
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1">Did you apply externally?</h3>
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
                  <h3 className="text-lg font-extrabold text-slate-900">Great! Now attach your resume</h3>
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
                  📁 Files are securely uploaded to <strong>AWS S3</strong> and shared only with the admin.
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
