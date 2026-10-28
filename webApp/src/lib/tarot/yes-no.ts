import type { Card } from "./cards";

export type Verdict = "sí" | "no" | "depende";

const DOWN: Record<Verdict, Verdict> = { "sí": "depende", depende: "no", no: "no" };

export function cardVerdict(card: Card, reversed: boolean): Verdict {
  return reversed ? DOWN[card.si_no] : card.si_no;
}

export function yesNoVerdict(cards: { card: Card; reversed: boolean }[]): { verdict: Verdict; votes: Verdict[]; tiebreak: boolean } {
  const votes = cards.map((c) => cardVerdict(c.card, c.reversed));
  if (votes.length === 1) return { verdict: votes[0]!, votes, tiebreak: false };
  const tally = new Map<Verdict, number>();
  for (const v of votes) tally.set(v, (tally.get(v) ?? 0) + 1);
  const majority = [...tally.entries()].find(([, n]) => n >= 2);
  if (majority) return { verdict: majority[0], votes, tiebreak: false };
  return { verdict: votes[Math.floor(votes.length / 2)]!, votes, tiebreak: true };
}
