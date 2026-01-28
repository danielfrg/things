import type {
  Area,
  ChecklistItem,
  Heading,
  Project,
  RepeatingRule,
  Tag,
  Task,
} from '../generated/types.gen';

export function formatTaskLine(
  task: Task,
  projectTitleById: Map<string, string>,
): string {
  const parts = [task.title];
  if (task.scheduledDate) parts.push(task.scheduledDate);
  else if (task.deadline) parts.push(`due ${task.deadline}`);
  parts.push(
    task.projectId
      ? (projectTitleById.get(task.projectId) ?? 'Unknown')
      : 'No Project',
  );
  parts.push(`[${task.status}]`);
  return parts.join('  ·  ');
}

export function formatTaskDetail(task: Task): string {
  const parts = [task.title, `[${task.status}]`];
  if (task.scheduledDate) parts.push(`Scheduled: ${task.scheduledDate}`);
  else if (task.deadline) parts.push(`Deadline: ${task.deadline}`);
  return parts.join('  ·  ');
}

export function formatProjectLine(
  project: Project,
  areaTitleById: Map<string, string>,
): string {
  const area = project.areaId
    ? (areaTitleById.get(project.areaId) ?? 'Unknown')
    : 'No Area';
  return [project.title, area, `[${project.status}]`].join('  ·  ');
}

export function formatAreaLine(area: Area): string {
  return area.title;
}

export function formatTagLine(tag: Tag): string {
  return tag.color ? `${tag.title} (${tag.color})` : tag.title;
}

export function formatHeadingLine(
  heading: Heading,
  projectTitleById: Map<string, string>,
): string {
  const project = projectTitleById.get(heading.projectId) ?? 'Unknown';
  const backlog = heading.isBacklog ? ' [backlog]' : '';
  return `${heading.title}  ·  ${project}${backlog}`;
}

export function formatRepeatingLine(rule: RepeatingRule): string {
  const parts = [rule.title, rule.rrule, `next: ${rule.nextOccurrence}`];
  if (rule.status === 'paused') parts.push('[paused]');
  return parts.join('  ·  ');
}

export function formatChecklistLine(item: ChecklistItem): string {
  const check = item.completed ? '[x]' : '[ ]';
  return `${check} ${item.title}`;
}
