export interface Student {
  id: string | number;
  name: string;
  nickname?: string;
  preferred: (string | number)[];
  forbidden: (string | number)[];
  separateFrom: (string | number)[];
  frontPrefer?: boolean;
  backPrefer?: boolean;
  tall?: boolean;
  cornerPrefer?: boolean;
}

export type EditMode = 'normal' | 'structure' | 'gapCol' | 'gapRow';

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
  updatedAt: number;
}

export interface ClassroomState {
  currentConfigId: string;
  configs: ClassroomConfig[];
}
