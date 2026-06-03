import type { Lead } from "@/types/lead";
import type { LeadHistoryItem } from "@/types/lead-history";

export type ProspectingCadenceActionType = "message" | "call" | "manual_move";

export type ProspectingCadenceStepKey =
  | "d1_initial_message"
  | "d2_call"
  | "d2_post_call_message"
  | "d3_followup_message"
  | "d4_final_call"
  | "d4_final_message"
  | "move_to_recovery";

export type ProspectingCadenceScriptType =
  | "initial_opening"
  | "post_call_no_answer"
  | "followup_no_response"
  | "final_pause_message";

export type ProspectingCadenceAction = {
  key: ProspectingCadenceStepKey;
  type: ProspectingCadenceActionType;
  label: string;
  dayLabel: "D1" | "D2" | "D3" | "D4" | "Depois";
  scriptType?: ProspectingCadenceScriptType;
};

export type ProspectingCadenceStep = ProspectingCadenceAction & {
  done: boolean;
};

export type ProspectingCadenceState = {
  steps: ProspectingCadenceStep[];
  nextAction: ProspectingCadenceAction;
  completedCount: number;
  totalActionCount: number;
  isComplete: boolean;
};

export const PROSPECTING_CADENCE_NAME = "prospecting_no_response";

export const PROSPECTING_CADENCE_ACTIONS: ProspectingCadenceAction[] = [
  {
    key: "d1_initial_message",
    type: "message",
    label: "Mensagem inicial",
    dayLabel: "D1",
    scriptType: "initial_opening",
  },
  {
    key: "d2_call",
    type: "call",
    label: "Ligação",
    dayLabel: "D2",
  },
  {
    key: "d2_post_call_message",
    type: "message",
    label: "Mensagem pós-ligação",
    dayLabel: "D2",
    scriptType: "post_call_no_answer",
  },
  {
    key: "d3_followup_message",
    type: "message",
    label: "Mensagem de retomada",
    dayLabel: "D3",
    scriptType: "followup_no_response",
  },
  {
    key: "d4_final_call",
    type: "call",
    label: "Ligação final",
    dayLabel: "D4",
  },
  {
    key: "d4_final_message",
    type: "message",
    label: "Mensagem final",
    dayLabel: "D4",
    scriptType: "final_pause_message",
  },
  {
    key: "move_to_recovery",
    type: "manual_move",
    label: "Mover para Futuro/Recuperação",
    dayLabel: "Depois",
  },
];

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function metadataEvent(item: LeadHistoryItem) {
  return String(item.metadata?.event ?? "");
}

