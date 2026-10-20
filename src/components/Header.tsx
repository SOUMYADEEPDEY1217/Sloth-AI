import React from 'react';
import {
  ArrowLeft,
  Cloud,
  LogIn,
  LogOut,
  Menu,
  Settings,
  UserPlus,
} from 'lucide-react';
import { ConnectionCheckResult, NavSection, ThemeMode } from '../types';
import { User } from '../services/firebaseService';
import { ModelStatus } from './ModelStatus';
import { NAV_ITEMS } from './Sidebar';

interface HeaderProps {
  activeSection: NavSection;
  connection: ConnectionCheckResult;
  theme: ThemeMode;
  currentUser: User | null;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  onRetestConnection: () => void;
  onOpenSettings: () => void;
  onOpenMobileMenu: () => void;
  onBackToWebsite: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  connection,
  currentUser,
  onOpenAuth,
  onSignOut,
  onRetestConnection,
  onOpenSettings,
  onOpenMobileMenu,
  onBackToWebsite,
}) => {
  const currentItem =
    NAV_ITEMS.find((i) => i.id === activeSection) || NAV_ITEMS[0];

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-white/[0.08] bg-[#0B0B0C]/90 backdrop-blur-xl flex items-center justify-between gap-4 sm:gap-6 shrink-0">
      {/* Zone 1: Contextual Breadcrumb / Mobile Trigger */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.05] cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5 text-xs whitespace-nowrap">
          <span className="hidden sm:inline font-mono uppercase tracking-[0.16em] text-[#71717A]">
            [ {currentItem.code} · WORKSPACE ]
          </span>
          <span aria-hidden="true" className="hidden sm:inline text-white/20">
            /
          </span>
          <span className="font-display text-sm font-semibold tracking-tight text-[#F5F5F5]">
            {currentItem.label}
          </span>
        </div>
      </div>

      {/* Zone 2: Verified Model & Service Status */}
      <div className="hidden xl:flex items-center gap-4">
        <ModelStatus
          connection={connection}
          onRetest={onRetestConnection}
          onOpenSettings={onOpenSettings}
          compact
        />
      </div>

      {/* Zone 3: Firebase Account Status, Brand Website & Engine Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <div
              title={`Firestore Cloud Sync Active (${currentUser.email || currentUser.uid})`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-xs"
            >
              <Cloud className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
              <span className="font-mono text-[11px] text-[#F5F5F5] max-w-[130px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out of Firebase Account"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/12 bg-[#121215] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-white/25 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/15 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:text-[#FF9A35] transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 text-[#FF9A35]" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#FF6B1A] to-[#FF9A35] text-black hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onBackToWebsite}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/12 bg-[#121215] text-[#F5F5F5] hover:border-[#FF9A35]/50 hover:bg-white/[0.06] transition-all cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#FF9A35]" />
          <span>Brand Site</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Configure Local Backend & Ollama Models"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#FF6B1A]/35 bg-[#FF6B1A]/10 text-[#FF9A35] hover:bg-[#FF6B1A]/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Engine</span>
        </button>
      </div>
    </header>
  );
};
