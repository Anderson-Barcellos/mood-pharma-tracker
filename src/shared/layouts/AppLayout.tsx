import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileHeader';
import { QuickDoseFAB } from '@/shared/components/QuickDoseFAB';
import { AuthStatus } from '@/shared/components/AuthStatus';
import { motion, AnimatePresence } from 'framer-motion';

export type NavigationTab = 'dashboard' | 'medications' | 'mood' | 'cognitive';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isInitializing?: boolean;
  initializingMessage?: string;
}

export function AppLayout({
  children,
  activeTab,
  onTabChange,
  isInitializing,
  initializingMessage,
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTabChange = (tab: NavigationTab) => {
    onTabChange(tab);
    setIsSidebarOpen(false); // Close mobile sidebar on navigation
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Initialization Banner */}
      {isInitializing && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-muted text-muted-foreground text-sm py-2 text-center border-b border-border"
        >
          {initializingMessage || 'Sincronizando dados locais...'}
        </motion.div>
      )}

      {/* Mobile Header (< 768px) */}
      <div className="lg:hidden">
        <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      </div>

      <div className="flex min-h-screen">
        {/* Desktop & Tablet Sidebar (>= 768px) */}
        <div className="hidden lg:block">
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isCollapsed={isSidebarCollapsed}
            onCollapse={setIsSidebarCollapsed}
          />
        </div>

        {/* Mobile Sidebar Overlay (< 768px) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              />

              {/* Sidebar */}
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
              >
                <Sidebar
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  isCollapsed={false}
                  onClose={() => setIsSidebarOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main
          className={`
            flex-1 transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
            pb-20 lg:pb-6
          `}
        >
          <div className="container mx-auto px-4 py-6">
            {/* Auth Status Indicator */}
            <div className="flex justify-end mb-4">
              <AuthStatus />
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Bottom Navigation (mobile only, < 768px) */}
      <div className="lg:hidden">
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Quick Dose FAB - visible on all pages except Cognitive */}
      {activeTab !== 'cognitive' && <QuickDoseFAB />}
    </div>
  );
}
