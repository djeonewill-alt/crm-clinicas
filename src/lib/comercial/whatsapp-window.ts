import type { Lead } from "@/types/lead";
import type { LeadHistoryItem } from "@/types/lead-history";

export type EstimatedWhatsAppWindowState = {
  lastCustomerMessageAt: string | null;
  inside24hServiceWindow: boolean;
  hoursSinceLastCustomerMessage: number | null;
  likelyInside72hAdWindow: boolean | null;
  estimatedCostRisk:
    | "inside_service_window"
    | "inside_ad_window"
    | "outside_window"
    | "unknown";
  label: string;
};

type GetEstimatedWhatsAppWindowStateInput = {
  lead?: Pick<Lead, "campanha"> | null;
  recentHistory?: LeadHistoryItem[];
  now?: Date;
};

function getEvent(item: LeadHistoryItem) {
  const event = item.metadata?.event;
  return typeof event === "string" ? event : "";
}

function hasReliableAdSource(input: GetEstimatedWhatsAppWindowStateInput) {
  const history = input.recentHistory ?? [];

  return history.some((item) => {
    const source = item.metadata?.source;
    const channel = item.metadata?.channel;
    const origin = item.metadata?.origin;

    return [source, channel, origin].some(
      (value) =>
        typeof value === "string" &&
        /click_to_whatsapp|ctwa|ad|ads|anuncio|anuncio_meta|meta_ads/i.test(
          value
        )
    );
  });
}

export function getEstimatedWhatsAppWindowState({
  recentHistory = [],
  now = new Date(),
  ...input
}: GetEstimatedWhatsAppWindowStateInput): EstimatedWhatsAppWindowState {
  const lastCustomerMessage = [...recentHistory]
    .filter((item) => getEvent(item) === "customer_message_received")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

  if (!lastCustomerMessage) {
    return {
      lastCustomerMessageAt: null,
      inside24hServiceWindow: false,
      hoursSinceLastCustomerMessage: null,
      likelyInside72hAdWindow: null,
      estimatedCostRisk: "unknown",
      label: "WhatsApp: janela desconhecida",
    };
  }

  const lastMessageDate = new Date(lastCustomerMessage.created_at);

  if (Number.isNaN(lastMessageDate.getTime())) {
    return {
      lastCustomerMessageAt: lastCustomerMessage.created_at,
      inside24hServiceWindow: false,
      hoursSinceLastCustomerMessage: null,
      likelyInside72hAdWindow: null,
      estimatedCostRisk: "unknown",
      label: "WhatsApp: janela desconhecida",
    };
  }

  const hoursSinceLastCustomerMessage =
    (now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60);
  const inside24hServiceWindow = hoursSinceLastCustomerMessage <= 24;

  if (inside24hServiceWindow) {
    return {
      lastCustomerMessageAt: lastCustomerMessage.created_at,
      inside24hServiceWindow: true,
      hoursSinceLastCustomerMessage,
      likelyInside72hAdWindow: null,
      estimatedCostRisk: "inside_service_window",
      label: "WhatsApp: dentro da janela de 24h",
    };
  }

  const reliableAdSource = hasReliableAdSource({
    ...input,
    recentHistory,
    now,
  });
  const likelyInside72hAdWindow =
    reliableAdSource && hoursSinceLastCustomerMessage <= 72 ? true : null;

  if (likelyInside72hAdWindow) {
    return {
      lastCustomerMessageAt: lastCustomerMessage.created_at,
      inside24hServiceWindow: false,
      hoursSinceLastCustomerMessage,
      likelyInside72hAdWindow: true,
      estimatedCostRisk: "inside_ad_window",
      label: "WhatsApp: possivel janela de anuncio",
    };
  }

  return {
    lastCustomerMessageAt: lastCustomerMessage.created_at,
    inside24hServiceWindow: false,
    hoursSinceLastCustomerMessage,
    likelyInside72hAdWindow,
    estimatedCostRisk: "outside_window",
    label: "WhatsApp: fora da janela estimada",
  };
}
