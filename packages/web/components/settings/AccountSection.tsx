import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { signOut, useSession } from '@/lib/auth-client';

export function AccountSection() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate({ to: '/login' });
  };

  return (
    <section className="mb-12">
      <SectionHeader title="Account" />
      <Card className="py-0 gap-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {session?.user?.name?.charAt(0)?.toUpperCase() || ''}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {session?.user?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </Card>
    </section>
  );
}

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
