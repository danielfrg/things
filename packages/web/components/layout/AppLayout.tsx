import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalTaskInput } from '@/components/GlobalTaskInput';
import {
  SidebarInset,
  Sidebar as SidebarPrimitive,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppProvider } from '@/lib/contexts/AppContext';
import { DataProvider, type InitialData } from '@/lib/contexts/DataContext';
import { useHotkey } from '@/lib/hooks/useHotkey';
import { AppSidebar } from './Sidebar';

function AppLayoutInner({ children }: { children: ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [globalInputOpen, setGlobalInputOpen] = useState(false);

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
      <SidebarProvider>
        <SidebarPrimitive className="border-r border-sidebar-border">
          <AppSidebar />
        </SidebarPrimitive>
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      <GlobalTaskInput
        open={globalInputOpen}
        onClose={() => setGlobalInputOpen(false)}
      />
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
      <AppLayoutInner>{children}</AppLayoutInner>
    </DataProvider>
  );
}
