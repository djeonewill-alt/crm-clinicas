import { NextResponse } from "next/server";

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return errorResponse("OPENAI_API_KEY não configurada.", 500);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Formulário inválido.", 400);
  }

  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return errorResponse("Áudio não enviado.", 400);
  }

  if (audio.size === 0) {
    return errorResponse("Áudio vazio.", 400);
  }

  if (audio.size > MAX_AUDIO_SIZE_BYTES) {
    return errorResponse("Áudio muito grande para transcrição.", 400);
  }

  const transcriptionFormData = new FormData();
  transcriptionFormData.append("file", audio, audio.name || "call-summary.webm");
  transcriptionFormData.append(
    "model",
    process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe"
  );
  transcriptionFormData.append("language", "pt");
  transcriptionFormData.append("response_format", "json");

  try {
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: transcriptionFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro seguro na transcrição de áudio:", response.status, errorText);
      return errorResponse("Erro ao transcrever áudio.", 500);
    }

    const data = (await response.json()) as { text?: unknown };
    const transcript = typeof data.text === "string" ? data.text : "";

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error(
      "Erro seguro ao chamar API de transcrição:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return errorResponse("Erro ao transcrever áudio.", 500);
  }
}
