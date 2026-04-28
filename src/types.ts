export interface Student {
  id: string | number;
  name: string;
  nickname?: string;
  preferred: (string | number)[];
  forbidden: (string | number)[];
  separateFrom: (string | number)[];
  forbiddenNeighbors: (string | number)[];
  keepDistantFrom: (string | number)[];
  frontPrefer?: boolean;
  backPrefer?: boolean;
  tall?: boolean;
  height?: 'short' | 'medium' | 'tall';
  preferredRow?: 'front' | 'middle' | 'back';
  cornerPrefer?: boolean;
  notes?: string;
  // New fields
  attendance?: { date: string; status: 'present' | 'absent' | 'late' }[];
  grades?: { subject: string; score: number; date: string }[];
  physicalHeight?: number; // cm
  physicalWidth?: number; // cm
  isAlwaysFront?: boolean;
  isAlwaysBack?: boolean;
  isAlwaysMiddle?: boolean;
}

export type EditMode = 'normal' | 'structure' | 'gapCol' | 'gapRow' | 'lock' | 'obstruction';

export interface ClassroomConfig {
  id: string;
  name: string;
  cols: number;
  rows: number;
  students: Student[];
  grid: (string | number | null)[];
  locked: number[];
  hiddenDesks: number[];
  columnGaps: number[];
  rowGaps: number[];
  obstructionZones?: number[]; // indices of desks/cells that are obstructions
  groups?: StudentGroup[];
  showDeskNumbers?: boolean;
  deskHistory?: Record<number, { studentId: string | number | null; timestamp: number }[]>;
  updatedAt: number;
  themeColor?: string;
}

export interface StudentGroup {
  id: string;
  name: string;
  color?: string;
  studentIds: (string | number)[];
  subgroupIds?: string[];
  constraints?: {
    together?: boolean;
    separate?: boolean;
    avoidGroupIds?: string[];
  };
}

export interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  category: 'conflict' | 'unassigned' | 'group' | 'ai';
  studentId?: string | number;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface ClassroomState {
  currentConfigId: string;
  configs: ClassroomConfig[];
  accessibility?: AccessibilitySettings;
}
