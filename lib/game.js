import scenarios from './scenarios';

export const totalRounds = scenarios.length;
export const scenarioTitles = scenarios.map((s) => s.title);

// 학생 화면에 보낼 문제 정보. 결과 공개 전에는 정답(수익률, 이후 그래프)을 숨깁니다.
export function publicScenario(round, phase, { withAnswer = false } = {}) {
  const s = scenarios[round];
  if (!s) return null;
  const reveal = withAnswer || phase === 'result' || phase === 'final';
  return {
    title: s.title,
    story: s.story,
    question: s.question,
    companies: s.companies,
    chart: {
      ...s.chart,
      series: s.chart.series.map((x) => ({
        name: x.name,
        data: x.data,
        future: reveal ? x.future : undefined,
      })),
    },
    result: reveal ? s.result : null,
  };
}

export function computeResult(meta, subs) {
  const s = scenarios[meta.round];
  const rows = {};
  const groups = meta.groups.map((g) => {
    const sub = subs[g.id] && subs[g.id].round === meta.round ? subs[g.id] : null;
    const a = sub ? sub.a : 0;
    const b = sub ? sub.b : 0;
    const keep = g.coins - a - b;
    const after = keep + Math.round(a * (1 + s.result.A)) + Math.round(b * (1 + s.result.B));
    rows[g.id] = { before: g.coins, a, b, after, submitted: !!sub, reason: sub?.reason || '' };
    return { ...g, coins: after };
  });
  return { groups, lastResult: { round: meta.round, rateA: s.result.A, rateB: s.result.B, rows } };
}
