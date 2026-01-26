import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { KeyIcon, Trash2Icon, XIcon } from '@/components/icons';
import { Card, SectionHeader } from '@/components/settings/AccountSection';
import { Radio } from '@/components/ui/radio';
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
              <button
                type="button"
                onClick={() => handleCopyKey(createdKey)}
                className="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
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
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                New API key
              </button>
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
                <button
                  type="button"
                  onClick={() => handleDeleteKey(key.id)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Delete API key"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between px-5 py-5">
              <p className="text-sm text-gray-500">No API keys created</p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                New API key
              </button>
            </div>
          </Card>
        )}
      </section>

      {/* Create API Key Modal */}
      {showModal && (
        <CreateApiKeyModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreateKey}
        />
      )}
    </>
  );
}

function CreateApiKeyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, scope: 'read' | 'read-write') => void;
}) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'read-write'>('read-write');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), scope);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit}>
          {/* Key name input */}
          <div className="mb-6">
            <label
              htmlFor={nameId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
              className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-things-blue focus:border-things-blue transition-shadow"
            />
          </div>

          {/* Permissions radio group */}
          <div className="mb-8">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Permissions
              </p>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setScope('read-write')}
                className="flex items-center gap-3 w-full text-left"
              >
                <Radio
                  checked={scope === 'read-write'}
                  onChange={() => setScope('read-write')}
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  Full access
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScope('read')}
                className="flex items-center gap-3 w-full text-left"
              >
                <Radio
                  checked={scope === 'read'}
                  onChange={() => setScope('read')}
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  Read only
                </span>
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-things-blue rounded-md hover:bg-things-blue/90 shadow-sm shadow-things-blue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
