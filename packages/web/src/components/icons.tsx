import {
  Archive,
  BookCheck,
  Box,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  CloudOff,
  Copy,
  FileText,
  Flag,
  FolderOpen,
  GripVertical,
  Inbox,
  Info,
  Key,
  Layers,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  SeparatorHorizontal,
  Settings,
  Settings2,
  Star,
  Sun,
  Tag,
  Trash2,
  X,
} from "lucide-solid"
import type { ComponentProps } from "solid-js"

// Re-export base icons from lucide-solid
export {
  Archive as ArchiveIcon,
  BookCheck as BookCheckIcon,
  Box as BoxIcon,
  Calendar as CalendarIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronUp as ChevronUpIcon,
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
  Copy as CopyIcon,
  FileText as FileTextIcon,
  Flag as FlagIcon,
  FolderOpen as FolderOpenIcon,
  GripVertical as GripVerticalIcon,
  Inbox as InboxIcon,
  Info as InfoIcon,
  Key as KeyIcon,
  Layers as LayersIcon,
  ListChecks as ListChecksIcon,
  LogOut as LogOutIcon,
  Monitor as MonitorIcon,
  Moon as MoonIcon,
  MoreHorizontal as MoreHorizontalIcon,
  Pause as PauseIcon,
  Pencil as PencilIcon,
  Play as PlayIcon,
  Plus as PlusIcon,
  Repeat as RepeatIcon,
  RotateCcw as RestoreIcon,
  Search as SearchIcon,
  SeparatorHorizontal as SeparatorHorizontalIcon,
  Settings as SettingsIcon,
  Settings2 as Settings2Icon,
  Star as StarIcon,
  Sun as SunIcon,
  Tag as TagIcon,
  Trash2 as Trash2Icon,
  X as XIcon,
}

type IconProps = ComponentProps<"svg">

/** Filled star icon for Today view (sidebar and header) */
export function TodayStarIcon(props: IconProps) {
  return <Star fill="#ffd400" color="#ffd400" {...props} />
}

/** Evening icon - moon with fill */
export function EveningIcon(props: IconProps) {
  return <Moon fill="#80a4d6" color="#80a4d6" {...props} />
}

/** Someday icon - archive with beige stroke */
export function SomedayIcon(props: IconProps) {
  return <Archive stroke-width={2} color="#ccbf7e" {...props} />
}

/** Inbox icon for sidebar/header */
export function TodayInboxIcon(props: IconProps) {
  return <Inbox {...props} />
}

/** Calendar icon for Upcoming view */
export function UpcomingCalendarIcon(props: IconProps) {
  return <Calendar {...props} />
}

/** Book check icon for Logbook view */
export function LogbookIcon(props: IconProps) {
  return <BookCheck {...props} />
}

/** Trash icon for Trash view */
export function TrashIcon(props: IconProps) {
  return <Trash2 {...props} />
}
