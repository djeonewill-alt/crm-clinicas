export type LeadHistoryType =
  | "note"
  | "attempt"
  | "status_change"
  | "return_scheduled"
  | "closed"
  | "disqualified"
  | "whatsapp"
  | "system";

export type LeadHistoryItem = {
  id: string;
  lead_id: string;
  empresa_id: string;
  user_id: string | null;
  type: LeadHistoryType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreateLeadHistoryNoteInput = {
  leadId: string;
  empresaId: string;
  description: string;
};

export type CreateLeadHistoryEventInput = {
  leadId: string;
  empresaId: string;
  type: LeadHistoryType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
};
