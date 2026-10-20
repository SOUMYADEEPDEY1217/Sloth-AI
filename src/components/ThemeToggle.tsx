import React from 'react';
import { Sparkles } from 'lucide-react';
import { ThemeMode } from '../types';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Cinematic Obsidian Theme Active"
      title="Cinematic Obsidian Theme Active"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full border border-white/12 bg-[#121215] text-[#FF9A35] hover:border-[#FF6B1A]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
    >
      <Sparkles className="w-3.5 h-3.5 text-[#FF9A35]" />
      <span>Obsidian</span>
    </button>
  );
};
