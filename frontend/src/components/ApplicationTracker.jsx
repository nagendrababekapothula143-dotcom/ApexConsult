import React from 'react';

const ApplicationTracker = ({ status }) => {
  // Define steps
  const steps = [
    { id: 'submitted', label: 'Submitted' },
    { id: 'review', label: 'Under Review' },
    { id: 'decision', label: 'Decision' }
  ];

  // Determine current step index based on status
  let currentStepIndex = 0; // 0 = Submitted, 1 = Review, 2 = Decision
  let isRejected = false;

  if (status === 'reviewed' || status === 'application sent') {
    currentStepIndex = 1;
  } else if (status === 'accepted') {
    currentStepIndex = 2;
  } else if (status === 'rejected') {
    currentStepIndex = 2;
    isRejected = true;
  }

  return (
    <div className="mt-6 pt-5 border-t border-slate-100">
      <div className="flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full"></div>
        
        {/* Progress Line */}
        <div 
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full transition-all duration-500 ease-out ${isRejected ? 'bg-rose-500' : 'bg-indigo-600'}`}
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          let nodeClasses = "w-6 h-6 rounded-full flex items-center justify-center relative z-10 transition-colors duration-300 ";
          
          if (isCompleted) {
            nodeClasses += "bg-indigo-600 border-2 border-indigo-600 text-white";
          } else if (isCurrent) {
            if (isRejected && step.id === 'decision') {
              nodeClasses += "bg-rose-500 border-2 border-rose-500 text-white";
            } else {
              nodeClasses += "bg-indigo-600 border-2 border-indigo-600 text-white shadow-[0_0_0_4px_rgba(79,70,229,0.2)]";
            }
          } else {
            nodeClasses += "bg-white border-2 border-slate-200";
          }

          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div className={nodeClasses}>
                {(isCompleted || (isCurrent && !isRejected && index === 2)) && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isCurrent && isRejected && index === 2 && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {isCurrent && index < 2 && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent || isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                {isRejected && isCurrent && step.id === 'decision' ? 'Rejected' : (isCurrent && step.id === 'decision' ? 'Accepted' : step.label)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicationTracker;
