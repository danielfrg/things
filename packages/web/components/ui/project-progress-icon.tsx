import { cn } from '@/lib/utils';

interface ProjectProgressIconProps {
  progress: number;
  size?: number;
  className?: string;
  variant?: 'default' | 'sidebar';
}

export function ProjectProgressIcon({ progress, size = 14, className, variant = 'default' }: ProjectProgressIconProps) {
  const center = size / 2;
  const outerRadius = (size - 2) / 2;
  
  // Sidebar variant: thinner border, bigger inner circle
  // Default variant: thicker border, smaller inner circle
  const strokeWidth = variant === 'sidebar' ? 1.5 : 2;
  const innerRadius = variant === 'sidebar' ? outerRadius - 2 : outerRadius - 3;
  
  // Calculate the arc path for the pie slice
  const angle = (progress / 100) * 360;
  const radians = (angle - 90) * (Math.PI / 180); // Start from top (-90 degrees)
  const x = center + innerRadius * Math.cos(radians);
  const y = center + innerRadius * Math.sin(radians);
  const largeArc = angle > 180 ? 1 : 0;
  
  // Path for the pie slice (from center, to top, arc to end point, back to center)
  const piePath = progress > 0 && progress < 100
    ? `M ${center} ${center} L ${center} ${center - innerRadius} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x} ${y} Z`
    : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn(className)}
    >
      {/* Border circle (always solid) */}
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      {/* Progress fill (inner circle) */}
      {progress > 0 && progress < 100 && (
        <path
          d={piePath}
          fill="currentColor"
        />
      )}
      {/* Full circle fill when 100% */}
      {progress >= 100 && (
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="currentColor"
        />
      )}
    </svg>
  );
}
