"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  analyzeLeadCsvImport,
  buildLeadImportTemplateCsv,
  type LeadImportPreview,
  type LeadImportRowStatus,
} from "@/lib/comercial/import-csv";
import type { Lead } from "@/types/lead";

type LeadCsvImportPanelProps = {
  leads: Lead[];
  isOpen: boolean;
  onClose: () => void;
};

const PREVIEW_ROW_LIMIT = 50;

const STATUS_LABELS: Record<LeadImportRowStatus, string> = {
  valid: "Válida",
  duplicate: "Duplicada",
  invalid: "Inválida",
};

const STATUS_CLASSES: Record<LeadImportRowStatus, string> = {
  valid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  duplicate: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  invalid: "border-red-500/40 bg-red-500/10 text-red-200",
};

function downloadCsvTemplate() {
  const csvContent = buildLeadImportTemplateCsv();
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "modelo-importacao-leads.csv";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getStatusClass(status: LeadImportRowStatus) {
  return STATUS_CLASSES[status];
}

export function LeadCsvImportPanel({
  leads,
  isOpen,
  onClose,
}: LeadCsvImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [importPreview, setImportPreview] = useState<LeadImportPreview | null>(
    null
  );
  const [importError, setImportError] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);

  if (!isOpen) return null;

  function clearImportState() {
    setSelectedFileName("");
    setImportPreview(null);
    setImportError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFileName(file.name);
    setImportPreview(null);
    setImportError("");
    setIsReadingFile(true);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        if (typeof reader.result !== "string") {
          throw new Error("Não foi possível ler o conteúdo do arquivo.");
        }

        const preview = analyzeLeadCsvImport(reader.result, leads);
        setImportPreview(preview);
      } catch (error) {
        setImportPreview(null);
        setImportError(
          error instanceof Error
            ? error.message
            : "Não foi possível analisar o arquivo CSV."
        );
      } finally {
        setIsReadingFile(false);
      }
    };

    reader.onerror = () => {
      setImportPreview(null);
      setImportError("Não foi possível ler o arquivo CSV.");
      setIsReadingFile(false);
    };

    reader.readAsText(file);
  }

  const previewRows = importPreview?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];
  const hasPreview = Boolean(importPreview);
  const hasImportState = Boolean(selectedFileName || importPreview || importError);

  return (
    <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Importar CSV
          </p>
          <h2 className="mt-1 text-lg font-semibold">Pré-visualização de leads</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text2)]">
            Esta etapa apenas analisa o arquivo. Nenhum lead será importado ainda.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border2)] px-3 py-2 text-xs font-semibold text-[var(--text2)] transition hover:bg-[var(--bg3)] hover:text-[var(--text)]"
        >
          Fechar
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReadingFile}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReadingFile ? "Lendo arquivo..." : "Escolher CSV"}
        </button>

        <button
          type="button"
          onClick={downloadCsvTemplate}
          className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-4 py-2 text-xs font-semibold text-[var(--text2)] transition hover:text-[var(--text)]"
        >
          Baixar modelo CSV
        </button>

        {hasImportState && (
          <button
            type="button"
            onClick={clearImportState}
            className="rounded-lg border border-[var(--border2)] px-4 py-2 text-xs font-semibold text-[var(--text2)] transition hover:bg-[var(--bg3)] hover:text-[var(--text)]"
          >
            Limpar
          </button>
        )}

        <button
          type="button"
          disabled
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text3)] opacity-70"
        >
          Importação real na próxima etapa
        </button>
      </div>

      {selectedFileName && (
        <p className="mt-3 text-xs text-[var(--text3)]">
          Arquivo selecionado:{" "}
          <span className="text-[var(--text2)]">{selectedFileName}</span>
        </p>
      )}

      {importError && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {importError}
        </div>
      )}

      {importPreview?.globalErrors.length ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <p className="font-semibold">Problemas no arquivo</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {importPreview.globalErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasPreview && importPreview && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
              <div className="text-2xl font-semibold text-[var(--text)]">
                {importPreview.summary.totalRows}
              </div>
              <div className="text-xs text-[var(--text3)]">Total</div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-2xl font-semibold text-emerald-200">
                {importPreview.summary.validRows}
              </div>
              <div className="text-xs text-emerald-200/80">Válidas</div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-2xl font-semibold text-amber-200">
                {importPreview.summary.duplicateRows}
              </div>
              <div className="text-xs text-amber-200/80">Duplicadas</div>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="text-2xl font-semibold text-red-200">
                {importPreview.summary.invalidRows}
              </div>
              <div className="text-xs text-red-200/80">Inválidas</div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Preview das linhas</h3>
                <p className="mt-1 text-xs text-[var(--text3)]">
                  Mostrando até {PREVIEW_ROW_LIMIT} linha(s). Separador detectado:{" "}
                  <span className="font-mono text-[var(--text2)]">
                    {importPreview.separator === "\t" ? "tab" : importPreview.separator}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {previewRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border2)] p-4 text-center text-xs text-[var(--text3)]">
                  Nenhuma linha de lead encontrada no arquivo.
                </div>
              ) : (
                previewRows.map((row) => (
                  <article
                    key={`${row.sourceRowNumber}-${row.normalizedPhone}-${row.status}`}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                          Linha {row.sourceRowNumber}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                          {row.nome || "Sem nome"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text2)]">
                          {row.tel || "Sem telefone"}
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${getStatusClass(
                          row.status
                        )}`}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-[var(--text3)]">
                          Interesse
                        </span>
                        <span className="text-[var(--text2)]">
                          {row.esp || "não informado"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-[var(--text3)]">
                          Campanha
                        </span>
                        <span className="text-[var(--text2)]">
                          {row.campanha || "não informada"}
                        </span>
                      </div>
                    </div>

                    {(row.errors.length > 0 || row.warnings.length > 0) && (
                      <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-xs">
                        {row.errors.map((error) => (
                          <div key={error} className="text-red-200">
                            Erro: {error}
                          </div>
                        ))}

                        {row.warnings.map((warning) => (
                          <div key={warning} className="text-amber-200">
                            Aviso: {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
