import type { AreaRecord, ProjectRecord } from '@/db/validation';

interface TaskProjectBadgeProps {
  projectId?: string | null;
  areaId?: string | null;
  projects?: ProjectRecord[];
  areas?: AreaRecord[];
}

export function TaskProjectBadge({
  projectId,
  areaId,
  projects,
  areas,
}: TaskProjectBadgeProps) {
  if (!projectId && !areaId) return null;

  const project = projectId ? projects?.find((p) => p.id === projectId) : null;
  const area = areaId ? areas?.find((a) => a.id === areaId) : null;

  const label = (() => {
    if (project && area) return `${area.title} › ${project.title}`;
    if (project) return project.title;
    if (area) return area.title;
    return null;
  })();

  if (!label) return null;

  return (
    <div className="text-[12px] text-muted-foreground truncate mt-0.5">
      {label}
    </div>
  );
}
