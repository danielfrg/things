import { ChevronLeftIcon } from '@/components/icons';
import { useMobileNav } from '@/lib/contexts/MobileNavContext';

export function MobileBackButton() {
  const { showSidebar } = useMobileNav();

  return (
    <button
      type="button"
      onClick={showSidebar}
      className="md:hidden p-1 -ml-1 mr-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label="Back to sidebar"
    >
      <ChevronLeftIcon className="w-6 h-6" />
    </button>
  );
}
