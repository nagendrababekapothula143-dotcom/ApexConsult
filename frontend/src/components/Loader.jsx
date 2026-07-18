import React from 'react';

const Loader = ({ text = "Loading...", fullScreen = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-sm font-semibold text-slate-500 tracking-wide animate-pulse">{text}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;
