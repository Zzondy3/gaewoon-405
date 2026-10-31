'use client';

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea'];

// 꺾은선 그래프 (SVG). 결과 공개 전에는 이후 칸을 "?"로, 공개 후에는 점선으로 이어서 그림.
export default function LineChart({ chart, height = 380 }) {
  const W = 820;
  const H = height;
  const pad = { l: 64, r: 28, t: 28, b: 48 };
  const labels = [...chart.labels, ...(chart.futureLabels || [])];
  const nPast = chart.labels.length;
  const all = chart.series.flatMap((s) => [...s.data, ...(s.future || [])]);
  let min = Math.min(...all);
  let max = Math.max(...all);
  const span = max - min || 1;
  min = min >= 0 && min - span * 0.3 < 0 ? 0 : min - span * 0.2;
  max = max + span * 0.15;
  const step = niceStep((max - min) / 5);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;

  const x = (i) => pad.l + ((W - pad.l - pad.r) * (i + 0.5)) / labels.length;
  const y = (v) => pad.t + ((H - pad.t - pad.b) * (max - v)) / (max - min);
  const ticks = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

  return (
    <figure className="chart">
      <figcaption>
        {chart.title} {chart.unit && <span className="muted">(단위: {chart.unit})</span>}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chart.title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
            <text x={pad.l - 10} y={y(t) + 5} textAnchor="end" fontSize="15" fill="#6b7280">
              {t}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke="#9ca3af" />
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#9ca3af" />
        {labels.map((lb, i) => (
          <text key={lb} x={x(i)} y={H - pad.b + 28} textAnchor="middle" fontSize="16"
            fill={i >= nPast ? '#9ca3af' : '#374151'} fontWeight={i >= nPast ? 700 : 400}>
            {lb}
          </text>
        ))}
        {chart.series.map((s, si) => {
          const c = COLORS[si % COLORS.length];
          const past = s.data.map((v, i) => [x(i), y(v)]);
          const fut = s.future ? s.future.map((v, i) => [x(nPast + i), y(v)]) : [];
          return (
            <g key={s.name}>
              <polyline points={past.map((p) => p.join(',')).join(' ')} fill="none" stroke={c} strokeWidth="4" strokeLinejoin="round" />
              {fut.length > 0 && (
                <polyline points={[past[past.length - 1], ...fut].map((p) => p.join(',')).join(' ')}
                  fill="none" stroke={c} strokeWidth="4" strokeDasharray="10 8" />
              )}
              {[...s.data, ...(s.future || [])].map((v, i) => (
                <g key={i}>
                  <circle cx={x(i)} cy={y(v)} r="6" fill={i >= nPast ? '#fff' : c} stroke={c} strokeWidth="3" />
                  <text x={x(i)} y={y(v) - 14} textAnchor="middle" fontSize="15" fontWeight="700" fill={c}>
                    {v}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
        {!chart.series.some((s) => s.future) &&
          (chart.futureLabels || []).map((lb, i) => (
            <text key={lb} x={x(nPast + i)} y={(pad.t + H - pad.b) / 2} textAnchor="middle" fontSize="40" fontWeight="800" fill="#d1d5db">
              ?
            </text>
          ))}
      </svg>
      {chart.series.length > 1 && (
        <div className="legend">
          {chart.series.map((s, i) => (
            <span key={s.name}>
              <i style={{ background: COLORS[i % COLORS.length] }} /> {s.name}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
