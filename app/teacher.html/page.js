'use client';
import { useEffect, useState } from 'react';
import usePoll from '@/lib/usePoll';
import { signed, coin, groupLabel, rankList } from '@/lib/format';

const PIN_KEY = 'invest-class:pin';

const PHASE_LABEL = {
  ready: '⏸ 대기 (PPT 보는 중)',
  invest: '✏️ 투자 중',
  result: '📊 결과 공개됨',
  final: '🏆 최종 결과',
};

export default function TeacherPage() {
  const [pin, setPin] = useState(null);
  useEffect(() => {
    try { setPin(sessionStorage.getItem(PIN_KEY) || ''); } catch { setPin(''); }
  }, []);
  if (pin === null) return null;
  if (!pin) return <Login onOk={(p) => { try { sessionStorage.setItem(PIN_KEY, p); } catch {} setPin(p); }} />;
  return <Dashboard pin={pin} onLogout={() => { try { sessionStorage.removeItem(PIN_KEY); } catch {} setPin(''); }} />;
}

async function call(pin, action, extra = {}) {
  const r = await fetch('/api/teacher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, action, ...extra }),
    cache: 'no-store',
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || '오류');
  return j;
}

function Login({ onOk }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const go = async (e) => {
    e.preventDefault();
    try { await call(v, 'login'); onOk(v); } catch (e2) { setErr(e2.message); }
  };
  return (
    <main className="home">
      <form className="card stack" onSubmit={go}>
        <h2>🧑‍🏫 선생님 화면</h2>
        <input type="password" placeholder="비밀번호 (기본 1234)" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
        {err && <p className="error">{err}</p>}
        <button className="primary big">들어가기</button>
      </form>
    </main>
  );
}

