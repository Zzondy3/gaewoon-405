export const pct = (r) => `${r > 0 ? '+' : ''}${Math.round(r * 100)}%`;
export const signed = (n) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`;
export const coin = (n) => `${Number(n).toLocaleString()}코인`;
export const groupLabel = (g) => `${g.id}모둠`;

// 코인 순위 (코인이 같으면 같은 순위)
export function rankList(groups) {
  const sorted = [...groups].sort((a, b) => b.coins - a.coins || a.id - b.id);
  return sorted.map((g) => ({ ...g, rank: sorted.findIndex((x) => x.coins === g.coins) + 1 }));
}
