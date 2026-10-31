export const pct = (r) => `${r > 0 ? '+' : ''}${Math.round(r * 100)}%`;
export const signed = (n) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`;
export const coin = (n) => `${Number(n).toLocaleString()}코인`;
export const groupLabel = (g) => `${g.id}모둠`;
