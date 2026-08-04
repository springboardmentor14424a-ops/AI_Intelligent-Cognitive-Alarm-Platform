import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ className = 'h-6 w-full', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-slate-800/60 animate-pulse rounded-xl ${className}`}
        />
      ))}
    </>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-slate-800" />
        <div className="w-16 h-4 rounded bg-slate-800" />
      </div>
      <div className="space-y-2">
        <div className="w-24 h-4 rounded bg-slate-800" />
        <div className="w-36 h-8 rounded bg-slate-800" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-900/60 border border-slate-800/80 rounded-xl animate-pulse w-full" />
      ))}
    </div>
  );
};
