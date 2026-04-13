export interface TimeBlock {
  id: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  pwmValue: number;        // 0-255
  sessionLimit: number | null;
  sessionDuration: number | null; // seconds (null = don't override device default)
  locked: boolean;
}

export interface DaySchedule {
  day: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  blocks: TimeBlock[];
}

export interface ScheduleContextValue {
  schedules: DaySchedule[];
  activeBlock: TimeBlock | null;
  addBlock: (day: number, block: Omit<TimeBlock, 'id'>) => Promise<void>;
  updateBlock: (day: number, blockId: string, updates: Partial<Omit<TimeBlock, 'id'>>) => Promise<void>;
  deleteBlock: (day: number, blockId: string) => Promise<void>;
}
