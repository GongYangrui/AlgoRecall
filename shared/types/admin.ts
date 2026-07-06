export interface AdminOverview {
  userCount: number;
  problemCount: number;
  reviewCount: number;
  activeUsers24h: number;
  errorCount24h: number;
  dbConnected: boolean;
  appUptime: number;
}

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "audit";
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
  metadata?: Record<string, unknown>;
}

export interface AdminHealthStatus {
  dbConnected: boolean;
  recentErrorCount: number;
  appUptime: number;
}
