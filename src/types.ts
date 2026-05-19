export interface Student {
  id: string;
  name: string;
  nickname?: string;
  preferred?: string[];
  forbidden?: string[];
  separateFrom?: string[];
  forbiddenNeighbors?: string[];
  keepDistantFrom?: string[];
  frontPrefer?: boolean;
  backPrefer?: boolean;
  tall?: boolean;
  height?: 'short' | 'medium' | 'tall';
  preferredRow?: 'front' | 'middle' | 'back' | 'any';
  rowPreference?: 'front' | 'middle' | 'back' | 'any';
  cornerPrefer?: boolean;
  cornerPreference?: boolean;
  notes?: string;
  groups?: string[];
  attendance?: { date: string; status: 'present' | 'absent' | 'late' }[];
  grades?: { id?: string | number, subject: string; grade: number; testName?: string; date: string; category?: 'quiz' | 'midterm' | 'final' | 'homework' | 'other' }[];
  physicalHeight?: number; // cm
  physicalWidth?: number; // cm
  isAlwaysFront?: boolean;
  isAlwaysBack?: boolean;
  isAlwaysMiddle?: boolean;
  birthday?: string; // YYYY-MM-DD
  avatar?: string;
  environmentPreferences?: string[];
  areaPref?: any;
  gender?: string;
  noteTags?: string[];
  pedagogicalDiagnoses?: string[];
  learningAccommodations?: string[];
  ai_pedagogy_recommendation?: string;
  successes?: string;
  pedagogicalReminders?: { id: string, note: string, dueDate: string, completed: boolean }[];
  communications?: { id: string, date: string, type: 'phone' | 'email' | 'letter' | 'meeting', summary: string, toParent: boolean }[];
  documents?: { id: string, title: string, url: string, date: string, type: 'image' | 'pdf' | 'other' }[];
  pastHistory?: { year: string, teacher: string, summary: string, gradesAvg: number }[];
  tasks?: { id: string, title: string, description: string, dueDate: string, status: 'pending' | 'completed', category: 'homework' | 'project' | 'study' | 'other', priority: 'low' | 'medium' | 'high' }[];
  lessons?: { id: string, name: string, day: string, time: string, room?: string }[];
  diagnostics?: { id: string, type: string, description: string, date: string, accommodations: string[] }[];
  status?: string;
  interestLevel?: 'low' | 'medium' | 'high';
  supportNeeded?: 'none' | 'low' | 'medium' | 'high';
  externalId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export type EditMode = 'normal' | 'structure' | 'gapCol' | 'gapRow' | 'lock' | 'obstruction';

export interface ClassroomEvent {
  id: string;
  title: string;
  type: 'field_trip' | 'activity' | 'meeting' | 'important_date';
  date: string;
  description?: string;
  location?: string;
  involvedStudents?: (string | number)[]; // list of student IDs
}

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
  events?: ClassroomEvent[];
  student_points?: Record<string, number>;
  analytics_log?: any[];
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
