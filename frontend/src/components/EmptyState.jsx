import React from 'react';
import { FileQuestion, FolderOpen, SearchX, Inbox } from 'lucide-react';

/**
 * Reusable Empty State Component
 * 
 * @param {string} title - Main heading
 * @param {string} description - Subtitle/description
 * @param {string} icon - Type of icon to render ('file', 'folder', 'search', 'inbox')
 * @param {React.ReactNode} action - Optional action button
 */
const EmptyState = ({ title, description, icon = 'search', action }) => {
  const IconComponent = {
    file: FileQuestion,
    folder: FolderOpen,
    search: SearchX,
    inbox: Inbox
  }[icon] || SearchX;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
        <IconComponent className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
