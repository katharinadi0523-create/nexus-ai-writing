import {
  Brain,
  Briefcase,
  ClipboardList,
  Droplets,
  FileCheck2,
  GitBranch,
  LineChart,
  Radar,
  Sparkles,
  Stamp,
  type LucideIcon,
} from 'lucide-react';
import { AgentCategory } from '../constants/scenarioData';

const SCENARIO_ICON_MAP: Record<string, LucideIcon> = {
  radar: Radar,
  stamp: Stamp,
  droplets: Droplets,
  clipboard: ClipboardList,
  'line-chart': LineChart,
  'file-check': FileCheck2,
  briefcase: Briefcase,
};

export function getCategoryIcon(category: AgentCategory): LucideIcon {
  switch (category) {
    case 'PLANNING':
      return Brain;
    case 'WORKFLOW':
      return GitBranch;
    default:
      return Sparkles;
  }
}

export function getScenarioIcon(
  iconKey: string | undefined,
  category: AgentCategory
): LucideIcon {
  if (iconKey && iconKey in SCENARIO_ICON_MAP) {
    return SCENARIO_ICON_MAP[iconKey];
  }

  return getCategoryIcon(category);
}

export function getCategoryIconTone(category: AgentCategory): {
  containerClassName: string;
  iconClassName: string;
} {
  switch (category) {
    case 'PLANNING':
      return {
        containerClassName: 'bg-purple-100',
        iconClassName: 'text-purple-600',
      };
    case 'WORKFLOW':
      return {
        containerClassName: 'bg-blue-100',
        iconClassName: 'text-blue-600',
      };
    default:
      return {
        containerClassName: 'bg-yellow-100',
        iconClassName: 'text-yellow-500',
      };
  }
}
