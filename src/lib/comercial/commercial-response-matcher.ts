import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";

export type CommercialResponseMatch = {
  response: CommercialResponse;
  categoryName: string | null;
  categorySlug: string | null;
  contextScope: "current_context" | "global" | "other_context";
  contextName: string | null;
  score: number;
  matchedTerms: string[];
};

export type FindBestCommercialResponseInput = {
  message: string;
  categories: CommercialResponseCategory[];
  responses: CommercialResponse[];
  currentContextId?: string | null;
  currentContextName?: string | null;
  maxResults?: number;
};

export type FindBestCommercialResponseResult = {
  matches: CommercialResponseMatch[];
  bestMatch: CommercialResponseMatch | null;
};

export function normalizeCommercialSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

export function findBestCommercialResponses({
  message,
  categories,
  responses,
  currentContextId = null,
  currentContextName = null,
  maxResults = 5,
}: FindBestCommercialResponseInput): FindBestCommercialResponseResult {
  const normalizedMessage = normalizeCommercialSearchText(message);

  if (!normalizedMessage) {
    return { matches: [], bestMatch: null };
  }

  const tokens = uniqueValues(
    normalizedMessage.split(" ").filter((token) => token.length >= 3)
  );

  if (tokens.length === 0) {
    return { matches: [], bestMatch: null };
  }

  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  );
  const hasCurrentContext = Boolean(currentContextId);

  const matches = responses
    .filter((response) => {
      if (!response.isActive) return false;

      if (hasCurrentContext) {
        return (
          response.contextId === null || response.contextId === currentContextId
        );
      }

      return response.contextId === null;
    })
    .map((response) => {
      const category = response.categoryId
        ? categoryById.get(response.categoryId)
        : null;
      const title = normalizeCommercialSearchText(response.title);
      const questions = normalizeCommercialSearchText(
        response.exampleQuestions.join(" ")
      );
      const tags = normalizeCommercialSearchText(response.tags.join(" "));
      const categoryName = normalizeCommercialSearchText(category?.name ?? "");
      const answer = normalizeCommercialSearchText(response.answerText);
      const matchedTerms: string[] = [];

      const tokenScore = tokens.reduce((score, token) => {
        let nextScore = score;
        let matched = false;

        if (title.includes(token)) {
          nextScore += 30;
          matched = true;
        }

        if (questions.includes(token)) {
          nextScore += 25;
          matched = true;
        }

        if (tags.includes(token)) {
          nextScore += 20;
          matched = true;
        }

        if (categoryName.includes(token)) {
          nextScore += 15;
          matched = true;
        }

        if (answer.includes(token)) {
          nextScore += 10;
          matched = true;
        }

        if (matched) {
          matchedTerms.push(token);
        }

        return nextScore;
      }, 0);

      return {
        response,
        categoryName: category?.name ?? null,
        categorySlug: category?.slug ?? null,
        contextScope:
          hasCurrentContext && response.contextId === currentContextId
            ? "current_context"
            : response.contextId === null
              ? "global"
              : "other_context",
        contextName:
          hasCurrentContext && response.contextId === currentContextId
            ? currentContextName
            : null,
        score:
          tokenScore +
          response.priority / 10 +
          (hasCurrentContext && response.contextId === currentContextId
            ? 50
            : 0),
        matchedTerms: uniqueValues(matchedTerms),
      } satisfies CommercialResponseMatch;
    })
    .filter((match) => match.matchedTerms.length > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.contextScope === "current_context") -
          Number(a.contextScope === "current_context") ||
        b.response.priority - a.response.priority
    )
    .slice(0, maxResults);

  return {
    matches,
    bestMatch: matches[0] ?? null,
  };
}
