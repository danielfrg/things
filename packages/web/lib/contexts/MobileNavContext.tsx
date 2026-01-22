import { useRouterState } from '@tanstack/react-router';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

type MobileView = 'sidebar' | 'content';

interface MobileNavContextValue {
  view: MobileView;
  isChangingRoute: boolean;
  showSidebar: () => void;
  showContent: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue | undefined>(
  undefined,
);

export function useMobileNav() {
  const context = useContext(MobileNavContext);
  if (!context) {
    return {
      view: 'sidebar' as MobileView,
      isChangingRoute: false,
      showSidebar: () => {},
      showContent: () => {},
    };
  }
  return context;
}

interface MobileNavProviderProps {
  children: ReactNode;
}

export function MobileNavProvider({ children }: MobileNavProviderProps) {
  const router = useRouterState();
  const pathname = router.location.pathname;

  // Initialize view based on pathname - content routes show content on mobile
  const initialView = pathname !== '/' ? 'content' : 'sidebar';

  const [view, setView] = useState<MobileView>(initialView);
  const [isChangingRoute, setIsChangingRoute] = useState(false);
  const isMobile = useIsMobile();
  const prevPath = useRef<string | null>(pathname);
  const pushedState = useRef(false);

  const showSidebar = useCallback(() => {
    if (pushedState.current) {
      window.history.back();
      return;
    }
    setView('sidebar');
  }, []);

  const showContent = useCallback(() => {
    setView('content');
  }, []);

  // When route changes on mobile, show content view
  useEffect(() => {
    if (!isMobile) {
      prevPath.current = null;
      return;
    }

    // Path didn't change
    if (pathname === prevPath.current) return;

    // Route is changing - hide content briefly
    if (prevPath.current !== null && pathname !== '/') {
      setIsChangingRoute(true);
    }

    prevPath.current = pathname;

    // Show content immediately for content routes
    if (pathname !== '/') {
      setView('content');
      // Show content after a brief moment to let new content render
      requestAnimationFrame(() => {
        setIsChangingRoute(false);
      });
    }
  }, [pathname, isMobile]);

  // Push history state when showing content on mobile
  useEffect(() => {
    if (!isMobile) {
      pushedState.current = false;
      return;
    }

    if (view === 'content' && !pushedState.current) {
      window.history.pushState({ mobileView: 'content' }, '');
      pushedState.current = true;
    }

    const handlePopState = () => {
      if (view === 'content') {
        setView('sidebar');
        pushedState.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, isMobile]);

  // Reset to sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setView('sidebar');
    }
  }, [isMobile]);

  return (
    <MobileNavContext.Provider
      value={{ view, isChangingRoute, showSidebar, showContent }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}
