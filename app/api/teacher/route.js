import { readAll, writeMeta, clearSubs, clearAll, defaultMeta, storageKind } from '@/lib/store';
import { computeResult, totalRounds, publicScenario, scenarioTitles } from '@/lib/game';

export const dynamic = 'force-dynamic';

const PIN = process.env.TEACHER_PIN || '1234';

export async function POST(req) {
  const body = await req.json();
  if (String(body.pin) !== PIN) {
    return Response.json({ ok: false, error: '비밀번호가 틀렸어요.' }, { status: 401 });
  }
  const { meta, subs } = await readAll();
  const ids = meta.groups.map((g) => g.id);
  const fail = (msg) => Response.json({ ok: false, error: msg }, { status: 400 });
  const ok = async () => { await writeMeta(meta); return Response.json({ ok: true }); };

  // 다음 라운드(또는 최종 결과)로 이동
  const advance = async () => {
    await clearSubs(ids);
    meta.lastResult = null;
    if (meta.round + 1 >= totalRounds) meta.phase = 'final';
    else { meta.round += 1; meta.phase = 'ready'; }
  };

  switch (body.action) {
    case 'login':
      return Response.json({ ok: true });

    // 선생님 화면용 전체 상태: 각 모둠 투자 금액·이유 + 결과 미리 보기
    case 'state':
      return Response.json(
        {
          ok: true,
          storage: storageKind,
          totalRounds,
          titles: scenarioTitles,
          round: meta.round,
          phase: meta.phase,
          startCoins: meta.startCoins,
          groups: meta.groups,
          lastResult: meta.lastResult,
          subs: Object.fromEntries(Object.entries(subs).filter(([, v]) => v.round === meta.round)),
          scenario: publicScenario(meta.round, meta.phase, { withAnswer: true }),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );

    case 'open': // 투자 시작
      if (meta.phase !== 'ready') return fail('지금은 투자를 시작할 수 없어요.');
      meta.phase = 'invest';
      return ok();

    case 'close': { // 투자 마감 → 바로 결과 공개
      if (meta.phase !== 'invest') return fail('투자 중이 아니에요.');
      const { groups, lastResult } = computeResult(meta, subs);
      meta.groups = groups;
      meta.lastResult = lastResult;
      meta.history = [...(meta.history || []), lastResult];
      meta.phase = 'result';
      return ok();
    }

    case 'undoReveal': {
      if (meta.phase !== 'result' || !meta.lastResult) return fail('되돌릴 결과가 없어요.');
      const rows = meta.lastResult.rows;
      meta.groups = meta.groups.map((g) => (rows[g.id] ? { ...g, coins: rows[g.id].before } : g));
      meta.history = (meta.history || []).slice(0, -1);
      meta.lastResult = null;
      meta.phase = 'invest';
      return ok();
    }

    case 'next':
      if (meta.phase !== 'result') return fail('먼저 결과를 공개해 주세요.');
      await advance();
      return ok();

    case 'skip': // 결과 반영 없이 이 라운드 건너뛰기
      if (meta.phase === 'final') return fail('이미 끝났어요.');
      if (meta.phase === 'result') return fail('결과가 공개된 라운드는 "다음 라운드"를 눌러 주세요.');
      await advance();
      return ok();

    case 'goto': {
      const r = Number(body.round);
      if (!(r >= 0 && r < totalRounds)) return fail('없는 라운드예요.');
      await clearSubs(ids);
      meta.round = r;
      meta.phase = 'ready';
      meta.lastResult = null;
      return ok();
    }

    case 'setGroupCount': {
      const n = Number(body.count);
      if (!Number.isInteger(n) || n < 1 || n > 12) return fail('모둠 수는 1~12 사이로 적어 주세요.');
      const old = Object.fromEntries(meta.groups.map((g) => [g.id, g]));
      meta.groups = Array.from({ length: n }, (_, i) => i + 1).map((id) => ({
        id,
        coins: old[id] ? old[id].coins : meta.startCoins,
      }));
      return ok();
    }

    case 'setCoins': {
      const g = meta.groups.find((x) => x.id === Number(body.groupId));
      const c = Number(body.coins);
      if (!g || !Number.isInteger(c) || c < 0) return fail('값을 확인해 주세요.');
      g.coins = c;
      return ok();
    }

    case 'reset': {
      const start = Number(body.startCoins) > 0 ? Math.floor(Number(body.startCoins)) : meta.startCoins;
      const fresh = defaultMeta();
      fresh.startCoins = start;
      fresh.groups = meta.groups.map((g) => ({ id: g.id, coins: start }));
      await clearAll();
      await writeMeta(fresh);
      return Response.json({ ok: true });
    }

    default:
      return fail('알 수 없는 요청');
  }
}
