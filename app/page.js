'use client';
import { useEffect, useState } from 'react';
import usePoll from '@/lib/usePoll';
import { pct, signed, coin, groupLabel } from '@/lib/format';

const LS_KEY = 'invest-class:group';

async function getState() {
  const r = await fetch('/api/state', { cache: 'no-store' });
  if (!r.ok) throw new Error('서버 연결 오류');
  return r.json();
}

export default function StudentPage() {
  const [groupId, setGroupId] = useState(null);
  const [ready, setReady] = useState(false);
  const { data, error, refresh } = usePoll(getState, 2500);

  useEffect(() => {
    try { setGroupId(localStorage.getItem(LS_KEY)); } catch {}
    setReady(true);
  }, []);

  const choose = (id) => {
    try { id ? localStorage.setItem(LS_KEY, id) : localStorage.removeItem(LS_KEY); } catch {}
    setGroupId(id);
  };

  if (!ready || !data) {
    return <main className="student"><p className="muted">불러오는 중…</p>{error && <p className="error">{error}</p>}</main>;
  }

  const group = data.groups.find((g) => String(g.id) === String(groupId));
  if (!group) return <PickGroup groups={data.groups} onPick={choose} />;

  return (
    <main className="student">
      <header>
        <div>
          <h2>{groupLabel(group)}</h2>
          <div className="muted small">{group.members || ' '}</div>
        </div>
        <button className="ghost small" onClick={() => choose(null)}>모둠 바꾸기</button>
      </header>
      {error && <p className="error small">연결이 잠시 끊겼어요. 자동으로 다시 시도해요.</p>}
      <Body data={data} group={group} refresh={refresh} />
    </main>
  );
}

function PickGroup({ groups, onPick }) {
  return (
    <main className="student stack">
      <h2>우리 모둠을 골라 주세요</h2>
      <div className="group-pick">
        {groups.map((g) => (
          <button key={g.id} onClick={() => onPick(String(g.id))}>
            <b style={{ fontSize: 20 }}>{groupLabel(g)}</b>
            <div className="muted small">{g.members || '모둠원 이름 미입력'}</div>
          </button>
        ))}
      </div>
    </main>
  );
}

