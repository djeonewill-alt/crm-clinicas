const CSV_SEPARATOR = ";";
const UTF8_BOM = "\uFEFF";
const CSV_INJECTION_PREFIX = /^[=+\-@]/;

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';

  const normalizedValue = String(value).replace(/\r?\n|\r/g, " ").trim();
  const safeValue = CSV_INJECTION_PREFIX.test(normalizedValue)
    ? `'${normalizedValue}`
    : normalizedValue;
  const escapedValue = safeValue.replace(/"/g, '""');

  return `"${escapedValue}"`;
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const csvRows = [
    headers.map(sanitizeCsvCell).join(CSV_SEPARATOR),
    ...rows.map((row) => row.map(sanitizeCsvCell).join(CSV_SEPARATOR)),
  ];

  return `${UTF8_BOM}${csvRows.join("\r\n")}`;
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatCsvDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("pt-BR");
}

export function formatCsvBoolean(value?: boolean | null): string {
  if (value === null || value === undefined) return "";
  return value ? "Sim" : "Não";
}

export function formatCsvMoney(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return String(value);

  return numberValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
