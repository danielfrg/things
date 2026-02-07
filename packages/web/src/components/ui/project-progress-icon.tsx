import type { JSX } from 'solid-js';
import { cn } from '@/lib/utils';

interface ProjectProgressIconProps {
  progress: number;
  size?: number;
  class?: string;
  variant?: 'default' | 'sidebar';
}

export function ProjectProgressIcon(props: ProjectProgressIconProps): JSX.Element {
  const size = () => props.size ?? 14;
  const variant = () => props.variant ?? 'default';
  const center = () => size() / 2;
  const outerRadius = () => (size() - 2) / 2;

  // Sidebar variant: thinner border, bigger inner circle
  // Default variant: thicker border, smaller inner circle
  const strokeWidth = () => (variant() === 'sidebar' ? 1.5 : 2);
  const innerRadius = () =>
    variant() === 'sidebar' ? outerRadius() - 2 : outerRadius() - 3;

  // Calculate the arc path for the pie slice
  const angle = () => (props.progress / 100) * 360;
  const radians = () => (angle() - 90) * (Math.PI / 180); // Start from top (-90 degrees)
  const x = () => center() + innerRadius() * Math.cos(radians());
  const y = () => center() + innerRadius() * Math.sin(radians());
  const largeArc = () => (angle() > 180 ? 1 : 0);

  // Path for the pie slice (from center, to top, arc to end point, back to center)
  const piePath = () =>
    props.progress > 0 && props.progress < 100
      ? `M ${center()} ${center()} L ${center()} ${center() - innerRadius()} A ${innerRadius()} ${innerRadius()} 0 ${largeArc()} 1 ${x()} ${y()} Z`
      : '';

  return (
    <svg
      width={size()}
      height={size()}
      viewBox={`0 0 ${size()} ${size()}`}
      class={cn(props.class)}
    >
      {/* Border circle (always solid) */}
      <circle
        cx={center()}
        cy={center()}
        r={outerRadius()}
        fill="none"
        stroke="currentColor"
        stroke-width={strokeWidth()}
      />
      {/* Progress fill (inner circle) */}
      {props.progress > 0 && props.progress < 100 && (
        <path d={piePath()} fill="currentColor" />
      )}
      {/* Full circle fill when 100% */}
      {props.progress >= 100 && (
        <circle
          cx={center()}
          cy={center()}
          r={innerRadius()}
          fill="currentColor"
        />
      )}
    </svg>
  );
}