function Body({ data, group, refresh }) {
  const s = data.scenario;
  const { phase, round, totalRounds } = data;

  if (phase === 'final') {
    const sorted = [...data.groups].sort((a, b) => b.coins - a.coins);
    const rank = sorted.findIndex((g) => g.id === group.id) + 1;
    return (
      <div className="card stack" style={{ textAlign: 'center' }}>
        <div className="muted">모든 문제가 끝났어요!</div>
        <div className="coins">{coin(group.coins)}</div>
        <div className="rank">🏆 {rank}등</div>
        <div className="look-up">👀 앞 화면을 봐 주세요</div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="muted small">문제 {round + 1} / {totalRounds} · {s.title}</div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <span className="muted">{phase === 'result' ? '투자 전 코인' : '우리 모둠 코인'}</span>
          <span className="coins">{coin(phase === 'result' && data.lastResult?.rows[group.id] ? data.lastResult.rows[group.id].before : group.coins)}</span>
        </div>
      </div>
      {phase === 'invest' ? (
        <InvestForm key={round} data={data} group={group} refresh={refresh} />
      ) : (
        <Result data={data} group={group} />
      )}
    </div>
  );
}

function InvestForm({ data, group, refresh }) {
  const s = data.scenario;
  const submitted = !!data.submitted[group.id];
  const saved = loadDraft(data.round, group.id);
  const [a, setA] = useState(saved?.a ?? '');
  const [b, setB] = useState(saved?.b ?? '');
  const [reason, setReason] = useState(saved?.reason ?? '');
  const [editing, setEditing] = useState(!submitted);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const A = toInt(a);
  const B = toInt(b);
  const keep = group.coins - A - B;
  const over = keep < 0;
  const invalid = [a, b].some((v) => v !== '' && !/^\d+$/.test(String(v)));
  const noReason = reason.trim() === '';

  // 다른 기기에서 이미 제출된 경우 → 제출 완료 화면으로
  useEffect(() => { if (submitted && !busy && !confirm) setEditing(false); }, [submitted]); // eslint-disable-line

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id, a: A, b: B, reason: reason.trim(), round: data.round }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      saveDraft(data.round, group.id, { a: A, b: B, reason: reason.trim() });
      setConfirm(false); setEditing(false);
      refresh();
    } catch (e) {
      setErr(e.message || '제출하지 못했어요.');
    } finally { setBusy(false); }
  };

  if (!editing) {
    const d = loadDraft(data.round, group.id);
    return (
      <div className="card stack" style={{ textAlign: 'center' }}>
        <div><span className="badge ok">✔ 제출 완료</span></div>
        {d && (
          <div style={{ fontSize: 19 }}>
            <b style={{ color: 'var(--a)' }}>{s.companies.A.name}</b> {coin(d.a)} ·{' '}
            <b style={{ color: 'var(--b)' }}>{s.companies.B.name}</b> {coin(d.b)}
          </div>
        )}
        {d?.reason && <div className="reason-box">💬 {d.reason}</div>}
        <div className="look-up">👀 앞 화면을 봐 주세요</div>
        <button className="ghost" onClick={() => setEditing(true)}>✏️ 수정하기</button>
      </div>
    );
  }

  return (
    <>
      <div className="co-grid">
        {['A', 'B'].map((k) => (
          <label key={k} className={`co ${k}`}>
            <div className="tag">{k}기업</div>
            <h3>{s.companies[k].name}</h3>
            <input
              type="text" inputMode="numeric" placeholder="0"
              value={k === 'A' ? a : b}
              onChange={(e) => (k === 'A' ? setA : setB)(e.target.value.replace(/[^\d]/g, ''))}
            />
            <div className="unit">코인 투자</div>
          </label>
        ))}
      </div>
      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">투자하지 않고 남는 코인</span>
        <b className={over ? 'error' : ''} style={{ fontSize: 22 }}>{coin(keep)}</b>
      </div>
      {over && <p className="error">가진 코인보다 많이 투자할 수 없어요.</p>}
      <label className="card" style={{ display: 'block' }}>
        <b>왜 이렇게 투자했나요?</b>
        <div className="muted small" style={{ marginBottom: 8 }}>그래프에서 무엇을 보고 결정했는지 간단히 적어 주세요.</div>
        <textarea rows={3} maxLength={150} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="예: 기온이 계속 오르고 있어서 시원한 음료가 더 많이 팔릴 것 같아요." />
        <div className="muted small" style={{ textAlign: 'right' }}>{reason.length}/150</div>
      </label>
      <button className="primary big" disabled={over || invalid || noReason} onClick={() => { setErr(''); setConfirm(true); }}>
        {submitted ? '수정해서 다시 제출' : '제출하기'}
      </button>
      {submitted && <button className="ghost" onClick={() => setEditing(false)}>수정 취소</button>}

      {confirm && (
        <div className="modal-bg" onClick={() => !busy && setConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>이렇게 투자하시겠습니까?</h2>
            <table>
              <tbody>
                <tr><td style={{ color: 'var(--a)' }}>{s.companies.A.name}</td><td>{coin(A)}</td></tr>
                <tr><td style={{ color: 'var(--b)' }}>{s.companies.B.name}</td><td>{coin(B)}</td></tr>
                <tr><td className="muted">남기는 코인</td><td>{coin(keep)}</td></tr>
              </tbody>
            </table>
            <div className="reason-box" style={{ marginBottom: 16 }}>💬 {reason.trim()}</div>
            {err && <p className="error">{err}</p>}
            <div className="row">
              <button className="grow" disabled={busy} onClick={() => setConfirm(false)}>다시 생각하기</button>
              <button className="primary grow" disabled={busy} onClick={submit}>{busy ? '제출 중…' : '네, 제출!'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Result({ data, group }) {
  const s = data.scenario;
  const row = data.lastResult?.rows[group.id];
  if (!row) return <div className="look-up">👀 앞 화면을 봐 주세요</div>;
  const diff = row.after - row.before;
  return (
    <div className="card stack" style={{ textAlign: 'center' }}>
      <div className="row" style={{ justifyContent: 'center', gap: 20, fontSize: 18 }}>
        <span><b style={{ color: 'var(--a)' }}>{s.companies.A.name}</b> <b className={s.result.A >= 0 ? 'up' : 'down'}>{pct(s.result.A)}</b></span>
        <span><b style={{ color: 'var(--b)' }}>{s.companies.B.name}</b> <b className={s.result.B >= 0 ? 'up' : 'down'}>{pct(s.result.B)}</b></span>
      </div>
      <div style={{ fontSize: 20 }}>
        {coin(row.before)} → <b className="coins">{coin(row.after)}</b>
      </div>
      <div className={diff > 0 ? 'up' : diff < 0 ? 'down' : 'muted'} style={{ fontSize: 26, fontWeight: 800 }}>
        {signed(diff)}코인 {diff > 0 ? '📈' : diff < 0 ? '📉' : ''}
      </div>
      {!row.submitted && <div className="muted small">이번 문제는 제출하지 않아 코인이 그대로예요.</div>}
      <div className="look-up">👀 앞 화면에서 이유를 확인해요</div>
    </div>
  );
}

function toInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; }
function draftKey(round, gid) { return `invest-class:draft:${gid}:${round}`; }
function loadDraft(round, gid) {
  try { return JSON.parse(localStorage.getItem(draftKey(round, gid)) || 'null'); } catch { return null; }
}
function saveDraft(round, gid, v) {
  try { localStorage.setItem(draftKey(round, gid), JSON.stringify(v)); } catch {}
}
