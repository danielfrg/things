import { ChevronLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useMobileNav } from '@/lib/contexts/MobileNavContext';

export function MobileBackButton() {
  const { showSidebar } = useMobileNav();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={showSidebar}
      className="md:hidden -ml-1 mr-2 text-muted-foreground hover:text-foreground"
      aria-label="Back to sidebar"
    >
      <ChevronLeftIcon className="w-6 h-6" />
    </Button>
  );
}
