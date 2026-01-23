import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalTaskInput } from '@/components/GlobalTaskInput';
import { AppProvider } from '@/lib/contexts/AppContext';
import { DataProvider, type InitialData } from '@/lib/contexts/DataContext';
import {
  MobileNavProvider,
  useMobileNav,
} from '@/lib/contexts/MobileNavContext';
import { useHotkey } from '@/lib/hooks/useHotkey';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';

function AppLayoutInner({ children }: { children: ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [globalInputOpen, setGlobalInputOpen] = useState(false);

  const { view, isChangingRoute } = useMobileNav();

  const openGlobalInput = useCallback(() => setGlobalInputOpen(true), []);
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);

  // Keyboard shortcuts
  useHotkey('k', openCommandPalette, { meta: true });
  useHotkey('n', openGlobalInput, { ctrl: true });

  return (
    <AppProvider
      openGlobalInput={openGlobalInput}
      openCommandPalette={openCommandPalette}
    >
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop: Side-by-side layout (hidden on mobile via CSS) */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:h-full md:border-r md:border-sidebar-border md:bg-sidebar">
          <Sidebar />
        </aside>
        <main className="hidden md:flex md:flex-1 md:min-w-0 md:flex-col md:overflow-hidden">
          {children}
        </main>

        {/* Mobile: Full-screen sliding panels (hidden on desktop via CSS) */}
        <aside
          className={cn(
            'md:hidden absolute inset-0 z-10 bg-white transition-transform duration-300 ease-out',
            view === 'sidebar' ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <Sidebar />
        </aside>
        <main
          className={cn(
            'md:hidden absolute inset-0 z-20 flex flex-col overflow-hidden bg-background transition-transform duration-300 ease-out',
            view === 'content' ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div
            className={cn(
              'flex flex-col h-full',
              isChangingRoute && 'invisible',
            )}
          >
            {children}
          </div>
        </main>

        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />

        <GlobalTaskInput
          open={globalInputOpen}
          onClose={() => setGlobalInputOpen(false)}
        />
      </div>
    </AppProvider>
  );
}

export function AppLayout({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: InitialData;
}) {
  return (
    <DataProvider initialData={initialData}>
      <MobileNavProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </MobileNavProvider>
    </DataProvider>
  );
}
