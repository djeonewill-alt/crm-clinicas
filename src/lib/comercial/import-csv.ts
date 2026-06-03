import type { Lead } from "@/types/lead";

export type LeadImportRowStatus = "valid" | "duplicate" | "invalid";

export type LeadImportInputRow = {
  sourceRowNumber: number;
  values: Record<string, string>;
};

export type LeadImportPreviewRow = {
  sourceRowNumber: number;
  nome: string;
  tel: string;
  esp: string;
  campanha: string;
  dataEntrada: string;
  normalizedPhone: string;
  status: LeadImportRowStatus;
  errors: string[];
  warnings: string[];
};

export type LeadImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
};

export type LeadImportPreview = {
  separator: string;
  headers: string[];
  rows: LeadImportPreviewRow[];
  summary: LeadImportPreviewSummary;
  globalErrors: string[];
};

type CanonicalLeadImportField = "nome" | "tel" | "esp" | "campanha" | "dataEntrada";

const UTF8_BOM = "\uFEFF";
const TEMPLATE_SEPARATOR = ";";

const FIELD_ALIASES: Record<CanonicalLeadImportField, string[]> = {
  nome: ["nome", "name", "lead", "cliente", "paciente"],
  tel: [
    "telefone",
    "tel",
    "phone",
    "whatsapp",
    "celular",
    "contato",
    "numero",
    "número",
    "numero telefone",
    "telefone whatsapp",
  ],
  esp: [
    "interesse",
    "procedimento",
    "especialidade",
    "servico",
    "serviço",
    "esp",
    "tratamento",
  ],
  campanha: [
    "campanha",
    "campaign",
    "origem",
    "canal",
    "source",
    "utm_campaign",
    "utm campaign",
  ],
  dataEntrada: [
    "data_entrada",
    "data entrada",
    "data do lead",
    "entrada",
    "data campanha",
  ],
};

function stripUtf8Bom(value: string) {
  return value.startsWith(UTF8_BOM) ? value.slice(1) : value;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getCanonicalField(header: string): CanonicalLeadImportField | null {
  const normalizedHeader = normalizeHeader(header);

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.map(normalizeHeader).includes(normalizedHeader)) {
      return field as CanonicalLeadImportField;
    }
  }

  return null;
}

export function normalizeImportPhone(value: string) {
  return value.replace(/\D/g, "");
}

function countSeparatorOutsideQuotes(line: string, separator: string) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === separator) {
      count += 1;
    }
  }

  return count;
}

export function detectCsvSeparator(csvText: string) {
  const text = stripUtf8Bom(csvText);
  const firstContentLine =
    text
      .split(/\r?\n|\r/)
      .find((line) => line.trim().length > 0) ?? "";
  const candidates = [";", ",", "\t"];

  return candidates.reduce((best, candidate) => {
    const candidateCount = countSeparatorOutsideQuotes(
      firstContentLine,
      candidate
    );
    const bestCount = countSeparatorOutsideQuotes(firstContentLine, best);

    return candidateCount > bestCount ? candidate : best;
  }, TEMPLATE_SEPARATOR);
}

export function parseCsvRows(csvText: string, separator = detectCsvSeparator(csvText)) {
  const text = stripUtf8Bom(csvText);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === separator) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell.trim());
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function mapHeaderIndexes(headers: string[]) {
  const fieldIndexes = new Map<CanonicalLeadImportField, number>();

  headers.forEach((header, index) => {
    const canonicalField = getCanonicalField(header);

    if (canonicalField && !fieldIndexes.has(canonicalField)) {
      fieldIndexes.set(canonicalField, index);
    }
  });

  return fieldIndexes;
}

function getRowValue(row: string[], fieldIndexes: Map<CanonicalLeadImportField, number>, field: CanonicalLeadImportField) {
  const index = fieldIndexes.get(field);

  if (index === undefined) return "";

  return row[index]?.trim() ?? "";
}

