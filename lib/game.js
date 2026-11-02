import scenarios from './scenarios';

export const totalRounds = scenarios.length;
export const scenarioTitles = scenarios.map((s) => s.title);

// 결과 설명 문구 자동 생성
export function describe(r) {
  const g = r.gain;
  let t =
    g === -1 ? '투자한 코인 잃기'
    : g === -0.5 ? '투자한 코인의 절반 잃기'
    : g === 0 ? '변화 없음'
    : g === 1 ? '투자한 코인만큼 획득'
    : g > 0 ? `투자한 코인의 ${g}배 획득`
    : `투자한 코인의 ${-g}배 잃기`;
  if (r.bonus) t += ` + 보너스 ${r.bonus}코인`;
  return t;
}

// 한 기업에 투자한 코인으로 늘거나 줄어든 코인 (투자 안 했으면 0)
export function change(amount, r) {
  if (!amount) return 0;
  return Math.round(amount * r.gain) + (r.bonus || 0);
}

// 화면에 보낼 라운드 정보. 기업별 결과는 선생님 화면(withAnswer)에만 보냅니다.
export function publicScenario(round, phase, { withAnswer = false } = {}) {
  const s = scenarios[round];
  if (!s) return null;
  // 기업별 결과(얼마나 얻고 잃는지)는 학생 화면에는 절대 보내지 않음 — 선생님 화면에서만 보임
  const reveal = withAnswer;
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
    const dA = change(a, s.result.A);
    const dB = change(b, s.result.B);
    const after = Math.max(0, g.coins + dA + dB);
    rows[g.id] = { before: g.coins, a, b, dA, dB, after, submitted: !!sub, reason: sub?.reason || '' };
    return { ...g, coins: after };
  });
  return { groups, lastResult: { round: meta.round, rows } };
}
