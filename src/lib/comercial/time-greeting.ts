export type SaoPauloGreeting = "Bom dia" | "Boa tarde" | "Boa noite";

export function getSaoPauloGreeting(date = new Date()): SaoPauloGreeting {
  const hourPart = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour");

  const hour = Number(hourPart?.value ?? 0);

  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}
