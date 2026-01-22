import { cn } from '@/lib/utils';

interface ProjectProgressIconProps {
  progress: number;
  size?: number;
  className?: string;
}

export function ProjectProgressIcon({ progress, size = 14, className }: ProjectProgressIconProps) {
  const radius = (size - 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('transform -rotate-90', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.2"
      />
      {progress > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={String(circumference)}
          strokeDashoffset={String(strokeDashoffset)}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
