export interface Session {
  id: string;
  startTime: number; // Unix timestamp (ms)
  endTime: number; // Unix timestamp (ms)
  duration: number; // seconds
  notes: string;
  tags: string[];
  source: 'auto' | 'manual';
}

export interface SessionGroup {
  title: string; // "Today", "Yesterday", "Jan 25, 2026"
  data: Session[];
}
