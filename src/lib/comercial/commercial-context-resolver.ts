import type { CommercialContext } from "@/types/commercial-contexts";

export type CommercialContextResolution = {
  context: CommercialContext | null;
  reason: string | null;
};

export function normalizeCommercialContextText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[–—-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSafeInclusionMatch(campaign: string, candidate: string) {
  if (!campaign || !candidate) return false;
  if (campaign.length < 4 || candidate.length < 4) return false;

  return candidate.includes(campaign) || campaign.includes(candidate);
}

function getContextCandidates(context: CommercialContext) {
  return [
    { field: "campaignLabel", value: context.campaignLabel },
    { field: "name", value: context.name },
    { field: "slug", value: context.slug },
    { field: "audienceLabel", value: context.audienceLabel },
  ]
    .map((item) => ({
      ...item,
      normalized: normalizeCommercialContextText(item.value),
    }))
    .filter((item) => item.normalized);
}

export function resolveCommercialContextForCampaign(input: {
  campaign?: string | null;
  contexts: CommercialContext[];
}): CommercialContextResolution {
  const campaign = normalizeCommercialContextText(input.campaign);

  if (!campaign) {
    return { context: null, reason: null };
  }

  const activeContexts = input.contexts.filter((context) => context.isActive);
  const exactMatches = activeContexts
    .map((context) => ({
      context,
      match: getContextCandidates(context).find(
        (candidate) => candidate.normalized === campaign
      ),
    }))
    .filter((item) => item.match);

  if (exactMatches.length === 1) {
    return {
      context: exactMatches[0].context,
      reason: `campanha combinou exatamente com ${exactMatches[0].match?.field}`,
    };
  }

  if (exactMatches.length > 1) {
    return { context: null, reason: "mais de um contexto compativel" };
  }

  const inclusionMatches = activeContexts
    .map((context) => ({
      context,
      match: getContextCandidates(context).find((candidate) =>
        isSafeInclusionMatch(campaign, candidate.normalized)
      ),
    }))
    .filter((item) => item.match);

  if (inclusionMatches.length === 1) {
    return {
      context: inclusionMatches[0].context,
      reason: `campanha combinou parcialmente com ${inclusionMatches[0].match?.field}`,
    };
  }

  if (inclusionMatches.length > 1) {
    return { context: null, reason: "mais de um contexto compativel" };
  }

  return { context: null, reason: "nenhum contexto compativel" };
}
