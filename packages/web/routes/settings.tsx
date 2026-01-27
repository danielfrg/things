import { createFileRoute } from '@tanstack/react-router';
import { Settings2Icon } from '@/components/icons';
import { MobileBackButton } from '@/components/MobileBackButton';
import { AccountSection } from '@/components/settings/AccountSection';
import { ApiKeysSection } from '@/components/settings/ApiKeysSection';
import { TagsSection } from '@/components/settings/TagsSection';

declare const __APP_VERSION__: string;

export const Route = createFileRoute('/settings')({
  component: SettingsView,
});

function SettingsView() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[800px] mx-auto px-6 py-8">
          {/* Page Title */}
          <div className="flex items-center gap-3 mb-8">
            <MobileBackButton />
            <Settings2Icon className="w-6 h-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          </div>

          <AccountSection />
          <ApiKeysSection />
          <TagsSection />

          {/* Version */}
          <p className="text-xs text-muted-foreground text-center">
            Version: {__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
}
