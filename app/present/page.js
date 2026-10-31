'use client';
import usePoll from '@/lib/usePoll';
import LineChart from '@/components/LineChart';
import { pct, signed, coin, groupLabel } from '@/lib/format';

async function getState() {
  const r = await fetch('/api/state', { cache: 'no-store' });
  if (!r.ok) throw new Error('서버 연결 오류');
  return r.json();
}

// TV/프로젝터용 큰 화면. PPT 대신 또는 PPT와 함께 띄워도 됩니다.
export default function PresentPage() {
  const { data } = usePoll(getState, 2500);
  if (!data) return <main className="present"><p className="muted">불러오는 중…</p></main>;
  const { scenario: s, phase, round, totalRounds, groups, lastResult, submitted } = data;

  if (phase === 'final') {
    const sorted = [...groups].sort((a, b) => b.coins - a.coins);
    return (
      <main className="present stack">
        <h1>🏆 최종 결과</h1>
        <div className="board">
          {sorted.map((g, i) => (
            <div key={g.id} style={i === 0 ? { background: '#fef3c7' } : {}}>
              <div className="rank">{['🥇', '🥈', '🥉'][i] || `${i + 1}등`} <b>{groupLabel(g)}</b></div>
              <div className="muted small">{g.members}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{coin(g.coins)}</div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const shown = phase === 'result';
  const done = groups.filter((g) => submitted[g.id]).length;

  return (
    <main className="present">
      <div className="head">
        <h1>{shown ? `📰 ${s.result.headline}` : s.title}</h1>
        <span className="muted" style={{ fontSize: 20 }}>문제 {round + 1} / {totalRounds}</span>
      </div>
      <p className="story">{shown ? s.result.explanation : s.story}</p>
      <div className="layout">
        <div className="stack">
          <LineChart chart={s.chart} />
          {!shown && <div className="q">🤔 {s.question}</div>}
        </div>
        <div className="stack">
          {['A', 'B'].map((k) => (
            <div key={k} className={`co ${k}`}>
              <div className="tag">{k}기업</div>
              <h3>{s.companies[k].name}</h3>
              <div style={{ fontSize: 19 }}>{s.companies[k].desc}</div>
              {shown && <div className={`rate ${s.result[k] >= 0 ? 'up' : 'down'}`}>{pct(s.result[k])}</div>}
            </div>
          ))}
          {!shown && (
            <div className="card" style={{ background: '#f9fafb', fontSize: 20 }}>
              제출한 모둠 <b>{done} / {groups.length}</b>
              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                {groups.map((g) => (
                  <span key={g.id} className={`badge ${submitted[g.id] ? 'ok' : 'wait'}`}>{g.id}모둠</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {shown && lastResult && (
        <div className="board" style={{ marginTop: 24 }}>
          {groups.map((g) => {
            const r = lastResult.rows[g.id];
            if (!r) return null;
            const d = r.after - r.before;
            return (
              <div key={g.id}>
                <b style={{ fontSize: 20 }}>{groupLabel(g)}</b>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{coin(r.after)}</div>
                <div className={d > 0 ? 'up' : d < 0 ? 'down' : 'muted'} style={{ fontWeight: 700 }}>{signed(d)}</div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
