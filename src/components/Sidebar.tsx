import React from 'react';
import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  Keyboard,
  LayoutDashboard,
  ListTodo,
  Newspaper,
  Settings,
  X,
} from 'lucide-react';
import { NavSection } from '../types';
import { SlothIcon } from './SlothIcon';
import { PrivacyNotice } from './PrivacyNotice';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenShortcuts: () => void;
  onBackToWebsite: () => void;
}

export const NAV_ITEMS: Array<{
  id: NavSection;
  code: string;
  label: string;
  shortcut: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', code: '00', label: 'Overview', shortcut: 'Alt+1', Icon: LayoutDashboard },
  { id: 'summarizer', code: '01', label: 'AI Summarizer', shortcut: 'Alt+2', Icon: FileText },
  { id: 'tasks', code: '02', label: 'Task Extractor', shortcut: 'Alt+3', Icon: ListTodo },
  { id: 'organizer', code: '03', label: 'File Organizer', shortcut: 'Alt+4', Icon: FolderKanban },
  { id: 'briefing', code: '04', label: 'Daily Briefing', shortcut: 'Alt+5', Icon: Newspaper },
  { id: 'activity', code: '05', label: 'Activity', shortcut: 'Alt+6', Icon: Activity },
  { id: 'settings', code: '06', label: 'Settings', shortcut: 'Alt+7', Icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenShortcuts,
  onBackToWebsite,
}) => {
  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const renderSidebarContent = (mobileView = false) => {
    const collapsed = !mobileView && isCollapsed;

    return (
      <div className="relative z-20 flex flex-col justify-between h-full bg-[#0B0B0C]/95 backdrop-blur-xl border-r border-white/[0.08] select-none">
        <div>
          {/* Brand Row */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={onBackToWebsite}
              title="Return to SlothAI Brand Website"
              className="flex items-center gap-2.5 text-left text-[#F5F5F5] cursor-pointer focus:outline-none group"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#121215] border border-white/10 text-[#FF9A35] group-hover:border-[#FF6B1A]/50 transition-colors shrink-0">
                <SlothIcon className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#FF6B1A] shadow-[0_0_8px_#FF6B1A]" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold tracking-[0.14em] uppercase text-[#F5F5F5] whitespace-nowrap">
                    SLOTHAI
                  </span>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#71717A]">
                    LOCAL ENGINE
                  </span>
                </div>
              )}
            </button>

            {mobileView ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.05] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Section Eyebrow */}
          {!collapsed && (
            <div className="px-4 pt-4 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#71717A]">
                [ WORKSPACE MODULES ]
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="Primary Workspace Navigation">
            {NAV_ITEMS.map(({ id, label, shortcut, Icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelect(id)}
                  title={collapsed ? `${label} (${shortcut})` : shortcut}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center px-2' : 'justify-between px-3'
                  } py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF6B1A]/15 via-[#FF9A35]/10 to-transparent border-[#FF6B1A]/40 text-[#F5F5F5] shadow-[inset_0_1px_0_rgba(255,154,53,0.15)]'
                      : 'border-transparent text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F5F5F5]'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#FF9A35]' : 'text-[#71717A]'
                      }`}
                    />
                    {!collapsed && (
                      <span className="whitespace-nowrap truncate">{label}</span>
                    )}
                  </span>
                  {!collapsed && (
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        isActive ? 'text-[#FF9A35]' : 'text-[#71717A]'
                      }`}
                    >
                      {shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Privacy, Brand Site Return & Shortcuts Area */}
        <div className="p-3 space-y-2 border-t border-white/[0.08]">
          {!collapsed && <PrivacyNotice variant="sidebar" />}

          <button
            type="button"
            onClick={onBackToWebsite}
            title="Return to SlothAI Brand Website (Alt+0)"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-2' : 'justify-between px-3'
            } py-2 rounded-xl text-xs font-medium text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F5F5F5] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer`}
          >
            <span className="flex items-center gap-2.5">
              <ArrowLeft className="w-4 h-4 shrink-0 text-[#FF9A35]" />
              {!collapsed && (
                <span className="whitespace-nowrap">SlothAI Brand Site</span>
              )}
            </span>
            {!collapsed && (
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141418] border border-white/[0.08] text-[#71717A]">
                Alt+0
              </kbd>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (Alt+K)"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-2' : 'justify-between px-3'
            } py-2 rounded-xl text-xs font-medium text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F5F5F5] transition-colors cursor-pointer`}
          >
            <span className="flex items-center gap-2.5">
              <Keyboard className="w-4 h-4 shrink-0 text-[#71717A]" />
              {!collapsed && (
                <span className="whitespace-nowrap">Keyboard Shortcuts</span>
              )}
            </span>
            {!collapsed && (
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141418] border border-white/[0.08] text-[#71717A]">
                Alt+K
              </kbd>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-150 ${
          isCollapsed ? 'w-[68px]' : 'w-[260px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[260px] max-w-[80vw] h-full">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
