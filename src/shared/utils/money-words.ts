export function moneyToWordsRu(amount: number): string {
  const normalized = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  return `${normalized} руб.`;
}
