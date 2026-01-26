import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { signOut, useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

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
      <Card>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {session?.user?.name?.charAt(0)?.toUpperCase() || ''}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {session?.user?.name}
              </p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
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
      <h2 className="text-base font-medium text-gray-800 dark:text-gray-100">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}
