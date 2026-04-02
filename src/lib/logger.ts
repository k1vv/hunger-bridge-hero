type LogLevel = "debug" | "info" | "warn" | "error";
type UserRole = "vendor" | "ngo" | "admin" | "system";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  role: UserRole;
  action: string;
  details?: Record<string, unknown>;
  error?: string;
  userId?: string;
}

const LOG_COLORS = {
  debug: "color: #6b7280",
  info: "color: #3b82f6",
  warn: "color: #f59e0b",
  error: "color: #ef4444",
};

const ROLE_COLORS = {
  vendor: "color: #8b5cf6; font-weight: bold",
  ngo: "color: #10b981; font-weight: bold",
  admin: "color: #ef4444; font-weight: bold",
  system: "color: #6b7280; font-weight: bold",
};

class Logger {
  private logs: Record<UserRole, LogEntry[]> = {
    vendor: [],
    ngo: [],
    admin: [],
    system: [],
  };
  private maxLogsPerRole = 500;

  private formatConsoleLog(entry: LogEntry): void {
    const roleLabel = `[${entry.role.toUpperCase()}]`;
    const levelLabel = `[${entry.level.toUpperCase()}]`;
    const timestamp = entry.timestamp;

    const baseMessage = `%c${roleLabel} %c${levelLabel} %c${timestamp} - ${entry.action}`;

    if (entry.error) {
      console.groupCollapsed(
        baseMessage,
        ROLE_COLORS[entry.role],
        LOG_COLORS[entry.level],
        "color: #9ca3af"
      );
      console.error("Error:", entry.error);
      if (entry.details) console.log("Details:", entry.details);
      if (entry.userId) console.log("User ID:", entry.userId);
      console.groupEnd();
    } else if (entry.details) {
      console.groupCollapsed(
        baseMessage,
        ROLE_COLORS[entry.role],
        LOG_COLORS[entry.level],
        "color: #9ca3af"
      );
      console.log("Details:", entry.details);
      if (entry.userId) console.log("User ID:", entry.userId);
      console.groupEnd();
    } else {
      console.log(
        baseMessage,
        ROLE_COLORS[entry.role],
        LOG_COLORS[entry.level],
        "color: #9ca3af"
      );
    }
  }

  private addLog(entry: LogEntry): void {
    const roleLogs = this.logs[entry.role];
    roleLogs.push(entry);
    if (roleLogs.length > this.maxLogsPerRole) {
      roleLogs.shift();
    }
    this.formatConsoleLog(entry);
  }

  private createEntry(
    level: LogLevel,
    role: UserRole,
    action: string,
    details?: Record<string, unknown>,
    error?: string,
    userId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      role,
      action,
      details,
      error,
      userId,
    };
  }

  // Vendor logging methods
  vendor = {
    debug: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("debug", "vendor", action, details, undefined, userId)),
    info: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("info", "vendor", action, details, undefined, userId)),
    warn: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("warn", "vendor", action, details, undefined, userId)),
    error: (action: string, error: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("error", "vendor", action, details, error, userId)),
  };

  // NGO logging methods
  ngo = {
    debug: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("debug", "ngo", action, details, undefined, userId)),
    info: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("info", "ngo", action, details, undefined, userId)),
    warn: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("warn", "ngo", action, details, undefined, userId)),
    error: (action: string, error: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("error", "ngo", action, details, error, userId)),
  };

  // Admin logging methods
  admin = {
    debug: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("debug", "admin", action, details, undefined, userId)),
    info: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("info", "admin", action, details, undefined, userId)),
    warn: (action: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("warn", "admin", action, details, undefined, userId)),
    error: (action: string, error: string, details?: Record<string, unknown>, userId?: string) =>
      this.addLog(this.createEntry("error", "admin", action, details, error, userId)),
  };

  // System logging methods
  system = {
    debug: (action: string, details?: Record<string, unknown>) =>
      this.addLog(this.createEntry("debug", "system", action, details)),
    info: (action: string, details?: Record<string, unknown>) =>
      this.addLog(this.createEntry("info", "system", action, details)),
    warn: (action: string, details?: Record<string, unknown>) =>
      this.addLog(this.createEntry("warn", "system", action, details)),
    error: (action: string, error: string, details?: Record<string, unknown>) =>
      this.addLog(this.createEntry("error", "system", action, details, error)),
  };

  // Get all logs
  getLogs(): Record<UserRole, LogEntry[]> {
    return { ...this.logs };
  }

  // Get logs filtered by role
  getLogsByRole(role: UserRole): LogEntry[] {
    return [...this.logs[role]];
  }

  // Get logs filtered by level
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return [
      ...this.logs.vendor,
      ...this.logs.ngo,
      ...this.logs.admin,
      ...this.logs.system,
    ].filter((log) => log.level === level);
  }

  // Get error logs only
  getErrors(): LogEntry[] {
    return this.getLogsByLevel("error");
  }

  // Clear logs for a specific role
  clearLogsByRole(role: UserRole): void {
    this.logs[role] = [];
    console.log(`%c[LOGGER] ${role} logs cleared`, "color: #6b7280");
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = { vendor: [], ngo: [], admin: [], system: [] };
    this.errorCount = 0;
    console.log("%c[LOGGER] All logs cleared", "color: #6b7280");
  }

  // Export logs as JSON string
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Export logs for a specific role as JSON string
  exportLogsByRole(role: UserRole): string {
    return JSON.stringify(this.logs[role], null, 2);
  }

  // Print summary to console
  printSummary(): void {
    const summary = {
      total:
        this.logs.vendor.length +
        this.logs.ngo.length +
        this.logs.admin.length +
        this.logs.system.length,
      byRole: {
        vendor: this.logs.vendor.length,
        ngo: this.logs.ngo.length,
        admin: this.logs.admin.length,
        system: this.logs.system.length,
      },
      errorsByRole: {
        vendor: this.logs.vendor.filter((l) => l.level === "error").length,
        ngo: this.logs.ngo.filter((l) => l.level === "error").length,
        admin: this.logs.admin.filter((l) => l.level === "error").length,
        system: this.logs.system.filter((l) => l.level === "error").length,
      },
    };
    console.log("%c[LOGGER] Summary:", "color: #3b82f6; font-weight: bold", summary);
  }
}

export const logger = new Logger();

// Expose to window for debugging in browser console
if (typeof window !== "undefined") {
  (window as any).logger = logger;
}
