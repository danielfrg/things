import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as rrulePkg from 'rrule';

// Handle both ESM and CJS module formats
const RRule = (rrulePkg as any).RRule ?? (rrulePkg as any).default?.RRule;

import {
  InfoIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  Trash2Icon,
} from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MovePicker } from '@/components/ui/move-picker';
import { ProseEditor } from '@/components/ui/prose-editor';
import { RepeatPicker } from '@/components/ui/repeat-picker';
import { TagPicker } from '@/components/ui/tag-picker';
import {
  ToolbarButton,
  toolbarButtonVariants,
} from '@/components/ui/toolbar-button';
import { generateId } from '@/db/schema';
import type {
  AreaRecord,
  ProjectRecord,
  RepeatingRuleRecord,
  TagRecord,
} from '@/db/validation';
import {
  useAreas,
  useDeleteRepeatingRule,
  useProjects,
  useTags,
  useUpdateRepeatingRule,
} from '@/lib/hooks/useData';
import { useDetailCard } from '@/lib/hooks/useDetailCard';
import { useTaskEditorForm } from '@/lib/hooks/useTaskEditorForm';
import { cn, parseLocalDate } from '@/lib/utils';
import { ChecklistEditor, type ChecklistItem } from './ChecklistEditor';
import { ItemDetailLayout } from './ItemDetailLayout';

