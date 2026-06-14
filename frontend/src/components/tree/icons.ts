import {
  Bot,
  CalendarClock,
  Circle,
  Cpu,
  Database,
  GitBranch,
  Key,
  KeyRound,
  Network,
  PlayCircle,
  ScanSearch,
  Settings2,
  ShieldAlert,
  ShieldOff,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Static map from the `icon` string in phase content (kebab-case lucide
 * names) to the real component. Static so tree-shaking can drop unused
 * icons from the bundle.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  'scan-search': ScanSearch,
  users: Users,
  'key-round': KeyRound,
  bot: Bot,
  'settings-2': Settings2,
  database: Database,
  key: Key,
  'calendar-clock': CalendarClock,
  'play-circle': PlayCircle,
  'git-branch': GitBranch,
  'shield-off': ShieldOff,
  cpu: Cpu,
  'shield-alert': ShieldAlert,
  network: Network,
};

export function getPhaseIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Circle;
  return ICON_MAP[name] ?? Circle;
}
