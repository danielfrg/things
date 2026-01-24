import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BoxIcon,
  CheckIcon,
  FolderOpenIcon,
  InboxIcon,
  XIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { ProjectProgressIcon } from './project-progress-icon';

interface Project {
  id: string;
  title: string;
  areaId?: string | null;
}

interface Area {
  id: string;
  title: string;
}

interface MovePickerProps {
  value: string | null | undefined;
  areaValue?: string | null | undefined;
  onChange: (projectId: string | null, areaId?: string | null) => void;
  projects: Project[];
  areas?: Area[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MovePicker({
  value,
  areaValue,
  onChange,
  projects,
  areas = [],
  placeholder,
  disabled,
  className,
}: MovePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === value),
    [projects, value]
  );

  const selectedArea = useMemo(
    () => areas.find((a) => a.id === areaValue),
    [areas, areaValue]
  );

  const displayText = useMemo(() => {
    if (selectedProject) return selectedProject.title;
    if (selectedArea) return selectedArea.title;
    return placeholder ?? 'Move to...';
  }, [selectedProject, selectedArea, placeholder]);

  const handleSelectProject = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    onChange(projectId, project?.areaId ?? null);
    setOpen(false);
  }, [projects, onChange]);

  const handleSelectArea = useCallback((areaId: string) => {
    onChange(null, areaId);
    setOpen(false);
  }, [onChange]);

  const handleSelectInbox = useCallback(() => {
    onChange(null, null);
    setOpen(false);
  }, [onChange]);

  const handleSelectNoProject = useCallback(() => {
    onChange(null, areaValue);
    setOpen(false);
  }, [onChange, areaValue]);

  const projectsWithoutArea = useMemo(
    () => projects.filter((p) => !p.areaId),
    [projects]
  );

  const areasWithProjects = useMemo(
    () => areas.map((area) => ({
      ...area,
      projects: projects.filter((p) => p.areaId === area.id),
    })),
    [areas, projects]
  );

  const isInbox = !value && !areaValue;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const getPopoverStyle = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth < 768;

    // On mobile, center the popover
    if (isMobile) {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      };
    }

    if (!triggerRef.current) return {};
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 320;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const showAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    return {
      position: 'fixed' as const,
      top: showAbove ? 'auto' : `${rect.bottom + 4}px`,
      bottom: showAbove ? `${viewportHeight - rect.top + 4}px` : 'auto',
      left: `${rect.left}px`,
      zIndex: 50,
    };
  }, []);

  const renderIcon = () => {
    if (selectedProject) {
      return <ProjectProgressIcon progress={0} size={14} className="text-popover-dark-selected opacity-70" />;
    }
    if (selectedArea) {
      return <BoxIcon className="h-3.5 w-3.5 text-things-green opacity-70" />;
    }
    return <FolderOpenIcon className="h-3.5 w-3.5 opacity-70" />;
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1 text-sm transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onClick={() => setOpen(!open)}
      >
        {renderIcon()}
        <span className="truncate">{displayText}</span>
      </button>

      {open && createPortal(
        <>
          {/* Mobile backdrop - captures taps to close popover without affecting task */}
          <div
            data-popover
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          />
          <div
            ref={popoverRef}
            data-popover
            className="w-[260px] md:w-[260px] max-md:w-[calc(100vw-32px)] rounded-xl bg-popover-dark overflow-hidden z-50"
            style={getPopoverStyle()}
          >
          {/* Header with title and close button */}
          <div className="flex items-center justify-center relative px-3 pt-3 max-md:pt-4 pb-2">
            <h3 className="text-sm max-md:text-base font-semibold text-popover-dark-foreground">Move</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="hidden max-md:flex items-center justify-center w-8 h-8 rounded-full text-popover-dark-muted hover:text-popover-dark-foreground hover:bg-popover-dark-accent transition-colors absolute right-3"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-80 max-md:max-h-[70vh] overflow-y-auto overscroll-contain py-2 max-md:py-3">
            <button
              type="button"
              onClick={handleSelectInbox}
              className={cn(
                'flex items-center gap-2 w-full h-[30px] max-md:h-[44px] px-3 text-[14px] max-md:text-base font-bold text-white',
                'hover:bg-popover-dark-accent transition-colors',
              )}
            >
              <InboxIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-muted" />
              <span className="flex-1 text-left">Inbox</span>
              {isInbox && <CheckIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-selected" />}
            </button>

            <button
              type="button"
              onClick={handleSelectNoProject}
              className={cn(
                'flex items-center gap-2 w-full h-[30px] max-md:h-[44px] px-3 text-[14px] max-md:text-base font-bold text-white',
                'hover:bg-popover-dark-accent transition-colors',
              )}
            >
              <XIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-muted" />
              <span className="flex-1 text-left">No Project</span>
              {!value && areaValue && <CheckIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-selected" />}
            </button>

            <div className="my-1 border-t border-popover-dark-border" />

            {projectsWithoutArea.length > 0 && (
              <>
                {projectsWithoutArea.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelectProject(project.id)}
                    className={cn(
                      'flex items-center gap-2 w-full h-[30px] max-md:h-[44px] px-3 text-[14px] max-md:text-base font-semibold text-white',
                      'hover:bg-popover-dark-accent transition-colors',
                    )}
                  >
                    <ProjectProgressIcon
                      progress={0}
                      size={14}
                      className="text-popover-dark-selected max-md:scale-125"
                    />
                    <span className="flex-1 text-left truncate">
                      {project.title}
                    </span>
                    {value === project.id && <CheckIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-selected" />}
                  </button>
                ))}
              </>
            )}

            {areasWithProjects.map((area, index) => (
              <div key={area.id}>
                {(index > 0 || projectsWithoutArea.length > 0) && (
                  <div className="my-1 border-t border-popover-dark-border" />
                )}

                <button
                  type="button"
                  onClick={() => handleSelectArea(area.id)}
                  className={cn(
                    'flex items-center gap-2 w-full h-[30px] max-md:h-[44px] px-3 text-[14px] max-md:text-base font-extrabold text-white',
                    'hover:bg-popover-dark-accent transition-colors',
                  )}
                >
                  <BoxIcon className="w-[14px] h-[14px] max-md:w-[18px] max-md:h-[18px] text-things-green" />
                  <span className="flex-1 text-left truncate">{area.title}</span>
                  {!value && areaValue === area.id && (
                    <CheckIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-selected" />
                  )}
                </button>

                {area.projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelectProject(project.id)}
                    className={cn(
                      'flex items-center gap-2 w-full h-[30px] max-md:h-[44px] px-3 text-[14px] max-md:text-base font-semibold text-white',
                      'hover:bg-popover-dark-accent transition-colors',
                    )}
                  >
                    <ProjectProgressIcon
                      progress={0}
                      size={14}
                      className="text-popover-dark-selected max-md:scale-125"
                    />
                    <span className="flex-1 text-left truncate">
                      {project.title}
                    </span>
                    {value === project.id && <CheckIcon className="w-4 h-4 max-md:w-5 max-md:h-5 text-popover-dark-selected" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}

export const ProjectPicker = MovePicker;
