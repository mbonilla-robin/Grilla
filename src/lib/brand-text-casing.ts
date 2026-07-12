export type TextCasingRule = "uppercase" | "sentence";

export interface BrandTextCasing {
  title: TextCasingRule;
  subtitle: TextCasingRule;
  body: TextCasingRule;
  bullet: TextCasingRule;
  cta: TextCasingRule;
}

export const DEFAULT_BRAND_TEXT_CASING: BrandTextCasing = {
  title: "uppercase",
  subtitle: "uppercase",
  body: "sentence",
  bullet: "sentence",
  cta: "sentence",
};

export function normalizeBrandTextCasing(value: unknown): BrandTextCasing {
  if (!value || typeof value !== "object") return { ...DEFAULT_BRAND_TEXT_CASING };
  const raw = value as Record<string, unknown>;
  const rule = (key: keyof BrandTextCasing): TextCasingRule =>
    raw[key] === "sentence" ? "sentence" : "uppercase";
  return {
    title: rule("title"),
    subtitle: rule("subtitle"),
    body: rule("body"),
    bullet: rule("bullet"),
    cta: rule("cta"),
  };
}

export function applyTextCasing(text: string, rule: TextCasingRule): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (rule === "uppercase") return trimmed.toUpperCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function casingRuleForLabel(label: string): keyof BrandTextCasing {
  const normalized = label.toLowerCase();
  if (normalized === "title") return "title";
  if (normalized === "subtitle") return "subtitle";
  if (normalized === "body" || normalized === "paragraph" || normalized === "párrafo") {
    return "body";
  }
  if (normalized === "cta") return "cta";
  return "body";
}

export function formatCasingRulesForPrompt(casing: BrandTextCasing): string {
  const describe = (rule: TextCasingRule) =>
    rule === "uppercase" ? "ALL CAPS (todo en mayúsculas)" : "Sentence case (primera letra mayúscula, resto minúsculas)";

  return [
    `- Title: ${describe(casing.title)}`,
    `- Subtitle (short): ${describe(casing.subtitle)}`,
    `- Paragraph / Body (long text): ${describe(casing.body)}`,
    `- Bullets: ${describe(casing.bullet)}`,
    `- CTA: ${describe(casing.cta)}`,
  ].join("\n");
}
