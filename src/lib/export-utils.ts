/**
 * Export utilities for generating CSV and PDF reports
 */

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any, row: any) => string;
}

/**
 * Export data to CSV format and trigger download
 */
export function exportToCSV(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Build header row
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Build data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.formatter ? col.formatter(value, row) : value;
        // Escape quotes and wrap in quotes
        const stringValue = String(formatted ?? "").replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",")
  );

  // Combine and create blob
  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Trigger download
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to PDF format (simple text-based PDF)
 */
export function exportToPDF(
  data: Record<string, any>[],
  columns: ExportColumn[],
  title: string,
  filename: string
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Build simple text-based PDF content
  const pdfContent = generateSimplePDF(data, columns, title);
  const blob = new Blob([pdfContent], { type: "application/pdf" });

  downloadBlob(blob, `${filename}.pdf`);
}

/**
 * Generate a simple PDF document (text-based, minimal formatting)
 */
function generateSimplePDF(
  data: Record<string, any>[],
  columns: ExportColumn[],
  title: string
): string {
  const date = new Date().toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build text content for PDF
  let content = `${title}\nGenerated on: ${date}\n\n`;
  content += "=".repeat(80) + "\n\n";

  // Add header
  content +=
    columns
      .map((col) => col.header.padEnd(20))
      .join(" | ")
      .trim() + "\n";
  content += "-".repeat(80) + "\n";

  // Add data rows
  data.forEach((row) => {
    content +=
      columns
        .map((col) => {
          const value = row[col.key];
          const formatted = col.formatter ? col.formatter(value, row) : value;
          return String(formatted ?? "")
            .substring(0, 18)
            .padEnd(20);
        })
        .join(" | ")
        .trim() + "\n";
  });

  content += "\n" + "=".repeat(80) + "\n";
  content += `Total Records: ${data.length}\n`;

  // Create a simple PDF structure (PDF 1.4 compatible)
  return createPDFDocument(content);
}

/**
 * Create a minimal PDF document with text content
 */
function createPDFDocument(textContent: string): string {
  const lines = textContent.split("\n");
  let yPosition = 750; // Start from top

  // Build content stream
  let contentStream = "BT\n";
  contentStream += "/F1 10 Tf\n"; // Font size 10

  lines.forEach((line) => {
    if (yPosition < 50) return; // Don't write past bottom margin
    contentStream += `1 0 0 1 50 ${yPosition} Tm\n`;
    // Escape special PDF characters
    const escapedLine = line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    contentStream += `(${escapedLine}) Tj\n`;
    yPosition -= 14; // Line spacing
  });

  contentStream += "ET";

  const contentStreamLength = contentStream.length;

  // Build PDF structure
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${contentStreamLength} >>
stream
${contentStream}
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj

xref
0 6
0000000000 65535 f
0000000009 00001 n
0000000058 00001 n
0000000115 00001 n
0000000266 00001 n
0000000${String(350 + contentStreamLength).padStart(3, "0")} 00001 n

trailer
<< /Size 6 /Root 1 0 R >>
startxref
${420 + contentStreamLength}
%%EOF`;

  return pdf;
}

/**
 * Helper to trigger file download from a Blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-defined column configurations for common exports
export const donationExportColumns: ExportColumn[] = [
  { key: "name", header: "Item Name" },
  { key: "category", header: "Category" },
  { key: "quantity", header: "Quantity" },
  { key: "unit", header: "Unit" },
  { key: "status", header: "Status" },
  { key: "expiry_date", header: "Expiry Date" },
  {
    key: "created_at",
    header: "Created",
    formatter: (v) => (v ? new Date(v).toLocaleDateString() : ""),
  },
];

export const distributionExportColumns: ExportColumn[] = [
  {
    key: "distribution_date",
    header: "Date",
    formatter: (v) => (v ? new Date(v).toLocaleDateString() : ""),
  },
  { key: "distribution_type", header: "Type" },
  { key: "beneficiary_group", header: "Beneficiary Group" },
  { key: "location", header: "Location" },
];

export const userExportColumns: ExportColumn[] = [
  { key: "organization_name", header: "Organization" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "verification_status", header: "Status" },
  {
    key: "created_at",
    header: "Joined",
    formatter: (v) => (v ? new Date(v).toLocaleDateString() : ""),
  },
];

export const impactExportColumns: ExportColumn[] = [
  { key: "metric", header: "Metric" },
  { key: "value", header: "Value" },
  { key: "unit", header: "Unit" },
];
