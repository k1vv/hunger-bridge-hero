import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger } from "./logger";

// Mock console methods to avoid cluttering test output
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
vi.spyOn(console, "groupEnd").mockImplementation(() => {});

describe("Logger", () => {
  beforeEach(() => {
    // Clear all logs before each test
    logger.clearLogs();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Vendor Logging Tests
  // ============================================================================
  describe("vendor logging", () => {
    it("logs vendor debug message", () => {
      logger.vendor.debug("Test debug action");
      const logs = logger.getLogsByRole("vendor");

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("debug");
      expect(logs[0].role).toBe("vendor");
      expect(logs[0].action).toBe("Test debug action");
    });

    it("logs vendor info message with details", () => {
      logger.vendor.info("Test info action", { key: "value" }, "user123");
      const logs = logger.getLogsByRole("vendor");

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("info");
      expect(logs[0].details).toEqual({ key: "value" });
      expect(logs[0].userId).toBe("user123");
    });

    it("logs vendor warn message", () => {
      logger.vendor.warn("Test warning");
      const logs = logger.getLogsByRole("vendor");

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("warn");
    });

    it("logs vendor error message with error string", () => {
      logger.vendor.error("Test error action", "Error message", { context: "test" }, "user456");
      const logs = logger.getLogsByRole("vendor");

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("error");
      expect(logs[0].error).toBe("Error message");
      expect(logs[0].details).toEqual({ context: "test" });
    });
  });

  // ============================================================================
  // NGO Logging Tests
  // ============================================================================
  describe("ngo logging", () => {
    it("logs ngo debug message", () => {
      logger.ngo.debug("NGO debug action");
      const logs = logger.getLogsByRole("ngo");

      expect(logs).toHaveLength(1);
      expect(logs[0].role).toBe("ngo");
    });

    it("logs ngo info message", () => {
      logger.ngo.info("NGO info action", { claimId: "123" });
      const logs = logger.getLogsByRole("ngo");

      expect(logs[0].level).toBe("info");
      expect(logs[0].details).toEqual({ claimId: "123" });
    });

    it("logs ngo warn message", () => {
      logger.ngo.warn("NGO warning");
      const logs = logger.getLogsByRole("ngo");

      expect(logs[0].level).toBe("warn");
    });

    it("logs ngo error message", () => {
      logger.ngo.error("NGO error", "Failed to claim", { itemId: "456" });
      const logs = logger.getLogsByRole("ngo");

      expect(logs[0].level).toBe("error");
      expect(logs[0].error).toBe("Failed to claim");
    });
  });

  // ============================================================================
  // Admin Logging Tests
  // ============================================================================
  describe("admin logging", () => {
    it("logs admin debug message", () => {
      logger.admin.debug("Admin debug action");
      const logs = logger.getLogsByRole("admin");

      expect(logs).toHaveLength(1);
      expect(logs[0].role).toBe("admin");
    });

    it("logs admin info message", () => {
      logger.admin.info("User verified", { userId: "user789" }, "admin001");
      const logs = logger.getLogsByRole("admin");

      expect(logs[0].level).toBe("info");
      expect(logs[0].userId).toBe("admin001");
    });

    it("logs admin warn message", () => {
      logger.admin.warn("Suspicious activity detected");
      const logs = logger.getLogsByRole("admin");

      expect(logs[0].level).toBe("warn");
    });

    it("logs admin error message", () => {
      logger.admin.error("Admin action failed", "Permission denied");
      const logs = logger.getLogsByRole("admin");

      expect(logs[0].level).toBe("error");
      expect(logs[0].error).toBe("Permission denied");
    });
  });

  // ============================================================================
  // System Logging Tests
  // ============================================================================
  describe("system logging", () => {
    it("logs system debug message without userId", () => {
      logger.system.debug("System boot");
      const logs = logger.getLogsByRole("system");

      expect(logs).toHaveLength(1);
      expect(logs[0].role).toBe("system");
      expect(logs[0].userId).toBeUndefined();
    });

    it("logs system info message", () => {
      logger.system.info("Database connected", { dbHost: "localhost" });
      const logs = logger.getLogsByRole("system");

      expect(logs[0].level).toBe("info");
    });

    it("logs system warn message", () => {
      logger.system.warn("High memory usage");
      const logs = logger.getLogsByRole("system");

      expect(logs[0].level).toBe("warn");
    });

    it("logs system error message", () => {
      logger.system.error("System crash", "Out of memory");
      const logs = logger.getLogsByRole("system");

      expect(logs[0].level).toBe("error");
    });
  });

  // ============================================================================
  // Log Retrieval Tests
  // ============================================================================
  describe("getLogs", () => {
    it("returns all logs grouped by role", () => {
      logger.vendor.info("Vendor log");
      logger.ngo.info("NGO log");
      logger.admin.info("Admin log");
      logger.system.info("System log");

      const allLogs = logger.getLogs();

      expect(allLogs.vendor).toHaveLength(1);
      expect(allLogs.ngo).toHaveLength(1);
      expect(allLogs.admin).toHaveLength(1);
      expect(allLogs.system).toHaveLength(1);
    });

    it("returns a copy of logs (not reference)", () => {
      logger.vendor.info("Test");
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();

      expect(logs1).not.toBe(logs2);
    });
  });

  describe("getLogsByRole", () => {
    it("returns only logs for specified role", () => {
      logger.vendor.info("Vendor 1");
      logger.vendor.info("Vendor 2");
      logger.ngo.info("NGO 1");

      const vendorLogs = logger.getLogsByRole("vendor");

      expect(vendorLogs).toHaveLength(2);
      vendorLogs.forEach(log => {
        expect(log.role).toBe("vendor");
      });
    });

    it("returns empty array if no logs for role", () => {
      logger.vendor.info("Vendor log");

      const ngoLogs = logger.getLogsByRole("ngo");

      expect(ngoLogs).toHaveLength(0);
    });

    it("returns a copy of logs (not reference)", () => {
      logger.vendor.info("Test");
      const logs1 = logger.getLogsByRole("vendor");
      const logs2 = logger.getLogsByRole("vendor");

      expect(logs1).not.toBe(logs2);
    });
  });

  describe("getLogsByLevel", () => {
    it("returns only logs with specified level across all roles", () => {
      logger.vendor.error("Vendor error", "e1");
      logger.ngo.error("NGO error", "e2");
      logger.admin.info("Admin info");
      logger.system.error("System error", "e3");

      const errorLogs = logger.getLogsByLevel("error");

      expect(errorLogs).toHaveLength(3);
      errorLogs.forEach(log => {
        expect(log.level).toBe("error");
      });
    });

    it("returns empty array if no logs with level", () => {
      logger.vendor.info("Info log");

      const warnLogs = logger.getLogsByLevel("warn");

      expect(warnLogs).toHaveLength(0);
    });
  });

  describe("getErrors", () => {
    it("returns only error logs", () => {
      logger.vendor.info("Info");
      logger.vendor.error("Error", "e1");
      logger.ngo.error("Another error", "e2");

      const errors = logger.getErrors();

      expect(errors).toHaveLength(2);
      errors.forEach(log => {
        expect(log.level).toBe("error");
      });
    });
  });

  // ============================================================================
  // Log Clearing Tests
  // ============================================================================
  describe("clearLogsByRole", () => {
    it("clears only logs for specified role", () => {
      logger.vendor.info("Vendor log");
      logger.ngo.info("NGO log");

      logger.clearLogsByRole("vendor");

      expect(logger.getLogsByRole("vendor")).toHaveLength(0);
      expect(logger.getLogsByRole("ngo")).toHaveLength(1);
    });
  });

  describe("clearLogs", () => {
    it("clears all logs", () => {
      logger.vendor.info("Vendor log");
      logger.ngo.info("NGO log");
      logger.admin.info("Admin log");
      logger.system.info("System log");

      logger.clearLogs();

      const allLogs = logger.getLogs();
      expect(allLogs.vendor).toHaveLength(0);
      expect(allLogs.ngo).toHaveLength(0);
      expect(allLogs.admin).toHaveLength(0);
      expect(allLogs.system).toHaveLength(0);
    });
  });

  // ============================================================================
  // Log Export Tests
  // ============================================================================
  describe("exportLogs", () => {
    it("exports all logs as JSON string", () => {
      logger.vendor.info("Test log", { key: "value" });

      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(parsed.vendor).toHaveLength(1);
      expect(parsed.vendor[0].action).toBe("Test log");
      expect(parsed.vendor[0].details).toEqual({ key: "value" });
    });

    it("returns valid JSON for empty logs", () => {
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(parsed.vendor).toHaveLength(0);
      expect(parsed.ngo).toHaveLength(0);
      expect(parsed.admin).toHaveLength(0);
      expect(parsed.system).toHaveLength(0);
    });
  });

  describe("exportLogsByRole", () => {
    it("exports logs for specific role as JSON string", () => {
      logger.vendor.info("Vendor log");
      logger.ngo.info("NGO log");

      const exported = logger.exportLogsByRole("vendor");
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe("Vendor log");
    });
  });

  // ============================================================================
  // Log Entry Structure Tests
  // ============================================================================
  describe("log entry structure", () => {
    it("includes timestamp in ISO format", () => {
      logger.vendor.info("Test");
      const logs = logger.getLogsByRole("vendor");

      expect(logs[0].timestamp).toBeDefined();
      expect(() => new Date(logs[0].timestamp)).not.toThrow();
    });

    it("includes all required fields", () => {
      logger.vendor.error("Action", "Error message", { detail: "value" }, "userId123");
      const log = logger.getLogsByRole("vendor")[0];

      expect(log).toHaveProperty("timestamp");
      expect(log).toHaveProperty("level");
      expect(log).toHaveProperty("role");
      expect(log).toHaveProperty("action");
      expect(log).toHaveProperty("details");
      expect(log).toHaveProperty("error");
      expect(log).toHaveProperty("userId");
    });
  });

  // ============================================================================
  // Log Limit Tests
  // ============================================================================
  describe("log limit", () => {
    it("maintains maximum 500 logs per role", () => {
      // Add 510 logs
      for (let i = 0; i < 510; i++) {
        logger.vendor.info(`Log ${i}`);
      }

      const logs = logger.getLogsByRole("vendor");
      expect(logs).toHaveLength(500);

      // First log should be "Log 10" (first 10 were removed)
      expect(logs[0].action).toBe("Log 10");
    });
  });

  // ============================================================================
  // Print Summary Tests
  // ============================================================================
  describe("printSummary", () => {
    it("logs summary to console", () => {
      logger.vendor.info("V1");
      logger.vendor.error("V2", "err");
      logger.ngo.info("N1");

      logger.printSummary();

      expect(console.log).toHaveBeenCalled();
    });
  });
});