function computeNextOccurrences(
  rruleStr: string,
  startDate: string,
  count: number,
): string[] {
  try {
    const start = new Date(`${startDate}T00:00:00Z`);
    const rule = RRule.fromString(rruleStr);
    const options = { ...rule.options, dtstart: start };
    const ruleWithStart = new RRule(options);

    const occurrences = ruleWithStart.all(
      (_date: Date, i: number) => i < count,
    );

    return occurrences.map((d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
  } catch {
    return [];
  }
}

interface TemplateCardProps {
  template: RepeatingRuleRecord;
  expanded: boolean;
  selected: boolean;
  onSelect: (templateId: string | null) => void;
  onExpand: (templateId: string) => void;
  onDelete?: (templateId: string) => void;
  projects?: ProjectRecord[];
  areas?: AreaRecord[];
  allTags?: TagRecord[];
  showNextDate?: boolean;
}

export function TemplateCard({
  template,
  expanded,
  selected,
  onSelect,
  onExpand,
  onDelete,
  projects: propProjects,
  areas: propAreas,
  allTags: propTags,
  showNextDate,
}: TemplateCardProps) {
  const updateRule = useUpdateRepeatingRule();
  const deleteRule = useDeleteRepeatingRule();

  // Parse checklist from JSON, ensuring each item has an id
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (!template.checklistTemplate) return [];
    const parsed = JSON.parse(template.checklistTemplate) as Array<{
      title: string;
      id?: string;
    }>;
    return parsed.map((item, idx) => ({
      id: item.id ?? generateId(),
      title: item.title,
      completed: false,
      position: idx + 1,
    }));
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const lastTemplateIdRef = useRef(template.id);

  const { showInfo, setShowInfo, handleClose } = useDetailCard({
    id: template.id,
    expanded,
    onExpand,
    cardRef,
    dataAttribute: 'data-template-detail-card',
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const projectsResource = useProjects();
  const areasResource = useAreas();
  const tagsResource = useTags();

  const projects = useMemo(
    () =>
      propProjects ??
      projectsResource.data.filter((p) => p.status === 'active'),
    [propProjects, projectsResource.data],
  );
  const areas = useMemo(
    () => propAreas ?? areasResource.data,
    [propAreas, areasResource.data],
  );
  const allTags = useMemo(
    () => propTags ?? tagsResource.data,
    [propTags, tagsResource.data],
  );

  // Parse tags template
  const selectedTagIds = useMemo(() => {
    const tmpl = template.tagsTemplate;
    if (!tmpl) return [];
    try {
      return JSON.parse(tmpl) as string[];
    } catch {
      return [];
    }
  }, [template.tagsTemplate]);

  const form = useTaskEditorForm({
    initialTitle: template.title,
    initialNotes: template.notes ?? '',
    onTitleChange: (title) =>
      updateRule.mutate({ id: template.id, updates: { title } }),
    onNotesChange: (notes) =>
      updateRule.mutate({ id: template.id, updates: { notes } }),
    onClose: handleClose,
  });

  // Sync checklist when template ID changes
  useEffect(() => {
    if (template.id !== lastTemplateIdRef.current) {
      lastTemplateIdRef.current = template.id;
      if (template.checklistTemplate) {
        const parsed = JSON.parse(template.checklistTemplate) as Array<{
          title: string;
          id?: string;
        }>;
        setChecklist(
          parsed.map((item, idx) => ({
            id: item.id ?? generateId(),
            title: item.title,
            completed: false,
            position: idx + 1,
          })),
        );
      } else {
        setChecklist([]);
      }
    }
  }, [template.id, template.checklistTemplate]);

  // Focus title input when expanded
  useEffect(() => {
    if (expanded) {
      form.focusTitle();
    }
  }, [expanded, form.focusTitle]);

  const nextOccurrences = useMemo(
    () => computeNextOccurrences(template.rrule, template.nextOccurrence, 4),
    [template.rrule, template.nextOccurrence],
  );

  const formattedOccurrences = useMemo(
    () =>
      nextOccurrences.map((dateStr) => {
        const date = parseLocalDate(dateStr);
        return format(date, 'MMM d');
      }),
    [nextOccurrences],
  );

  const handleChecklistChange = useCallback(
    (items: ChecklistItem[]) => {
      setChecklist(items);
      // Convert to storage format (just titles for templates)
      const storageItems = items
        .filter((item) => item.title.trim() !== '')
        .map((item) => ({ id: item.id, title: item.title }));
      updateRule.mutate({
        id: template.id,
        updates: {
          checklistTemplate: storageItems.length
            ? JSON.stringify(storageItems)
            : null,
        },
      });
    },
    [template.id, updateRule],
  );

  const handleRepeatChange = useCallback(
    (rrule: string | undefined, startDate: string) => {
      if (!rrule) return;
      updateRule.mutate({
        id: template.id,
        updates: { rrule, nextOccurrence: startDate },
      });
    },
    [template.id, updateRule],
  );

  const handleMoveChange = useCallback(
    (projectId: string | null, areaId?: string | null) => {
      updateRule.mutate({
        id: template.id,
        updates: { projectId, areaId: areaId ?? null, headingId: null },
      });
    },
    [template.id, updateRule],
  );

  const handleTagAdd = useCallback(
    (tagId: string) => {
      if (selectedTagIds.includes(tagId)) return;
      const next = [...selectedTagIds, tagId];
      updateRule.mutate({
        id: template.id,
        updates: { tagsTemplate: JSON.stringify(next) },
      });
    },
    [selectedTagIds, template.id, updateRule],
  );

  const handleTagRemove = useCallback(
    (tagId: string) => {
      const next = selectedTagIds.filter((id) => id !== tagId);
      updateRule.mutate({
        id: template.id,
        updates: { tagsTemplate: next.length ? JSON.stringify(next) : null },
      });
    },
    [selectedTagIds, template.id, updateRule],
  );

  const handlePauseResume = useCallback(() => {
    const status = template.status === 'active' ? 'paused' : 'active';
    updateRule.mutate({ id: template.id, updates: { status } });
  }, [template.status, template.id, updateRule]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(template.id);
    } else {
      deleteRule.mutate(template.id);
    }
    handleClose();
    setShowDeleteDialog(false);
  }, [onDelete, template.id, deleteRule, handleClose]);

  const isPaused = template.status === 'paused';

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if ((e.target as HTMLElement).closest('textarea')) return;
    if ((e.target as HTMLElement).closest('.prose-editor')) return;
    onExpand(template.id);
  };

  const headerContent = (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'flex items-center gap-2 px-4 pb-2 transition-all duration-300 ease-in-out md:rounded-md overflow-hidden',
        expanded ? 'pt-4' : 'py-3 md:py-2 md:cursor-grab',
        !expanded && selected && 'bg-task-selected',
        !expanded && !selected && 'hover:bg-secondary/50',
      )}
      onClick={() => !expanded && onSelect(template.id)}
      onKeyDown={(e) => {
        if (!expanded && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(template.id);
        }
      }}
    >
      <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center text-muted-foreground">
        <RepeatIcon className="w-4 h-4" />
      </span>

      {expanded ? (
        <Input
          ref={form.titleRef}
          variant="ghost"
          type="text"
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          onBlur={form.handleTitleBlur}
          onKeyDown={form.handleTitleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex-1 text-lg md:text-[15px] leading-tight',
            'text-foreground caret-things-blue',
            isPaused && 'text-muted-foreground',
          )}
          placeholder="Template title"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          className="flex-1 min-w-0"
          onClick={() => onSelect(template.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(template.id);
            }
          }}
        >
          <span
            className={cn(
              'block text-lg md:text-[15px] leading-tight truncate',
              'text-foreground',
              isPaused && 'text-muted-foreground',
            )}
          >
            {form.title}
          </span>
        </div>
      )}

      {isPaused && (
        <span className="text-xs text-amber-600 font-medium px-2">Paused</span>
      )}

      {/* Next occurrence - only shown when collapsed */}
      {!expanded && showNextDate && (
        <span className="text-xs text-muted-foreground">
          {format(parseLocalDate(template.nextOccurrence), 'MMM d')}
        </span>
      )}
    </div>
  );

  const toolbarContent = (
    <>
      {/* Repeat picker (change schedule) */}
      <RepeatPicker
        value={template.rrule}
        startDate={template.nextOccurrence}
        onChange={handleRepeatChange}
        onClear={() => {
          // Templates always have repeat
        }}
        placeholder="Schedule"
        className={toolbarButtonVariants()}
      />

      {/* Move picker */}
      {projects.length > 0 && (
        <MovePicker
          value={template.projectId}
          areaValue={template.areaId}
          onChange={handleMoveChange}
          projects={projects}
          areas={areas}
          placeholder="Move"
          className={toolbarButtonVariants()}
        />
      )}

      {/* Tags picker */}
      {allTags.length > 0 && (
        <TagPicker
          selectedTagIds={selectedTagIds}
          tags={allTags}
          onAdd={handleTagAdd}
          onRemove={handleTagRemove}
        />
      )}

      {/* Pause/Resume button */}
      <ToolbarButton
        onClick={handlePauseResume}
        intent={isPaused ? 'success' : 'warning'}
        icon={
          isPaused ? (
            <PlayIcon className="w-3.5 h-3.5" />
          ) : (
            <PauseIcon className="w-3.5 h-3.5" />
          )
        }
      >
        {isPaused ? 'Resume' : 'Pause'}
      </ToolbarButton>
    </>
  );

  const footerContent = (
    <>
      {/* Info button */}
      <div className="relative flex items-center">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(!showInfo);
          }}
          className="text-hint hover:text-muted-foreground hover:bg-secondary"
        >
          <InfoIcon className="w-3.5 h-3.5" />
        </Button>

        {/* Info popover */}
        {showInfo && (
          <div
            role="dialog"
            className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-popover rounded-lg shadow-lg border border-border text-[12px] z-50"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5 text-notes">
              <div>
                <span className="text-muted-foreground">Created:</span>{' '}
                {format(template.createdAt, 'PPP p')}
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>{' '}
                {format(template.updatedAt, 'PPP p')}
              </div>
              <div className="pt-1.5 border-t border-border">
                <span className="text-muted-foreground">ID:</span>{' '}
                <code className="text-[10px] bg-secondary px-1 py-0.5 rounded select-all">
                  {template.id}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setShowDeleteDialog(true)}
        className="text-hint hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2Icon className="w-3.5 h-3.5" />
      </Button>
    </>
  );

  return (
    <>
      <ItemDetailLayout
        expanded={expanded}
        cardRef={cardRef}
        dataAttribute="data-template-detail-card"
        onDoubleClick={handleDoubleClick}
        header={headerContent}
        toolbar={toolbarContent}
        toolbarPrefix={
          formattedOccurrences.length > 0 && (
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground pl-2">
              <span>Next: {formattedOccurrences.join(', ')}</span>
            </div>
          )
        }
        footer={footerContent}
      >
        {/* Notes Section */}
        <div className="relative min-h-[26px]">
          <ProseEditor
            value={form.notes}
            onChange={form.setNotes}
            onBlur={form.handleNotesBlur}
            placeholder="Notes"
            isEditing={form.isEditingNotes}
            onStartEditing={() => form.setIsEditingNotes(true)}
          />
        </div>

        {/* Checklist Section */}
        <ChecklistEditor
          items={checklist}
          variant="inline"
          mode="controlled"
          onChange={handleChecklistChange}
        />
      </ItemDetailLayout>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this repeating template? Spawned tasks will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
