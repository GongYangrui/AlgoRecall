export interface AdminOverview {
  userCount: number;
  problemCount: number;
  reviewCount: number;
  todayActiveUsers: number;
  activeUsers7d: number;
  todayStartedItems: number;
  todayReviews: number;
  errorCount24h: number;
  dbConnected: boolean;
  appUptime: number;
}

export interface AdminDailyMetric {
  date: string;
  activeUsers: number;
  startedItems: number;
  reviews: number;
  errors: number;
}

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "audit";
  source: "server" | "client" | "system";
  event: string;
  message: string;
  errorName?: string;
  errorStack?: string;
  errorCause?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  appVersion?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminHealthStatus {
  dbConnected: boolean;
  recentErrorCount: number;
  appUptime: number;
}
