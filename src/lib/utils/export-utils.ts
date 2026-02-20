/**
 * Export Utilities - ابزارهای خروجی گرفتن از داده‌ها
 */

/**
 * Export به CSV
 */
export function exportToCSV(
  data: any[],
  filename: string,
  headers?: string[]
) {
  if (data.length === 0) {
    alert("داده‌ای برای خروجی وجود ندارد");
    return;
  }

  // استفاده از headers یا کلیدهای اولین آیتم
  const csvHeaders = headers || Object.keys(data[0]);
  
  // تبدیل headers به CSV
  const csvRows = [
    csvHeaders.join(","),
    ...data.map((row) =>
      csvHeaders
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export به JSON
 */
export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export به Excel (XLSX) - نیاز به کتابخانه xlsx
 * اگر xlsx نصب نشده باشد، به صورت خودکار به CSV تبدیل می‌شود
 * 
 * برای استفاده از این تابع، ابتدا xlsx را نصب کنید:
 * npm install xlsx
 * 
 * توجه: این تابع فقط در client-side کار می‌کند
 */
export async function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = "Sheet1"
) {
  // Only run in browser
  if (typeof window === "undefined") {
    console.warn("exportToExcel can only be used in client-side");
    return;
  }

  try {
    // Use dynamic import with a string to avoid build-time resolution
    // @ts-ignore - xlsx may not be installed
    const xlsxModule = await import(/* webpackIgnore: true */ "xlsx");
    const XLSX = xlsxModule.default || xlsxModule;
    
    if (!XLSX || !XLSX.utils) {
      throw new Error("xlsx module not properly loaded");
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`);
  } catch (error: any) {
    // If xlsx is not installed or any error occurs, fallback to CSV
    if (error?.code === "MODULE_NOT_FOUND" || error?.message?.includes("Cannot find module")) {
      console.warn("xlsx library not installed, falling back to CSV");
    } else {
      console.error("Error exporting to Excel:", error);
    }
    exportToCSV(data, filename);
  }
}

