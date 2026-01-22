import { createContext, type ReactNode, useContext } from 'react';

interface AppContextValue {
  openGlobalInput: () => void;
  openCommandPalette: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  // Return no-op functions if context is not available (SSR)
  if (!context) {
    return {
      openGlobalInput: () => {},
      openCommandPalette: () => {},
    };
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
  openGlobalInput: () => void;
  openCommandPalette: () => void;
}

export function AppProvider({
  children,
  openGlobalInput,
  openCommandPalette,
}: AppProviderProps) {
  return (
    <AppContext.Provider
      value={{
        openGlobalInput,
        openCommandPalette,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
