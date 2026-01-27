import { ChevronLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

export function MobileBackButton() {
  const { setOpenMobile } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setOpenMobile(true)}
      className="md:hidden -ml-1 mr-2 text-muted-foreground hover:text-foreground"
      aria-label="Back to sidebar"
    >
      <ChevronLeftIcon className="w-6 h-6" />
    </Button>
  );
}
