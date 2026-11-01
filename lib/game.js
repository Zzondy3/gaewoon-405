import scenarios from './scenarios';

export const totalRounds = scenarios.length;
export const scenarioTitles = scenarios.map((s) => s.title);

// 결과 설명 문구 자동 생성
export function describe(r) {
  const m = r.mult;
  let t =
    m === 0 ? '투자한 코인 잃기'
    : m === 0.5 ? '투자한 코인의 절반 잃기'
    : m === 1 ? '투자한 코인 그대로'
    : m > 1 ? `투자한 코인의 ${m}배 획득`
    : `투자한 코인의 ${m}배만 돌려받기`;
  if (r.bonus) t += ` + 보너스 ${r.bonus}코인`;
  return t;
}

// 한 기업에 투자한 코인이 결과 후 얼마가 되는지
export function payout(amount, r) {
  if (!amount) return 0;
  return Math.round(amount * r.mult) + (r.bonus || 0);
}

// 화면에 보낼 라운드 정보. 결과 공개 전에는 결과를 숨깁니다(학생 기기에서 볼 수 없음).
export function publicScenario(round, phase, { withAnswer = false } = {}) {
  const s = scenarios[round];
  if (!s) return null;
  const reveal = withAnswer || phase === 'result' || phase === 'final';
  const res = (k) => ({ ...s.result[k], bonus: s.result[k].bonus || 0, text: describe(s.result[k]) });
  return {
    title: s.title,
    companies: s.companies,
    result: reveal ? { A: res('A'), B: res('B') } : null,
  };
}

export function computeResult(meta, subs) {
  const s = scenarios[meta.round];
  const rows = {};
  const groups = meta.groups.map((g) => {
    const sub = subs[g.id] && subs[g.id].round === meta.round ? subs[g.id] : null;
    const a = sub ? sub.a : 0;
    const b = sub ? sub.b : 0;
    const after = g.coins - a - b + payout(a, s.result.A) + payout(b, s.result.B);
    rows[g.id] = { before: g.coins, a, b, after, submitted: !!sub, reason: sub?.reason || '' };
    return { ...g, coins: after };
  });
  return { groups, lastResult: { round: meta.round, rows } };
}
