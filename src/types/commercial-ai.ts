export type CommercialAiConfidenceLabel = "low" | "medium" | "high";

export type CommercialAiRiskLevel = "low" | "medium" | "high";

export type CommercialAiDecision =
  | "suggest_reply"
  | "needs_human"
  | "blocked"
  | "no_match";

export type CommercialAiSafetyFlag =
  | "pregnancy_or_postpartum"
  | "minor_or_legal_guardian"
  | "professional_credentials"
  | "clinical_sensitive"
  | "contraindication"
  | "price_or_promotion"
  | "payment_or_pix"
  | "schedule_or_availability"
  | "sensitive_photo"
  | "result_promise"
  | "outdated_information_risk"
  | "multiple_intents"
  | "missing_approved_response"
  | "low_confidence"
  | "unknown";

export type CommercialAiAnalyzeMessageInput = {
  empresaId: string | number;
  leadId?: string | number | null;
  message: string;
  conversationContext?: string;
};

export type CommercialAiApprovedResponseCandidate = {
  id: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  title: string;
  answerText: string;
  exampleQuestions: string[];
  tags: string[];
  canAutoReply: boolean;
  requiresHuman: boolean;
  priority: number;
};

export type CommercialAiAnalysisResult = {
  intent: string;
  primaryCategorySlug: string | null;
  secondaryCategorySlugs: string[];
  matchedResponseIds: string[];
  confidence: number;
  confidenceLabel: CommercialAiConfidenceLabel;
  riskLevel: CommercialAiRiskLevel;
  decision: CommercialAiDecision;
  requiresHuman: boolean;
  canAutoReply: boolean;
  suggestedReply: string;
  reason: string;
  missingInfo: string[];
  safetyFlags: CommercialAiSafetyFlag[];
  blockedReason: string | null;
  usedApprovedFacts: string[];
  notAnswered: string[];
  reviewNotes: string[];
};

export const COMMERCIAL_AI_HUMAN_REQUIRED_FLAGS: CommercialAiSafetyFlag[] = [
  "pregnancy_or_postpartum",
  "minor_or_legal_guardian",
  "professional_credentials",
  "clinical_sensitive",
  "contraindication",
  "payment_or_pix",
  "schedule_or_availability",
  "sensitive_photo",
  "result_promise",
  "missing_approved_response",
  "low_confidence",
];

function clampConfidence(confidence: number) {
  if (Number.isNaN(confidence)) return 0;
  return Math.min(1, Math.max(0, confidence));
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean))
  ) as string[];
}

function uniqueSafetyFlags(values: CommercialAiSafetyFlag[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getCommercialAiConfidenceLabel(
  confidence: number
): CommercialAiConfidenceLabel {
  const normalizedConfidence = clampConfidence(confidence);

  if (normalizedConfidence >= 0.8) return "high";
  if (normalizedConfidence >= 0.5) return "medium";
  return "low";
}

export function commercialAiRequiresHumanByFlags(
  flags: CommercialAiSafetyFlag[]
): boolean {
  return flags.some((flag) => COMMERCIAL_AI_HUMAN_REQUIRED_FLAGS.includes(flag));
}

export function createEmptyCommercialAiAnalysisResult(
  partial?: Partial<CommercialAiAnalysisResult>
): CommercialAiAnalysisResult {
  return normalizeCommercialAiResult({
    intent: "unknown",
    primaryCategorySlug: null,
    secondaryCategorySlugs: [],
    matchedResponseIds: [],
    confidence: 0,
    confidenceLabel: "low",
    riskLevel: "high",
    decision: "needs_human",
    requiresHuman: true,
    canAutoReply: false,
    suggestedReply: "",
    reason: "Não foi possível classificar a mensagem com segurança.",
    missingInfo: [],
    safetyFlags: ["unknown"],
    blockedReason: null,
    usedApprovedFacts: [],
    notAnswered: [],
    reviewNotes: [],
    ...partial,
  });
}

export function normalizeCommercialAiResult(
  result: CommercialAiAnalysisResult
): CommercialAiAnalysisResult {
  const confidence = clampConfidence(result.confidence);
  const safetyFlags = uniqueSafetyFlags(result.safetyFlags ?? []);
  const requiresHumanByFlags = commercialAiRequiresHumanByFlags(safetyFlags);
  const requiresHuman =
    result.requiresHuman ||
    result.decision === "blocked" ||
    result.riskLevel === "high" ||
    requiresHumanByFlags;

  return {
    intent: normalizeString(result.intent) || "unknown",
    primaryCategorySlug: normalizeNullableString(result.primaryCategorySlug),
    secondaryCategorySlugs: uniqueStrings(result.secondaryCategorySlugs ?? []),
    matchedResponseIds: uniqueStrings(result.matchedResponseIds ?? []),
    confidence,
    confidenceLabel: getCommercialAiConfidenceLabel(confidence),
    riskLevel: result.riskLevel,
    decision: result.decision,
    requiresHuman,
    canAutoReply: requiresHuman ? false : result.canAutoReply === true,
    suggestedReply: normalizeString(result.suggestedReply),
    reason: normalizeString(result.reason),
    missingInfo: uniqueStrings(result.missingInfo ?? []),
    safetyFlags,
    blockedReason: normalizeNullableString(result.blockedReason),
    usedApprovedFacts: uniqueStrings(result.usedApprovedFacts ?? []),
    notAnswered: uniqueStrings(result.notAnswered ?? []),
    reviewNotes: uniqueStrings(result.reviewNotes ?? []),
  };
}
