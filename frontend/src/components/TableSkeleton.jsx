import React from 'react';

/**
 * Reusable Skeleton loader for Tables
 * @param {number} rows - Number of skeleton rows to render
 * @param {number} columns - Number of columns per row
 */
const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">
      <table className="w-full text-left table-fixed">
        <thead className="bg-slate-50/50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={`th-${i}`} className="p-4">
                <div className="h-4 bg-slate-200 rounded-md animate-pulse w-3/4"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`tr-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={`td-${rowIndex}-${colIndex}`} className="p-4">
                  <div 
                    className="h-4 bg-slate-100 rounded-md animate-pulse" 
                    style={{ width: `${Math.floor(Math.random() * (90 - 40 + 1) + 40)}%` }}
                  ></div>
                  {colIndex === 0 && (
                     <div className="h-3 bg-slate-100 rounded-md animate-pulse mt-2 w-1/2"></div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
