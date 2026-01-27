import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { KeyIcon, Trash2Icon } from '@/components/icons';
import { Card, SectionHeader } from '@/components/settings/AccountSection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from '@/lib/contexts/DataContext';
import { cn } from '@/lib/utils';

export function ApiKeysSection() {
  const { data: apiKeys, refetch } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [showModal, setShowModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const keys = useMemo(() => {
    return [...apiKeys].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [apiKeys]);

  const handleCreateKey = async (
    name: string,
    scope: 'read' | 'read-write',
  ) => {
    const result = await createApiKey.mutateAsync({ name, scope });
    setCreatedKey(result.key);
    setShowModal(false);
    refetch();
  };

  const handleDeleteKey = (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    deleteApiKey.mutate(id);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <section className="mb-12">
        <SectionHeader title="API keys" />

        {/* Created Key Success Message */}
        {createdKey && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                API Key Created
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => handleCopyKey(createdKey)}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-2">
              Copy this key now. You won't see it again.
            </p>
            <code className="block p-3 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded text-sm font-mono break-all text-gray-800 dark:text-gray-200">
              {createdKey}
            </code>
          </div>
        )}

        {/* API Keys List or Empty State */}
        {keys.length > 0 ? (
          <Card>
            {/* Header with count and action */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {keys.length} API key{keys.length !== 1 && 's'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(true)}
              >
                New API key
              </Button>
            </div>
            {/* Key Items */}
            {keys.map((key, index) => (
              <div
                key={key.id}
                className={cn(
                  'flex items-center justify-between px-4 py-4',
                  index < keys.length - 1 &&
                    'border-b border-gray-200 dark:border-gray-700',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <KeyIcon className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {key.name}
                      </p>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs font-medium rounded',
                          key.scope === 'read-write'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                        )}
                      >
                        {key.scope === 'read-write' ? 'Read & Write' : 'Read'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {key.keyPrefix}... · Created{' '}
                      {format(new Date(key.createdAt), 'MMM d, yyyy')}
                      {key.lastUsedAt &&
                        ` · Last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDeleteKey(key.id)}
                  title="Delete API key"
                >
                  <Trash2Icon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between px-5 py-5">
              <p className="text-sm text-gray-500">No API keys created</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(true)}
              >
                New API key
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* Create API Key Modal */}
      <CreateApiKeyModal
        open={showModal}
        onOpenChange={setShowModal}
        onCreate={handleCreateKey}
      />
    </>
  );
}

function CreateApiKeyModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, scope: 'read' | 'read-write') => void;
}) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'read-write'>('read-write');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setName('');
      setScope('read-write');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), scope);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Key name input */}
          <div>
            <label
              htmlFor={nameId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              Key name
            </label>
            <input
              ref={inputRef}
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A descriptive name for this API key..."
              className="w-full h-10 px-3 text-sm border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>

          {/* Permissions radio group */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              Permissions
            </p>
            <RadioGroup
              value={scope}
              onValueChange={(value) =>
                setScope(value as 'read' | 'read-write')
              }
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="read-write" id="scope-full" />
                <Label htmlFor="scope-full">Full access</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="read" id="scope-read" />
                <Label htmlFor="scope-read">Read only</Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
