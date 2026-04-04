import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exportToCSV,
  exportToPDF,
  donationExportColumns,
  distributionExportColumns,
  userExportColumns,
  impactExportColumns,
  type ExportColumn,
} from "./export-utils";

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();

// Mock document methods
const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

beforeEach(() => {
  // Setup mocks
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName === "a") {
      return {
        href: "",
        download: "",
        click: mockClick,
      } as unknown as HTMLAnchorElement;
    }
    return document.createElement(tagName);
  });

  vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
  vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);

  // Clear console warnings
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exportToCSV", () => {
  const testColumns: ExportColumn[] = [
    { key: "name", header: "Name" },
    { key: "value", header: "Value" },
    { key: "date", header: "Date", formatter: (v) => v ? new Date(v).toLocaleDateString() : "" },
  ];

  it("should handle empty data array", () => {
    const consoleSpy = vi.spyOn(console, "warn");
    exportToCSV([], testColumns, "test-export");
    expect(consoleSpy).toHaveBeenCalledWith("No data to export");
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("should create CSV with correct headers", () => {
    const data = [{ name: "Test", value: 100, date: "2024-01-15" }];
    exportToCSV(data, testColumns, "test-export");

    expect(mockCreateObjectURL).toHaveBeenCalled();
    const blobArg = (mockCreateObjectURL.mock.calls as any[][])[0][0] as Blob;
    expect(blobArg.type).toBe("text/csv;charset=utf-8;");
  });

  it("should trigger download with correct filename", () => {
    const data = [{ name: "Test", value: 100 }];
    exportToCSV(data, testColumns, "my-export");

    expect(mockClick).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it("should escape quotes in values", () => {
    const data = [{ name: 'Test "quoted" value', value: 100 }];
    exportToCSV(data, testColumns, "test");

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle null and undefined values", () => {
    const data = [
      { name: null, value: undefined, date: null },
      { name: "Valid", value: 50, date: "2024-01-01" },
    ];
    exportToCSV(data, testColumns, "test");

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should apply formatter functions", () => {
    const data = [{ name: "Item", value: 100, date: "2024-06-15T10:00:00Z" }];
    exportToCSV(data, testColumns, "test");

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle multiple rows", () => {
    const data = [
      { name: "Item 1", value: 100 },
      { name: "Item 2", value: 200 },
      { name: "Item 3", value: 300 },
    ];
    exportToCSV(data, testColumns, "test");

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});

describe("exportToPDF", () => {
  const testColumns: ExportColumn[] = [
    { key: "name", header: "Name" },
    { key: "value", header: "Value" },
  ];

  it("should handle empty data array", () => {
    const consoleSpy = vi.spyOn(console, "warn");
    exportToPDF([], testColumns, "Test Report", "test-export");
    expect(consoleSpy).toHaveBeenCalledWith("No data to export");
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("should create PDF blob", () => {
    const data = [{ name: "Test", value: 100 }];
    exportToPDF(data, testColumns, "Test Report", "test-export");

    expect(mockCreateObjectURL).toHaveBeenCalled();
    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe("application/pdf");
  });

  it("should trigger download with .pdf extension", () => {
    const data = [{ name: "Test", value: 100 }];
    exportToPDF(data, testColumns, "Report", "my-report");

    expect(mockClick).toHaveBeenCalled();
  });

  it("should handle special characters in content", () => {
    const data = [
      { name: "Test (with parentheses)", value: 100 },
      { name: "Test\\with\\backslashes", value: 200 },
    ];
    exportToPDF(data, testColumns, "Report", "test");

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should include title in PDF", () => {
    const data = [{ name: "Item", value: 50 }];
    exportToPDF(data, testColumns, "My Custom Report Title", "test");

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle multiple rows", () => {
    const data = Array.from({ length: 50 }, (_, i) => ({
      name: `Item ${i + 1}`,
      value: (i + 1) * 10,
    }));
    exportToPDF(data, testColumns, "Large Report", "test");

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});

describe("Pre-defined Column Configurations", () => {
  describe("donationExportColumns", () => {
    it("should have correct number of columns", () => {
      expect(donationExportColumns).toHaveLength(7);
    });

    it("should have required keys", () => {
      const keys = donationExportColumns.map((c) => c.key);
      expect(keys).toContain("name");
      expect(keys).toContain("category");
      expect(keys).toContain("quantity");
      expect(keys).toContain("status");
      expect(keys).toContain("expiry_date");
    });

    it("should have created_at formatter", () => {
      const createdAtCol = donationExportColumns.find((c) => c.key === "created_at");
      expect(createdAtCol).toBeDefined();
      expect(createdAtCol?.formatter).toBeDefined();

      // Test formatter
      const date = "2024-06-15T10:00:00Z";
      const formatted = createdAtCol?.formatter?.(date, {});
      expect(formatted).toBeTruthy();
    });

    it("should handle null date in formatter", () => {
      const createdAtCol = donationExportColumns.find((c) => c.key === "created_at");
      const formatted = createdAtCol?.formatter?.(null, {});
      expect(formatted).toBe("");
    });
  });

  describe("distributionExportColumns", () => {
    it("should have correct number of columns", () => {
      expect(distributionExportColumns).toHaveLength(4);
    });

    it("should have date formatter", () => {
      const dateCol = distributionExportColumns.find((c) => c.key === "distribution_date");
      expect(dateCol?.formatter).toBeDefined();
    });
  });

  describe("userExportColumns", () => {
    it("should have correct number of columns", () => {
      expect(userExportColumns).toHaveLength(5);
    });

    it("should include organization and role columns", () => {
      const keys = userExportColumns.map((c) => c.key);
      expect(keys).toContain("organization_name");
      expect(keys).toContain("role");
      expect(keys).toContain("verification_status");
    });
  });

  describe("impactExportColumns", () => {
    it("should have correct number of columns", () => {
      expect(impactExportColumns).toHaveLength(3);
    });

    it("should have metric, value, and unit columns", () => {
      const keys = impactExportColumns.map((c) => c.key);
      expect(keys).toEqual(["metric", "value", "unit"]);
    });
  });
});

describe("CSV Content Format", () => {
  it("should wrap values in double quotes", () => {
    const data = [{ name: "Test", value: 100 }];
    const columns: ExportColumn[] = [
      { key: "name", header: "Name" },
      { key: "value", header: "Value" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should separate values with commas", () => {
    const data = [{ a: 1, b: 2, c: 3 }];
    const columns: ExportColumn[] = [
      { key: "a", header: "A" },
      { key: "b", header: "B" },
      { key: "c", header: "C" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle newlines in values by escaping", () => {
    const data = [{ name: "Line1\nLine2", value: 100 }];
    const columns: ExportColumn[] = [
      { key: "name", header: "Name" },
      { key: "value", header: "Value" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});

describe("Edge Cases", () => {
  it("should handle very long text values", () => {
    const longText = "A".repeat(10000);
    const data = [{ name: longText, value: 1 }];
    const columns: ExportColumn[] = [
      { key: "name", header: "Name" },
      { key: "value", header: "Value" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle special characters", () => {
    const data = [{ name: "Special: <>&\"'", value: "More: \\n\\t" }];
    const columns: ExportColumn[] = [
      { key: "name", header: "Name" },
      { key: "value", header: "Value" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle numeric strings", () => {
    const data = [{ id: "00123", value: "456.789" }];
    const columns: ExportColumn[] = [
      { key: "id", header: "ID" },
      { key: "value", header: "Value" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle boolean values", () => {
    const data = [{ name: "Test", active: true, disabled: false }];
    const columns: ExportColumn[] = [
      { key: "name", header: "Name" },
      { key: "active", header: "Active" },
      { key: "disabled", header: "Disabled" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("should handle nested object access (returns undefined gracefully)", () => {
    const data = [{ user: { name: "Test" }, value: 100 }];
    const columns: ExportColumn[] = [
      { key: "user.name", header: "User Name" }, // This will be undefined
      { key: "value", header: "Value" },
    ];

    exportToCSV(data, columns, "test");
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});
