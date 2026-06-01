import type { LeadHistoryItem } from "@/types/lead-history";

type HistoryMetadata = Record<string, unknown> | undefined;

export function normalizeHistoryText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getMetadataString(metadata: HistoryMetadata, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getHistoryEvent(item: LeadHistoryItem) {
  const event = item.metadata?.event;
  return typeof event === "string" ? event : "";
}

function getEventIdentityText(input: {
  eventName: string;
  description?: string | null;
  metadata?: HistoryMetadata;
}) {
  const { eventName, description, metadata } = input;

  if (eventName === "customer_message_received") {
    return getMetadataString(metadata, "messageText") || description || "";
  }

  if (eventName === "commercial_reply_sent") {
    return getMetadataString(metadata, "replyText") || description || "";
  }

  if (eventName === "lead_attachment_received") {
    return [
      getMetadataString(metadata, "fileName"),
      description || "",
    ].join(" ");
  }

  if (eventName === "lead_material_sent") {
    const materialId = getMetadataString(metadata, "materialId");

    if (materialId) return materialId;

    return [
      getMetadataString(metadata, "materialTitle"),
      getMetadataString(metadata, "materialLabel"),
      getMetadataString(metadata, "publicUrl"),
      description || "",
    ].join(" ");
  }

  return description || "";
}

export function getHistoryEventFingerprint(
  eventName: string,
  text: string
) {
  const normalizedText = normalizeHistoryText(text);

  if (!eventName || !normalizedText) return "";

  return `${eventName}:${normalizedText}`;
}

export function buildHistoryEventFingerprint(input: {
  eventName: string;
  description?: string | null;
  metadata?: HistoryMetadata;
}) {
  return getHistoryEventFingerprint(
    input.eventName,
    getEventIdentityText(input)
  );
}

export function isDuplicateHistoryEvent(input: {
  history: LeadHistoryItem[];
  eventName: string;
  description?: string | null;
  metadata?: HistoryMetadata;
  recentFingerprints?: Set<string>;
  limit?: number;
}) {
  const fingerprint = buildHistoryEventFingerprint(input);

  if (!fingerprint) return false;

  if (input.recentFingerprints?.has(fingerprint)) return true;

  return input.history
    .filter((item) => getHistoryEvent(item) === input.eventName)
    .slice(0, input.limit ?? 50)
    .some(
      (item) =>
        buildHistoryEventFingerprint({
          eventName: input.eventName,
          description: item.description,
          metadata: item.metadata,
        }) === fingerprint
    );
}
