export const TEMPLATE_KEYS = {
  contract: "contract",
  act: "act"
} as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[keyof typeof TEMPLATE_KEYS];
