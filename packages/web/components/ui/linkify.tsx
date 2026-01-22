import type { ReactNode } from 'react';
import { Fragment } from 'react';

const URL_REGEX =
  /https?:\/\/[^\s<>[\]{}|\\^`"']+(?<![.,;:!?)}\]'"])/g;

interface LinkifyProps {
  children: string;
  className?: string;
}

export function Linkify({ children, className }: LinkifyProps) {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(children)) !== null) {
    if (match.index > last) {
      parts.push(children.slice(last, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-things-blue hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    last = match.index + url.length;
  }

  if (last < children.length) {
    parts.push(children.slice(last));
  }

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </span>
  );
}