function metadataText(item: LeadHistoryItem, key: string) {
  const value = item.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function isCallEvent(item: LeadHistoryItem) {
  const event = metadataEvent(item);
  const attemptType = normalizeText(metadataText(item, "attemptType"));
  const text = normalizeText([item.title, item.description].filter(Boolean).join(" "));

  return (
    event === "call_logged" ||
    attemptType === "call" ||
    attemptType === "ligacao" ||
    text.includes("ligacao")
  );
}

function isMessageEvent(item: LeadHistoryItem) {
  const event = metadataEvent(item);
  const attemptType = normalizeText(metadataText(item, "attemptType"));

  return (
    event === "commercial_reply_sent" ||
    event === "post_call_message_sent" ||
    event === "prospecting_followup_message_sent" ||
    event === "prospecting_final_message_sent" ||
    attemptType === "message" ||
    attemptType === "mensagem"
  );
}

function isCadenceStepDone(history: LeadHistoryItem[], key: ProspectingCadenceStepKey) {
  return history.some((item) => item.metadata?.cadenceStepKey === key);
}

function isCadenceCallAction(item: LeadHistoryItem) {
  const event = metadataEvent(item);
  const attemptType = normalizeText(metadataText(item, "attemptType"));

  return (
    event === "call_logged" ||
    (event === "attempt_recorded" &&
      (attemptType === "call" || attemptType === "ligacao"))
  );
}

function countCallEvents(history: LeadHistoryItem[]) {
  return history.filter(isCadenceCallAction).length;
}

function hasInitialMessage(lead: Lead, history: LeadHistoryItem[]) {
  return (
    history.some((item) => metadataEvent(item) === "commercial_reply_sent") ||
    history.some(isMessageEvent) ||
    (lead.tentativas ?? []).some(
      (tentativa) =>
        normalizeText(tentativa.tipo).includes("mensagem") &&
        Boolean(tentativa.resultado?.trim())
    )
  );
}

function hasCallByPosition(history: LeadHistoryItem[], position: number) {
  return countCallEvents(history) >= position;
}

export function getProspectingScript(action: ProspectingCadenceAction | null | undefined) {
  switch (action?.scriptType) {
    case "post_call_no_answer":
      return "Oi, tudo bem? Tentei te ligar rapidinho para te orientar sobre o tratamento de estrias e tirar suas dúvidas.\n\nQuando puder, me responde por aqui que eu te ajudo a seguir.";
    case "followup_no_response":
      return "Oi, tudo bem? Passando só para saber se você ainda tem interesse em receber as informações sobre o tratamento de estrias.\n\nPosso te orientar por aqui, se preferir.";
    case "final_pause_message":
      return "Oi, tudo bem? Como não consegui falar com você, vou deixar seu atendimento pausado por enquanto.\n\nSe ainda quiser conversar sobre o tratamento de estrias, é só me chamar por aqui que eu te ajudo.";
    default:
      return "";
  }
}

export function isPostCallMessageAction(action: ProspectingCadenceAction | null | undefined) {
  return action?.key === "d2_post_call_message" || action?.key === "d4_final_message";
}

export function getCadenceHistoryMetadata(action: ProspectingCadenceAction) {
  const eventByStep: Partial<Record<ProspectingCadenceStepKey, string>> = {
    d2_post_call_message: "post_call_message_sent",
    d3_followup_message: "prospecting_followup_message_sent",
    d4_final_message: "prospecting_final_message_sent",
  };

  return {
    event: eventByStep[action.key] ?? "commercial_reply_sent",
    source: "manual_whatsapp_desktop",
    channel: "whatsapp",
    sentByApi: false,
    manualSendConfirmed: true,
    cadence: PROSPECTING_CADENCE_NAME,
    cadenceStepKey: action.key,
    cadenceStepLabel: action.label,
    cadenceDay: action.dayLabel,
    automationReady: true,
    futureAutomationDelayHours: action.key === "d4_final_message" ? 24 : null,
  };
}

export function getProspectingCadenceState(
  lead: Lead,
  history: LeadHistoryItem[] = []
): ProspectingCadenceState {
  const callCount = countCallEvents(history);
  const steps = PROSPECTING_CADENCE_ACTIONS.map((action): ProspectingCadenceStep => {
    let done = false;

    if (action.key === "d1_initial_message") {
      done = hasInitialMessage(lead, history);
    } else if (action.key === "d2_call") {
      done = hasCallByPosition(history, 1);
    } else if (action.key === "d4_final_call") {
      done = callCount >= 2;
    } else if (action.key === "move_to_recovery") {
      done = false;
    } else {
      done = isCadenceStepDone(history, action.key);
    }

    return {
      ...action,
      done,
    };
  });
  const actionableSteps = steps.filter((step) => step.type !== "manual_move");
  const completedCount = actionableSteps.filter((step) => step.done).length;
  const nextAction =
    steps.find((step) => !step.done) ??
    PROSPECTING_CADENCE_ACTIONS[PROSPECTING_CADENCE_ACTIONS.length - 1];

  return {
    steps,
    nextAction,
    completedCount,
    totalActionCount: actionableSteps.length,
    isComplete: completedCount >= actionableSteps.length,
  };
}

export function getNextProspectingAction(lead: Lead, history: LeadHistoryItem[] = []) {
  return getProspectingCadenceState(lead, history).nextAction;
}

export function isCadenceComplete(lead: Lead, history: LeadHistoryItem[] = []) {
  return getProspectingCadenceState(lead, history).isComplete;
}
