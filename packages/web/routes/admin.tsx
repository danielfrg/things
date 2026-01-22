import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { useId, useMemo, useState } from 'react';
import { CopyIcon, KeyIcon, PlusIcon, Trash2Icon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth-client';
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from '@/lib/contexts/DataContext';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin')({
  component: AdminView,
});

function AdminView() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { data: apiKeys, refetch } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState<'read' | 'read-write'>('read-write');
  const [showForm, setShowForm] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);

  const nameId = useId();
  const scopeId = useId();

  const keys = useMemo(() => {
    return [...apiKeys].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [apiKeys]);

  const handleCreateKey = async () => {
    const name = newName.trim();
    if (!name) return;

    const result = await createApiKey.mutateAsync({ name, scope: newScope });
    setCreatedKey(result.key);
    setNewName('');
    setShowForm(false);
    refetch();
  };

  const handleDeleteKey = (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    deleteApiKey.mutate(keyId);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate({ to: '/login' });
  };

  return (
    <ViewContainer
      title="Settings"
      icon={<KeyIcon className="w-6 h-6 text-muted-foreground" />}
      iconColor="text-muted-foreground"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Account Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                disabled={loggingOut}
              >
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">API Keys</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage API keys for external integrations
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <PlusIcon className="w-4 h-4 mr-2" />
              New API Key
            </Button>
          </div>

          {createdKey && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  API Key Created Successfully
                </p>
                <button
                  type="button"
                  onClick={() => handleCopyKey(createdKey)}
                  className="w-16 h-8 flex items-center justify-center text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors text-xs font-medium"
                  title="Copy to clipboard"
                >
                  {copied ? 'Copied!' : <CopyIcon className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                Make sure to copy your API key now. You won't be able to see it
                again!
              </p>
              <code className="block p-3 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded text-sm font-mono break-all">
                {createdKey}
              </code>
            </div>
          )}

          {showForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg border">
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={nameId}
                    className="block text-sm font-medium mb-1"
                  >
                    Name
                  </label>
                  <input
                    id={nameId}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateKey();
                    }}
                    placeholder="My Integration"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label
                    htmlFor={scopeId}
                    className="block text-sm font-medium mb-1"
                  >
                    Scope
                  </label>
                  <select
                    id={scopeId}
                    value={newScope}
                    onChange={(e) =>
                      setNewScope(e.target.value as 'read' | 'read-write')
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="read-write">Read & Write</option>
                    <option value="read">Read Only</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateKey}
                    disabled={!newName.trim()}
                    size="sm"
                  >
                    Create Key
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      setNewName('');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {keys.length > 0 ? (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <KeyIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {key.keyPrefix}...
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full font-medium',
                          key.scope === 'read-write'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                        )}
                      >
                        {key.scope === 'read-write'
                          ? 'Read & Write'
                          : 'Read Only'}
                      </span>
                      <span>
                        Created {format(new Date(key.createdAt), 'PP')}
                      </span>
                      {key.lastUsedAt && (
                        <span>
                          Last used {format(new Date(key.lastUsedAt), 'PP')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(key.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Delete API key"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No API keys yet. Create one to get started.
            </div>
          )}
        </div>
      </div>
    </ViewContainer>
  );
}
