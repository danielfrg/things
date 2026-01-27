import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  ChevronDown,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { signOut, useSession } from '@/lib/auth-client';
import { type Theme, useTheme } from '@/lib/hooks/useTheme';
import { updateEmailFn, updatePasswordFn } from '@/lib/server/auth';

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function AccountSection() {
  const { data: session, refetch } = useSession();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate({ to: '/login' });
  };

  return (
    <section className="mb-12">
      <SectionHeader title="Account" />
      <Card className="p-0 gap-0 overflow-hidden">
        {/* Email Row */}
        <EmailRow
          email={session?.user?.email || ''}
          onSave={async (newEmail) => {
            const result = await updateEmailFn({ data: { newEmail } });
            if (!result.success) {
              throw new Error(result.error || 'Failed to update email');
            }
            refetch();
          }}
        />

        {/* Password Row */}
        <PasswordRow />

        {/* Theme Row */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="text-sm font-medium text-foreground">Theme</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {(() => {
                const current = themeOptions.find((o) => o.value === theme);
                if (!current) return null;
                return (
                  <>
                    <current.icon className="h-4 w-4" />
                    {current.label}
                    <ChevronDown className="h-4 w-4" />
                  </>
                );
              })()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {themeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                  {theme === option.value && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sign Out Row */}
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-sm font-medium text-foreground">Session</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-8 gap-2 text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </Card>
    </section>
  );
}

function EmailRow({
  email,
  onSave,
}: {
  email: string;
  onSave: (email: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(email);
  const [savedValue, setSavedValue] = useState(email); // Track successfully saved value
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setValue(email);
    setSavedValue(email);
  }, [email]);

  const handleSave = async () => {
    if (!value.trim() || value === savedValue) {
      setIsEditing(false);
      setValue(savedValue);
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      await onSave(value.trim());
      setSavedValue(value.trim()); // Keep the new value locally
      setStatus('success');
      setIsEditing(false);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setValue(savedValue);
    setIsEditing(false);
    setStatus('idle');
  };

  // Display value: use savedValue to avoid flickering back to old email
  const displayEmail = savedValue;

  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-border">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground shrink-0">
          Email
        </span>
        {status === 'success' && (
          <span className="text-xs text-green-600 shrink-0">Saved</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-destructive truncate">
            {errorMessage}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-[200px] h-8 flex items-center justify-end">
          {isEditing ? (
            <Input
              type="email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              disabled={isSubmitting}
              className="h-8 text-sm w-full"
              autoFocus
            />
          ) : (
            <span className="text-sm text-muted-foreground truncate">
              {displayEmail}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 w-[62px] justify-end">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordRow() {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    if (!value.trim()) {
      setIsEditing(false);
      setValue('');
      return;
    }

    if (value.length < 8) {
      setStatus('error');
      setErrorMessage('Min 8 characters');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const result = await updatePasswordFn({ data: { newPassword: value } });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update');
      }
      setStatus('success');
      setValue('');
      setIsEditing(false);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setValue('');
    setIsEditing(false);
    setStatus('idle');
  };

  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-border">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground shrink-0">
          Password
        </span>
        {status === 'success' && (
          <span className="text-xs text-green-600 shrink-0">Saved</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-destructive truncate">
            {errorMessage}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-[200px] h-8 flex items-center justify-end">
          {isEditing ? (
            <Input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              disabled={isSubmitting}
              placeholder="New password"
              className="h-8 text-sm w-full"
              autoFocus
            />
          ) : (
            <span className="text-sm text-muted-foreground">••••••••</span>
          )}
        </div>
        <div className="flex items-center gap-1 w-[62px] justify-end">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </div>
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
