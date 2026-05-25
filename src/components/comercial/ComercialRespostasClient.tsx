"use client";

import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";

type ComercialRespostasClientProps = {
  empresaId: string | number;
  empresaNome: string;
  categories: CommercialResponseCategory[];
  responses: CommercialResponse[];
};

function getCategoryName(
  categories: CommercialResponseCategory[],
  categoryId?: string | null
) {
  if (!categoryId) return "Sem categoria";

  return (
    categories.find((category) => category.id === categoryId)?.name ??
    "Categoria não encontrada"
  );
}

function countResponsesByCategory(
  responses: CommercialResponse[],
  categoryId: string
) {
  return responses.filter((response) => response.categoryId === categoryId)
    .length;
}

function truncateText(value: string, maxLength = 180) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={
        active
          ? "rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-300"
          : "rounded-full border border-[var(--border2)] bg-[var(--bg3)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]"
      }
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4">
      <div className="text-2xl font-semibold text-[var(--accent)]">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">
        {label}
      </div>
    </div>
  );
}

export function ComercialRespostasClient({
  empresaId,
  empresaNome,
  categories,
  responses,
}: ComercialRespostasClientProps) {
  const activeResponses = responses.filter((response) => response.isActive);
  const autoReplyResponses = responses.filter(
    (response) => response.canAutoReply
  );
  const humanResponses = responses.filter((response) => response.requiresHuman);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg)] p-6"
      data-empresa-id={empresaId}
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Comercial / Respostas · {empresaNome}
            </p>
            <h1 className="text-xl font-semibold">Respostas Comerciais</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text2)]">
              Cadastre e organize respostas aprovadas para perguntas frequentes.
              Futuramente, a IA usará essa base para sugerir respostas seguras.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--text3)] opacity-70"
            >
              Nova categoria
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.10)] px-3 py-2 text-xs font-semibold text-[var(--accent)] opacity-70"
            >
              Nova resposta
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs text-[var(--text3)]">
          Criação e edição serão adicionadas na próxima etapa.
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Categorias" value={categories.length} />
        <MetricCard label="Respostas" value={responses.length} />
        <MetricCard label="Ativas" value={activeResponses.length} />
        <MetricCard label="Auto resposta" value={autoReplyResponses.length} />
        <MetricCard label="Exigem humano" value={humanResponses.length} />
      </div>

      <div className="mt-4 grid min-h-0 gap-4 xl:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Categorias</h2>
            <span className="rounded-full bg-[var(--bg4)] px-2 py-1 text-xs text-[var(--text2)]">
              {categories.length}
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border2)] p-4 text-center text-sm text-[var(--text3)]">
              Você ainda não cadastrou categorias.
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="mt-1 text-xs text-[var(--text2)]">
                          {category.description}
                        </p>
                      )}
                    </div>

                    <StatusBadge
                      active={category.isActive}
                      activeLabel="Ativa"
                      inactiveLabel="Inativa"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--text3)]">
                    <span>Ordem: {category.orderIndex}</span>
                    <span>
                      {countResponsesByCategory(responses, category.id)} resposta(s)
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Respostas aprovadas</h2>
            <span className="rounded-full bg-[var(--bg4)] px-2 py-1 text-xs text-[var(--text2)]">
              {responses.length}
            </span>
          </div>

          {responses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border2)] p-8 text-center text-sm text-[var(--text3)]">
              Você ainda não cadastrou respostas aprovadas.
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {responses.map((response) => (
                <article
                  key={response.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                        {getCategoryName(categories, response.categoryId)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-[var(--text)]">
                        {response.title}
                      </h3>
                    </div>

                    <span className="rounded-full border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1 text-xs text-[var(--text2)]">
                      Prioridade {response.priority}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text2)]">
                    {truncateText(response.answerText)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge
                      active={response.isActive}
                      activeLabel="Ativa"
                      inactiveLabel="Inativa"
                    />
                    <StatusBadge
                      active={response.canAutoReply}
                      activeLabel="Auto: sim"
                      inactiveLabel="Auto: não"
                    />
                    <StatusBadge
                      active={response.requiresHuman}
                      activeLabel="Humano: sim"
                      inactiveLabel="Humano: não"
                    />
                  </div>

                  {response.exampleQuestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                        Perguntas parecidas
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {response.exampleQuestions.map((question) => (
                          <span
                            key={question}
                            className="rounded-full bg-[var(--bg4)] px-2 py-0.5 text-[10px] text-[var(--text2)]"
                          >
                            {question}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {response.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {response.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text3)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
