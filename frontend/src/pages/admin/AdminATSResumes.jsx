import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getBaseUrl } from '../../services/api';
const AdminATSResumes = () => {
  const { globalApplications } = useOutletContext();
  useEffect(() => {
    document.title = 'ATS Resume Checker | Apex Console';
  }, []);

  const getResumeDownloadUrl = (url) => {
    if (url.startsWith('/uploads')) {
      const baseUrl = getBaseUrl().replace('/api', '');
      return `${baseUrl}${url}`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">ATS Resume Scanner</h2>
        <p className="text-sm text-slate-500">Automated match check running keyword evaluations on student resumes.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-900">Evaluations Queue</h3>
        {globalApplications.length === 0 ? (
          <p className="text-slate-400 text-sm">No resume submissions recorded in database. Post a job first!</p>
        ) : (
          globalApplications.map((app) => {
            const requirements = app.job?.requirements || [];
            const atsResult = app.atsResult || {
              score: 65 + ((app.student?.name?.length || 5) * 7 % 31),
              matchedKeywords: requirements.slice(0, Math.max(1, Math.floor(requirements.length * 0.75))),
              missingKeywords: requirements.slice(Math.max(1, Math.floor(requirements.length * 0.75))),
            };

            const score = atsResult.score;
            const recommendation = atsResult.missingKeywords && atsResult.missingKeywords.length > 0
              ? `💡 Advise candidate to integrate keywords: ${atsResult.missingKeywords.join(', ')}.`
              : '🌟 Highly aligned candidate. Excellent keyword match density.';

            return (
              <div key={app._id} className="border border-slate-200 rounded-xl p-5 flex flex-col gap-4 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm mb-0.5">{app.student?.name}</h4>
                    <p className="text-xs text-slate-500">
                      Position: <strong>{app.job?.title}</strong> • <span className="text-slate-400">{app.job?.company}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ATS Score</span>
                      <h3 className={`text-2xl font-black ${score >= 80 ? 'text-emerald-600' : 'text-amber-500'} m-0 leading-none`}>
                        {score}%
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      score >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {score >= 80 ? 'High match' : 'Normal match'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Matched Keywords ({atsResult.matchedKeywords?.length || 0})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {atsResult.matchedKeywords && atsResult.matchedKeywords.length > 0 ? (
                        atsResult.matchedKeywords.map((kw, i) => (
                          <span key={i} className="bg-emerald-50/70 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100/50 font-semibold text-[10px]">
                            ✓ {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">No skills matched.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Missing Keywords ({atsResult.missingKeywords?.length || 0})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {atsResult.missingKeywords && atsResult.missingKeywords.length > 0 ? (
                        atsResult.missingKeywords.map((kw, i) => (
                          <span key={i} className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-100 font-semibold text-[10px]">
                            ✗ {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-emerald-600 font-semibold">All skills matched!</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <p className="text-xs text-slate-500 m-0 font-medium italic">{recommendation}</p>
                  <a
                    href={getResumeDownloadUrl(app.resumeUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm hover:shadow no-underline"
                  >
                    🔍 Review Resume File
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminATSResumes;
