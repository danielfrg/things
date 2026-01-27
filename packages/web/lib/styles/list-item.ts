import { cva } from 'class-variance-authority';

export const listItemVariants = cva(
  'flex items-center gap-2 px-4 md:px-2 py-2 md:rounded-md transition-all duration-300 ease-in-out overflow-hidden',
  {
    variants: {
      selected: {
        true: '',
        false: 'hover:bg-secondary/50',
      },
      expanded: {
        true: 'pt-4 pb-2',
        false: 'py-3 md:py-2 cursor-grab',
      },
      dragging: {
        true: 'opacity-40 cursor-grabbing',
        false: '',
      },
    },
    compoundVariants: [
      {
        selected: true,
        expanded: false,
        className: 'bg-task-selected',
      },
    ],
    defaultVariants: {
      selected: false,
      expanded: false,
      dragging: false,
    },
  },
);
