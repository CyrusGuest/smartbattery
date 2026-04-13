import { format, isToday, isYesterday, parseISO } from 'date-fns';

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const formatTime = (timestamp: number): string => {
  return format(new Date(timestamp), 'h:mm a');
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMM d, yyyy');
};

export const formatDateShort = (dateStr: string): string => {
  const date = parseISO(dateStr);
  return format(date, 'MMM d');
};

export const getDateKey = (timestamp: number): string => {
  return format(new Date(timestamp), 'yyyy-MM-dd');
};