function Dashboard({ pin, onLogout }) {
  const { data, error, refresh } = usePoll(() => call(pin, 'state'), 2000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const act = async (action, extra, ask) => {
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setMsg('');
    try { await call(pin, action, extra); await refresh(); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  if (!data) return <main className="home"><p className="muted">불러오는 중…</p>{error && <p className="error">{error}</p>}</main>;

  const { groups, subs, phase, round, totalRounds, scenario: s, lastResult } = data;
  const active = groups.filter((g) => g.coins > 0); // 코인이 0인 모둠은 참여 불가
  const doneCount = active.filter((g) => subs[g.id]).length;
  const allDone = doneCount === active.length && active.length > 0;
  const isLast = round + 1 >= totalRounds;
  const ranks = Object.fromEntries(rankList(groups).map((g) => [g.id, g.rank]));
  const skip = () => act('skip', {}, `${s.title}을(를) 결과 반영 없이 건너뛸까요?\n(이번 라운드 제출 내용은 지워지고 코인은 그대로예요)`);

  return (
    <div className="teacher">
      {/* ── 항상 보이는 상단: 진행 버튼 + 모둠 현황 ── */}
      <div className="t-top">
        <div className="t-bar">
          <h1>{phase === 'final' ? '모든 라운드 끝' : `${s?.title} / ${totalRounds}`}</h1>
          <span className={`badge ${phase === 'invest' ? 'live' : ''}`}>
            {PHASE_LABEL[phase]}{phase === 'invest' && ` · ${doneCount}/${active.length} 제출`}
          </span>
          <div className="grow" />
          {/* 버튼 위치를 고정: 마감과 다음 라운드는 항상 다른 자리에 따로 있어요 */}
          <div className="t-ctrl">
            <button className="primary" style={{ background: '#22c55e' }} disabled={busy || phase !== 'ready'} onClick={() => act('open')}>
              ▶ 투자 시작
            </button>
            <button className="primary" style={{ background: allDone ? '#22c55e' : '#f59e0b' }} disabled={busy || phase !== 'invest'}
              onClick={() => act('close', {}, allDone
                ? '투자를 마감하고 결과를 공개할까요?'
                : `아직 ${active.length - doneCount}개 모둠이 제출하지 않았어요.\n제출하지 않은 모둠은 코인이 그대로예요.\n투자를 마감하고 결과를 공개할까요?`)}>
              ■ 투자 마감
            </button>
          </div>
          <div className="t-ctrl">
            <button className="primary" style={{ background: '#2563eb' }} disabled={busy || phase !== 'result'}
              onClick={() => act('next', {}, isLast ? '최종 결과로 넘어갈까요?' : `${data.titles[round + 1]}(으)로 넘어갈까요?`)}>
              {isLast ? '🏆 최종 결과로' : '다음 라운드 ▶'}
            </button>
            <button className="ghost" style={{ color: '#fff', borderColor: '#4b5563' }} disabled={busy || !['ready', 'invest'].includes(phase)} onClick={skip}>
              ⏭ 건너뛰기
            </button>
          </div>
        </div>
        <div className="t-groups">
          {groups.map((g) => {
            const sub = subs[g.id];
            const row = lastResult?.rows[g.id];
            const d = row ? row.after - row.before : 0;
            return (
              <div key={g.id} className={`g-card ${phase === 'invest' && sub ? 'done' : ''}`}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
                  <span className="gn">{groupLabel(g)}</span>
                  <span className="badge">{ranks[g.id]}위</span>
                </div>
                <div className="gc">{coin(g.coins)}</div>
                <div className="gs">
                  {phase === 'invest' && g.coins <= 0 && <span className="badge wait">0코인 · 참여 불가</span>}
                  {phase === 'invest' && g.coins > 0 && (sub
                    ? <span><span className="badge ok">제출</span> A {sub.a} · B {sub.b}</span>
                    : <span className="badge wait">대기 중…</span>)}
                  {phase === 'result' && row && (
                    <span className={d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}>
                      <b>{signed(d)}</b> <span className="muted">(A {row.a} · B {row.b})</span>
                    </span>
                  )}
                  {phase === 'ready' && <span className="muted">투자 시작 전</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <main className="t-main">
        {data.storage === 'memory' && (
          <div className="warn">
            ⚠️ 저장소(Redis)가 연결되지 않아 임시 메모리에 저장 중이에요. 내 컴퓨터에서 테스트할 때는 괜찮지만,
            Vercel 배포에서는 꼭 Upstash Redis를 연결해 주세요. (README 참고)
          </div>
        )}
        {msg && <div className="warn">{msg}</div>}
        {error && <div className="warn">연결 오류: {error}</div>}

        {s && phase !== 'final' && <RoundPanel s={s} phase={phase} lastResult={lastResult} groups={groups} subs={subs} busy={busy} act={act} />}
        {phase === 'final' && <Final groups={groups} />}

        <div className="t-cols">
          <RankPanel groups={groups} />
          <Manage data={data} busy={busy} act={act} onLogout={onLogout} />
        </div>
      </main>
    </div>
  );
}

function RoundPanel({ s, phase, lastResult, groups, subs, busy, act }) {
  const showSubs = phase === 'invest';
  return (
    <div className="card stack">
      <h2>{s.title}</h2>
      <div className="answer">
        {['A', 'B'].map((k) => (
          <div key={k} className={`co ${k}`}>
            <div className="tag">{k}기업</div>
            <h3>{s.companies[k].name}</h3>
            <div>
              결과: <b className={s.result[k].gain > 0 ? 'up' : 'down'}>{s.result[k].text}</b>
              {phase !== 'result' && <span className="muted small"> (학생에겐 비공개)</span>}
            </div>
          </div>
        ))}
      </div>

      {phase !== 'ready' && (
        <>
          <h3>📝 모둠별 투자 이유</h3>
          <div className="reasons">
            {groups.map((g) => {
              const v = showSubs ? subs[g.id] : lastResult?.rows[g.id];
              return (
                <div key={g.id} className={v?.reason ? '' : 'empty'}>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                    <b>{groupLabel(g)}</b>
                    {v?.reason && <span className="small muted">{s.companies.A.name} {v.a} · {s.companies.B.name} {v.b}</span>}
                  </div>
                  <div>{v?.reason || (phase === 'invest' ? '아직 제출 전' : '미제출')}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {phase === 'result' && lastResult && (
        <>
          <h3>이번 라운드 결과</h3>
          <table className="tbl">
            <thead><tr><th>모둠</th><th>투자 전</th><th>{s.companies.A.name}</th><th>{s.companies.B.name}</th><th>투자 후</th><th>변화</th></tr></thead>
            <tbody>
              {groups.map((g) => {
                const r = lastResult.rows[g.id];
                if (!r) return null;
                const d = r.after - r.before;
                return (
                  <tr key={g.id}>
                    <td>{groupLabel(g)} {!r.submitted && <span className="badge wait">미제출</span>}</td>
                    <td>{r.before}</td><td>{r.a} <Delta d={r.dA} /></td><td>{r.b} <Delta d={r.dB} /></td><td><b>{r.after}</b></td>
                    <td className={d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}><b>{signed(d)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div><button className="danger small" disabled={busy} onClick={() => act('undoReveal', {}, '결과 공개를 취소하고 코인을 되돌릴까요?\n(다시 투자 중 상태가 돼요)')}>↩ 결과 공개 취소</button></div>
        </>
      )}
    </div>
  );
}

function Delta({ d }) {
  if (!d) return null;
  return <span className={d > 0 ? 'up' : 'down'} style={{ fontSize: 14 }}>({signed(d)})</span>;
}

function RankPanel({ groups }) {
  return (
    <div className="card">
      <h3>🏆 실시간 순위 <span className="muted small">(학생 화면에도 보여요)</span></h3>
      <ol className="rank-list">
        {rankList(groups).map((g) => (
          <li key={g.id}>
            <span className="rk">{g.rank}위</span>
            <span className="grow">{groupLabel(g)}</span>
            <b>{coin(g.coins)}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Final({ groups }) {
  return (
    <div className="card stack">
      <h2>🏆 최종 결과</h2>
      <ol className="rank-list big">
        {rankList(groups).map((g) => (
          <li key={g.id}>
            <span className="rk">{['🥇', '🥈', '🥉'][g.rank - 1] || `${g.rank}위`}</span>
            <span className="grow">{groupLabel(g)}</span>
            <b>{coin(g.coins)}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Manage({ data, busy, act, onLogout }) {
  const [start, setStart] = useState(String(data.startCoins));
  const [count, setCount] = useState(String(data.groups.length));
  const [gid, setGid] = useState('');
  const [coins, setCoins] = useState('');
  return (
    <div className="card stack">
      <h3>⚙️ 진행 관리</h3>
      <div>
        <div className="small muted">라운드로 바로 이동 (이동한 라운드는 '대기' 상태로 시작해요)</div>
        <div className="row" style={{ marginTop: 6 }}>
          {data.titles.map((t, i) => (
            <button key={i} className={`small ${i === data.round && data.phase !== 'final' ? 'primary' : ''}`} disabled={busy}
              onClick={() => act('goto', { round: i }, `${t}(으)로 이동할까요?\n(지금 라운드의 제출 내용은 지워져요)`)}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="small muted">모둠 수</div>
        <div className="row" style={{ marginTop: 6, flexWrap: 'nowrap' }}>
          <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} style={{ width: 90 }} />
          <span>모둠</span>
          <button className="small" disabled={busy || !count} onClick={() => act('setGroupCount', { count: Number(count) })}>적용</button>
        </div>
      </div>
      <div>
        <div className="small muted">모둠 코인 직접 수정</div>
        <div className="row" style={{ marginTop: 6, flexWrap: 'nowrap' }}>
          <select value={gid} onChange={(e) => setGid(e.target.value)} style={{ width: 110 }}>
            <option value="">모둠</option>
            {data.groups.map((g) => <option key={g.id} value={g.id}>{groupLabel(g)}</option>)}
          </select>
          <input placeholder="코인" inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value.replace(/\D/g, ''))} />
          <button className="small" disabled={busy || !gid || coins === ''} onClick={() => act('setCoins', { groupId: gid, coins: Number(coins) })}>적용</button>
        </div>
      </div>
      <div>
        <div className="small muted">처음부터 다시 (모든 모둠 코인 초기화, ROUND 1부터)</div>
        <div className="row" style={{ marginTop: 6, flexWrap: 'nowrap' }}>
          <input inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))} style={{ width: 120 }} />
          <span>코인으로</span>
          <button className="danger small" disabled={busy} onClick={() => act('reset', { startCoins: Number(start) }, '정말 처음부터 다시 시작할까요? 모든 기록이 지워집니다.')}>새 게임 시작</button>
        </div>
      </div>
      <div><button className="ghost small" onClick={onLogout}>로그아웃</button></div>
    </div>
  );
}
