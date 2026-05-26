"use client";

import { useEffect, useRef, useState } from "react";
import { createLeadHistoryEvent } from "@/lib/services/lead-history-client";

type LeadCallLogFormProps = {
  leadId: string | number;
  empresaId: string | number;
  onHistoryChanged?: () => Promise<void> | void;
};

type CallResult =
  | "answered"
  | "no_answer"
  | "dropped"
  | "busy"
  | "asked_return"
  | "not_interested"
  | "scheduled"
  | "pay_later"
  | "needs_human";

const CALL_RESULT_LABELS: Record<CallResult, string> = {
  answered: "Atendeu",
  no_answer: "Não atendeu",
  dropped: "Chamou e caiu",
  busy: "Ocupado",
  asked_return: "Pediu retorno",
  not_interested: "Sem interesse",
  scheduled: "Agendou",
  pay_later: "Vai pagar depois",
  needs_human: "Precisa humano",
};

const SUMMARY_REQUIRED_RESULTS: CallResult[] = [
  "answered",
  "asked_return",
  "not_interested",
  "scheduled",
  "pay_later",
  "needs_human",
];

function todayInputValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getAutomaticSummary(result: CallResult) {
  return `Resultado: ${CALL_RESULT_LABELS[result]}.`;
}

export function LeadCallLogForm({
  leadId,
  empresaId,
  onHistoryChanged,
}: LeadCallLogFormProps) {
  const [callResult, setCallResult] = useState<CallResult | "">("");
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextContactDate, setNextContactDate] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      discardAudio();
      stopMediaStream();
    };
  }, []);

  function stopMediaStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function discardAudio() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    audioUrlRef.current = null;
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingError("");
  }

  async function handleStartRecording() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError("Seu navegador não permite gravação de áudio nesta tela.");
      return;
    }

    try {
      discardAudio();
      setRecordingError("");
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const nextAudioUrl = URL.createObjectURL(blob);

        audioUrlRef.current = nextAudioUrl;
        setAudioBlob(blob);
        setAudioUrl(nextAudioUrl);
        setIsRecording(false);
        stopMediaStream();
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      stopMediaStream();
      setIsRecording(false);
      setRecordingError(
        error instanceof Error
          ? `Não foi possível iniciar a gravação: ${error.message}`
          : "Não foi possível iniciar a gravação."
      );
    }
  }

  function handleStopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      stopMediaStream();
      setIsRecording(false);
      return;
    }

    recorder.stop();
  }

  async function handleSave() {
    if (!callResult) {
      setStatusMessage("Selecione o resultado da ligação.");
      return;
    }

    const trimmedSummary = summary.trim();
    const trimmedNextAction = nextAction.trim();
    const trimmedNextContactDate = nextContactDate.trim();
    const requiresSummary = SUMMARY_REQUIRED_RESULTS.includes(callResult);

    if (requiresSummary && !trimmedSummary) {
      setStatusMessage("Informe um resumo da ligação.");
      return;
    }

    if (
      trimmedNextContactDate &&
      trimmedNextContactDate < todayInputValue()
    ) {
      setStatusMessage("Escolha uma data de próximo contato de hoje em diante.");
      return;
    }

    const callResultLabel = CALL_RESULT_LABELS[callResult];
    const finalSummary = trimmedSummary || getAutomaticSummary(callResult);
    const description = [
      `Resultado: ${callResultLabel}`,
      `Resumo: ${finalSummary}`,
      trimmedNextAction ? `Próxima ação: ${trimmedNextAction}` : null,
      trimmedNextContactDate
        ? `Próximo contato: ${trimmedNextContactDate}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createLeadHistoryEvent({
        leadId: String(leadId),
        empresaId: String(empresaId),
        type: "note",
        title: "Ligação registrada",
        description,
        metadata: {
          event: "call_logged",
          source: "manual_call_log",
          callResult,
          callResultLabel,
          summary: finalSummary,
          nextAction: trimmedNextAction || null,
          nextContactDate: trimmedNextContactDate || null,
          assistedPanel: true,
        },
      });

      await onHistoryChanged?.();
      setCallResult("");
      setSummary("");
      setNextAction("");
      setNextContactDate("");
      discardAudio();
      setStatusMessage("Ligação registrada no histórico.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Erro ao registrar ligação: ${error.message}`
          : "Erro ao registrar ligação."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Registrar ligação
        </p>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Use este registro depois de ligar para o lead. O resumo ficará salvo
          no histórico e ajudará a acompanhar o atendimento.
        </p>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
          Resultado da ligação
          <select
            value={callResult}
            onChange={(event) =>
              setCallResult(event.target.value as CallResult | "")
            }
            className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Selecione o resultado</option>
            {Object.entries(CALL_RESULT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
          Data do próximo contato
          <input
            type="date"
            value={nextContactDate}
            onChange={(event) => setNextContactDate(event.target.value)}
            className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
        Resumo da ligação
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
          placeholder="Ex: Cliente atendeu, disse que ainda tem interesse, mas só consegue pagar dia 16. Pediu para chamar novamente nessa data."
        />
      </label>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
        Próxima ação
        <input
          value={nextAction}
          onChange={(event) => setNextAction(event.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
          placeholder="Ex: Chamar dia 16 para enviar Pix."
        />
      </label>

      <section className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Resumo por áudio
          </p>
          <p className="mt-1 text-xs text-[var(--text2)]">
            Grave um resumo logo após a ligação. Nesta etapa, o áudio fica
            apenas no navegador para você ouvir e usar como apoio. A transcrição
            automática será adicionada depois.
          </p>
          <p className="mt-2 text-xs text-[var(--text3)]">
            Grave apenas o seu resumo após a ligação. Evite gravar a voz do
            cliente sem autorização.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isRecording}
            onClick={() => void handleStartRecording()}
            className="rounded-lg border border-[var(--accent)] bg-[rgba(232,197,71,.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[rgba(232,197,71,.14)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Iniciar gravação
          </button>

          <button
            type="button"
            disabled={!isRecording}
            onClick={handleStopRecording}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Parar gravação
          </button>

          <button
            type="button"
            disabled={!audioBlob && !audioUrl}
            onClick={discardAudio}
            className="rounded-lg border border-[var(--border2)] bg-[var(--bg4)] px-3 py-2 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Descartar áudio
          </button>
        </div>

        {isRecording && (
          <p className="mt-2 text-xs font-semibold text-red-300">
            Gravando...
          </p>
        )}

        {recordingError && (
          <p className="mt-2 text-xs text-red-300">{recordingError}</p>
        )}

        {audioUrl && (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
            <audio controls src={audioUrl} className="w-full" />
            <p className="mt-2 text-xs text-[var(--text2)]">
              Áudio gravado localmente. Ele ainda não será salvo no histórico.
            </p>
            <p className="mt-1 text-xs text-[var(--text3)]">
              Ouça o áudio e escreva ou ajuste o resumo no campo de resumo.
            </p>
          </div>
        )}
      </section>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Salvando..." : "Salvar ligação no histórico"}
        </button>

        {statusMessage && (
          <span className="text-xs text-[var(--text2)]">{statusMessage}</span>
        )}
      </div>
    </section>
  );
}
