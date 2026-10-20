import React, { useState } from 'react';
import {
  ConnectionCheckResult,
  NavSection,
  ThemeMode,
  ToastMessage,
} from '../types';
import { User } from '../services/firebaseService';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ShortcutModal } from './ShortcutModal';
import { ToastContainer } from './Toast';

interface AppShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  connection: ConnectionCheckResult;
  theme: ThemeMode;
  currentUser: User | null;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  onRetestConnection: () => void;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  isShortcutModalOpen: boolean;
  onOpenShortcuts: () => void;
  onCloseShortcuts: () => void;
  onBackToWebsite: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeSection,
  onSelectSection,
  connection,
  theme,
  currentUser,
  onOpenAuth,
  onSignOut,
  onToggleTheme,
  onRetestConnection,
  toasts,
  onDismissToast,
  isShortcutModalOpen,
  onOpenShortcuts,
  onCloseShortcuts,
  onBackToWebsite,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen h-screen flex overflow-hidden bg-[#060606] text-[#F5F5F5] selection:bg-[#FF6B1A]/30 selection:text-white">
      {/* Subtle Ambient Architectural Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          className="absolute -top-36 left-1/2 -translate-x-1/2 w-[760px] h-[320px] rounded-full opacity-20 blur-[130px]"
          style={{
            background:
              'radial-gradient(circle, rgba(255,107,26,0.28) 0%, rgba(255,154,53,0.08) 45%, transparent 75%)',
          }}
        />
      </div>

      <a
        href="#main-workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#FF6B1A] focus:text-black focus:text-xs focus:font-semibold"
      >
        Skip to main content
      </a>

      <Sidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenShortcuts={onOpenShortcuts}
        onBackToWebsite={onBackToWebsite}
      />

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeSection={activeSection}
          connection={connection}
          theme={theme}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onSignOut={onSignOut}
          onToggleTheme={onToggleTheme}
          onRetestConnection={onRetestConnection}
          onOpenSettings={() => onSelectSection('settings')}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onBackToWebsite={onBackToWebsite}
        />

        <main
          id="main-workspace"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-7 focus:outline-none"
        >
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>

      <ShortcutModal
        isOpen={isShortcutModalOpen}
        onClose={onCloseShortcuts}
      />

      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
};
