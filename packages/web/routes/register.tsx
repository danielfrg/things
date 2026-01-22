import { createFileRoute, Link } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { signUp } from '@/lib/auth-client';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signUp.email({
      name,
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message || 'Failed to create account');
      setLoading(false);
      return;
    }

    // Force a full page reload to ensure root loader runs with new session
    window.location.href = '/today';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Get started with your task management
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor={nameId} className="text-sm font-medium">
              Name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={emailId} className="text-sm font-medium">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={passwordId} className="text-sm font-medium">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              required
              minLength={8}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
