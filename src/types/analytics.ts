export interface DailyAggregate {
  date: string; // "YYYY-MM-DD"
  sessionCount: number;
  totalSeconds: number;
  avgSessionDuration: number;
}

export interface AnalyticsPeriod {
  startDate: string;
  endDate: string;
  totalSessions: number;
  totalSeconds: number;
  avgSessionDuration: number;
  trend: number; // % change from previous period
  dailyAggregates: DailyAggregate[];
}

export type TimeRange = 'daily' | 'weekly' | 'monthly';
