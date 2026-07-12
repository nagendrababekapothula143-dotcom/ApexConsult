import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

const AdminStudents = () => {
  const { students, globalApplications } = useOutletContext();

  useEffect(() => {
    document.title = 'All Students | Apex Console';
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-0.5">Registered Students</h2>
        <p className="text-sm text-slate-500">View registered student profiles and track S3 resume submissions.</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Full Name</th>
              <th className="p-4">Email Address</th>
              <th className="p-4">Dashboard Access</th>
              <th className="p-4">Submission Track</th>
              <th className="p-4">Registered On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {students.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">No student profiles found.</td>
              </tr>
            ) : (
              students.map((student) => {
                // Check if student has applied to any jobs globally
                const hasApplied = globalApplications && globalApplications.some(
                  (app) => {
                    const studentId = app.student?._id || app.student;
                    return studentId === student._id;
                  }
                );

                return (
                  <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{student.name}</td>
                    <td className="p-4 text-slate-600">{student.email}</td>
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Active Profile
                      </span>
                    </td>
                    <td className="p-4">
                      {hasApplied ? (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Applied
                        </span>
                      ) : (
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Not Applied
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminStudents;