function getExistingLeadPhoneSet(existingLeads: Lead[]) {
  return new Set(
    existingLeads
      .map((lead) => normalizeImportPhone(lead.tel ?? ""))
      .filter(Boolean)
  );
}

export function analyzeLeadCsvImport(
  csvText: string,
  existingLeads: Lead[]
): LeadImportPreview {
  const separator = detectCsvSeparator(csvText);
  const parsedRows = parseCsvRows(csvText, separator);
  const globalErrors: string[] = [];
  const [rawHeaders = [], ...dataRows] = parsedRows;
  const headers = rawHeaders.map((header) => header.trim());
  const fieldIndexes = mapHeaderIndexes(headers);
  const existingPhones = getExistingLeadPhoneSet(existingLeads);
  const seenPhones = new Set<string>();

  if (headers.length === 0) {
    globalErrors.push("O CSV não possui cabeçalho.");
  }

  if (!fieldIndexes.has("tel")) {
    globalErrors.push("O CSV precisa ter uma coluna de telefone.");
  }

  const rows: LeadImportPreviewRow[] = dataRows.map((row, index) => {
    const sourceRowNumber = index + 2;
    const nome = getRowValue(row, fieldIndexes, "nome");
    const tel = getRowValue(row, fieldIndexes, "tel");
    const esp = getRowValue(row, fieldIndexes, "esp");
    const campanha = getRowValue(row, fieldIndexes, "campanha");
    const dataEntrada = getRowValue(row, fieldIndexes, "dataEntrada");
    const normalizedPhone = normalizeImportPhone(tel);
    const errors: string[] = [];
    const warnings: string[] = [];
    let status: LeadImportRowStatus = "valid";

    if (!tel.trim()) {
      errors.push("Telefone obrigatório.");
    }

    if (tel.trim() && !normalizedPhone) {
      errors.push("Telefone sem números.");
    }

    if (normalizedPhone && normalizedPhone.length < 10) {
      warnings.push("Telefone com menos de 10 dígitos.");
    }

    if (dataEntrada.trim() && Number.isNaN(new Date(dataEntrada).getTime())) {
      warnings.push("Data de entrada nao reconhecida. Se importar, sera usada a data de hoje.");
    }

    if (normalizedPhone && seenPhones.has(normalizedPhone)) {
      errors.push("Telefone duplicado dentro do CSV.");
      status = "duplicate";
    }

    if (normalizedPhone && existingPhones.has(normalizedPhone)) {
      errors.push("Telefone já existe na base atual.");
      status = "duplicate";
    }

    if (normalizedPhone && !seenPhones.has(normalizedPhone)) {
      seenPhones.add(normalizedPhone);
    }

    if (errors.length > 0 && status !== "duplicate") {
      status = "invalid";
    }

    return {
      sourceRowNumber,
      nome,
      tel,
      esp,
      campanha,
      dataEntrada,
      normalizedPhone,
      status,
      errors,
      warnings,
    };
  });

  const summary = rows.reduce<LeadImportPreviewSummary>(
    (acc, row) => {
      acc.totalRows += 1;

      if (row.status === "valid") acc.validRows += 1;
      if (row.status === "duplicate") acc.duplicateRows += 1;
      if (row.status === "invalid") acc.invalidRows += 1;

      return acc;
    },
    {
      totalRows: 0,
      validRows: 0,
      duplicateRows: 0,
      invalidRows: 0,
    }
  );

  return {
    separator,
    headers,
    rows,
    summary,
    globalErrors,
  };
}

export function getValidLeadImportRows(preview: LeadImportPreview) {
  return preview.rows.filter((row) => row.status === "valid");
}

export function buildLeadImportTemplateCsv() {
  return [
    ["nome", "telefone", "interesse", "campanha", "data_entrada"].join(TEMPLATE_SEPARATOR),
    ["Maria Silva", "(11) 99999-9999", "Botox", "Instagram", "2026-06-03"].join(
      TEMPLATE_SEPARATOR
    ),
  ].join("\r\n");
}
