import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export const HeaderBanner: React.FC = () => {
  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs md:text-sm font-semibold border-b border-amber-600 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 mx-auto text-center">
        <ShieldAlert className="w-5 h-5 text-amber-950 flex-shrink-0 animate-pulse" />
        <span>
          DEMO ONLY — NOT FOR REAL EMERGENCIES — Simulated Community Disaster-Response Training Environment
        </span>
      </div>
    </div>
  );
};
