'use client';
import { useEffect, useState } from 'react';
import usePoll from '@/lib/usePoll';
import { pct, signed, coin, groupLabel } from '@/lib/format';

const PIN_KEY = 'invest-class:pin';

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
  const doneCount = groups.filter((g) => subs[g.id]).length;
  const allDone = doneCount === groups.length && groups.length > 0;
  const isLast = round + 1 >= totalRounds;

  const reveal = () =>
    act('reveal', {}, allDone ? null : `아직 ${groups.length - doneCount}개 모둠이 제출하지 않았어요.\n제출하지 않은 모둠은 코인이 그대로 유지됩니다. 결과를 공개할까요?`);

  return (
    <div className="teacher">
      {/* ── 항상 보이는 상단: 진행 버튼 + 모둠 현황 ── */}
      <div className="t-top">
        <div className="t-bar">
          <h1>문제 {round + 1}/{totalRounds} · {s?.title}</h1>
          <span className={`badge ${phase === 'invest' ? 'live' : ''}`}>
            {phase === 'invest' ? `투자 중 · ${doneCount}/${groups.length} 제출` : phase === 'result' ? '결과 공개됨' : '최종 결과'}
          </span>
          <div className="grow" />
          {phase === 'invest' && (
            <button className={allDone ? 'primary' : ''} style={allDone ? { background: '#22c55e' } : {}} disabled={busy} onClick={reveal}>
              📊 결과 보기
            </button>
          )}
          {phase === 'result' && (
            <button className="primary" style={{ background: '#2563eb' }} disabled={busy} onClick={() => act('next')}>
              {isLast ? '🏆 최종 결과로' : '다음 문제로 ▶'}
            </button>
          )}
          <a href="/present" target="_blank" rel="noreferrer"><button className="ghost" style={{ color: '#fff', borderColor: '#4b5563' }}>🖥️ 발표 화면</button></a>
        </div>
        <div className="t-groups">
          {groups.map((g) => {
            const sub = subs[g.id];
            const row = lastResult?.rows[g.id];
            return (
              <div key={g.id} className={`g-card ${phase === 'invest' && sub ? 'done' : ''}`}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
                  <span className="gn">{groupLabel(g)}</span>
                  <span className="gc">{coin(g.coins)}</span>
                </div>
                <div className="gm" title={g.members}>{g.members || '이름 미입력'}</div>
                <div className="gs">
                  {phase === 'invest' && (sub
                    ? <span><span className="badge ok">제출</span> A {sub.a} · B {sub.b}</span>
                    : <span className="badge wait">대기 중…</span>)}
                  {phase !== 'invest' && row && (
                    <span className={row.after - row.before > 0 ? 'up' : row.after - row.before < 0 ? 'down' : 'muted'}>
                      <b>{signed(row.after - row.before)}</b> <span className="muted">(A {row.a} · B {row.b})</span>
                    </span>
                  )}
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

        {s && phase !== 'final' && <RoundPanel s={s} phase={phase} lastResult={lastResult} groups={groups} busy={busy} act={act} />}
        {phase === 'final' && <Final groups={groups} />}

        <div className="t-cols">
          <GroupEditor groups={groups} busy={busy} act={act} />
          <Manage data={data} busy={busy} act={act} onLogout={onLogout} />
        </div>
      </main>
    </div>
  );
}

function RoundPanel({ s, phase, lastResult, groups, busy, act }) {
  return (
    <div className="card stack">
      <div>
        <h2>{s.title}</h2>
        <div className="muted">{s.story}</div>
        <div><b>해석 질문:</b> {s.question}</div>
      </div>
      <div className="answer">
        {['A', 'B'].map((k) => (
          <div key={k} className={`co ${k}`}>
            <div className="tag">{k}기업</div>
            <h3>{s.companies[k].name}</h3>
            <div className="small">{s.companies[k].desc}</div>
            <div style={{ marginTop: 6 }}>
              결과 수익률 <b className={s.result[k] >= 0 ? 'up' : 'down'} style={{ fontSize: 20 }}>{pct(s.result[k])}</b>
              {phase === 'invest' && <span className="muted small"> (학생에겐 비공개)</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="small muted"><b>결과 해설:</b> {s.result.headline} — {s.result.explanation}</div>

      {phase === 'result' && lastResult && (
        <>
          <h3>이번 문제 결과</h3>
          <table className="tbl">
            <thead><tr><th>모둠</th><th>투자 전</th><th>A 투자</th><th>B 투자</th><th>투자 후</th><th>변화</th></tr></thead>
            <tbody>
              {groups.map((g) => {
                const r = lastResult.rows[g.id];
                if (!r) return null;
                const d = r.after - r.before;
                return (
                  <tr key={g.id}>
                    <td>{groupLabel(g)} {!r.submitted && <span className="badge wait">미제출</span>}</td>
                    <td>{r.before}</td><td>{r.a}</td><td>{r.b}</td><td><b>{r.after}</b></td>
                    <td className={d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}><b>{signed(d)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div><button className="danger small" disabled={busy} onClick={() => act('undoReveal', {}, '결과 공개를 취소하고 코인을 되돌릴까요?')}>↩ 결과 공개 취소</button></div>
        </>
      )}
    </div>
  );
}

function Final({ groups }) {
  const sorted = [...groups].sort((a, b) => b.coins - a.coins);
  return (
    <div className="card stack">
      <h2>🏆 최종 결과</h2>
      <table className="tbl">
        <thead><tr><th>순위</th><th>모둠</th><th>코인</th></tr></thead>
        <tbody>
          {sorted.map((g, i) => (
            <tr key={g.id}><td>{i + 1}등</td><td style={{ textAlign: 'left' }}>{groupLabel(g)} <span className="muted small">{g.members}</span></td><td><b>{coin(g.coins)}</b></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupEditor({ groups, busy, act }) {
  const [rows, setRows] = useState(null);
  const editing = rows !== null;
  const list = rows ?? groups.map((g) => ({ id: g.id, members: g.members }));
  const update = (i, k, v) => setRows(list.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>👥 모둠 설정</h3>
        {!editing && <button className="small" onClick={() => setRows(list)}>편집</button>}
      </div>
      {list.map((r, i) => (
        <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
          <input style={{ width: 70 }} disabled={!editing} value={r.id} onChange={(e) => update(i, 'id', e.target.value.replace(/\D/g, ''))} />
          <span>모둠</span>
          <input className="grow" disabled={!editing} placeholder="모둠원 이름 (예: 김민수, 이서연, 박지호)" value={r.members} onChange={(e) => update(i, 'members', e.target.value)} />
          {editing && <button className="danger small" onClick={() => setRows(list.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      {editing && (
        <div className="row">
          <button className="small" onClick={() => setRows([...list, { id: Math.max(0, ...list.map((r) => Number(r.id) || 0)) + 1, members: '' }])}>+ 모둠 추가</button>
          <div className="grow" />
          <button className="small ghost" onClick={() => setRows(null)}>취소</button>
          <button className="small primary" disabled={busy} onClick={async () => { await act('saveGroups', { groups: list }); setRows(null); }}>저장</button>
        </div>
      )}
    </div>
  );
}

function Manage({ data, busy, act, onLogout }) {
  const [start, setStart] = useState(String(data.startCoins));
  const [gid, setGid] = useState('');
  const [coins, setCoins] = useState('');
  return (
    <div className="card stack">
      <h3>⚙️ 진행 관리</h3>
      <div>
        <div className="small muted">문제로 바로 이동 (해당 문제의 제출 내용은 지워져요)</div>
        <div className="row" style={{ marginTop: 6 }}>
          {data.titles.map((t, i) => (
            <button key={i} className={`small ${i === data.round ? 'primary' : ''}`} disabled={busy}
              onClick={() => act('goto', { round: i }, `${i + 1}번 문제(${t})로 이동할까요?`)}>{i + 1}. {t}</button>
          ))}
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
        <div className="small muted">처음부터 다시 (모든 모둠 코인 초기화, 모둠 이름은 유지)</div>
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
