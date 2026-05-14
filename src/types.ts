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
  groups?: string[];
  // New fields
  attendance?: { date: string; status: 'present' | 'absent' | 'late' }[];
  grades?: { id?: string | number, subject: string; grade: number; testName?: string; date: string; category?: 'quiz' | 'midterm' | 'final' | 'homework' | 'other' }[];
  physicalHeight?: number; // cm
  physicalWidth?: number; // cm
  isAlwaysFront?: boolean;
  isAlwaysBack?: boolean;
  isAlwaysMiddle?: boolean;
  birthday?: string; // YYYY-MM-DD
  
  // New School Features
  diagnostics?: { id: string, type: string, description: string, date: string, accommodations: string[] }[];
  communications?: { id: string, date: string, type: 'phone' | 'email' | 'letter' | 'meeting', summary: string, toParent: boolean }[];
  documents?: { id: string, title: string, url: string, date: string, type: 'image' | 'pdf' | 'other' }[];
  pastHistory?: { year: string, teacher: string, summary: string, gradesAvg: number }[];
  tasks?: { id: string, title: string, description: string, dueDate: string, status: 'pending' | 'completed', category: 'homework' | 'project' | 'study' | 'other', priority: 'low' | 'medium' | 'high' }[];
  lessons?: { id: string, name: string, day: string, time: string, room?: string }[];
  
  // New fields from prompt
  interestLevel?: 'low' | 'medium' | 'high'; // רמת עניין
  supportNeeded?: 'none' | 'low' | 'medium' | 'high'; // צורך בתמיכה לימודית
  // Migration fields for database integration
  externalId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
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
  teacherDesk?: {
    index: number;
    width: number;
    height: number;
  };
  groups: StudentGroup[];
  showDeskNumbers?: boolean;
  deskHistory?: Record<number, { studentId: string | number | null; timestamp: number }[]>;
  updatedAt: number;
  themeColor?: string;
  campaigns?: Campaign[];
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  targetGoal: number;
  unit: string;
  type: 'individual' | 'team' | 'class';
  status: 'active' | 'completed' | 'draft';
  progress: Record<string, number>; // studentId -> progress value
}

export interface StudentGroup {
  id: string;
  name: string;
  color?: string;
  constraint: 'none' | 'together' | 'separate';
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
