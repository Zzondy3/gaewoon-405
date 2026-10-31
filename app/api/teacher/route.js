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

  switch (body.action) {
    case 'login':
      return Response.json({ ok: true });

    // 선생님 화면용 전체 상태: 각 모둠 투자 금액 + 정답(수익률) 미리 보기
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

    case 'reveal': {
      if (meta.phase !== 'invest') return fail('이미 결과가 공개됐어요.');
      const { groups, lastResult } = computeResult(meta, subs);
      meta.groups = groups;
      meta.lastResult = lastResult;
      meta.history = [...(meta.history || []), lastResult];
      meta.phase = 'result';
      await writeMeta(meta);
      return Response.json({ ok: true });
    }

    case 'undoReveal': {
      if (meta.phase !== 'result' || !meta.lastResult) return fail('되돌릴 결과가 없어요.');
      const rows = meta.lastResult.rows;
      meta.groups = meta.groups.map((g) => (rows[g.id] ? { ...g, coins: rows[g.id].before } : g));
      meta.history = (meta.history || []).slice(0, -1);
      meta.lastResult = null;
      meta.phase = 'invest';
      await writeMeta(meta);
      return Response.json({ ok: true });
    }

    case 'next': {
      if (meta.phase === 'invest') return fail('먼저 결과를 공개해 주세요.');
      await clearSubs(ids);
      if (meta.round + 1 >= totalRounds) {
        meta.phase = 'final';
      } else {
        meta.round += 1;
        meta.phase = 'invest';
        meta.lastResult = null;
      }
      await writeMeta(meta);
      return Response.json({ ok: true });
    }

    case 'goto': {
      const r = Number(body.round);
      if (!(r >= 0 && r < totalRounds)) return fail('없는 문제예요.');
      await clearSubs(ids);
      meta.round = r;
      meta.phase = 'invest';
      meta.lastResult = null;
      await writeMeta(meta);
      return Response.json({ ok: true });
    }

    case 'saveGroups': {
      const list = (body.groups || [])
        .map((g) => ({ id: Number(g.id), members: String(g.members || '').trim() }))
        .filter((g) => Number.isInteger(g.id) && g.id > 0);
      if (new Set(list.map((g) => g.id)).size !== list.length) return fail('모둠 번호가 겹쳐요.');
      const old = Object.fromEntries(meta.groups.map((g) => [g.id, g]));
      meta.groups = list
        .sort((x, y) => x.id - y.id)
        .map((g) => ({ ...g, coins: old[g.id] ? old[g.id].coins : meta.startCoins }));
      await writeMeta(meta);
      return Response.json({ ok: true });
    }

    case 'setCoins': {
      const g = meta.groups.find((x) => x.id === Number(body.groupId));
      const c = Number(body.coins);
      if (!g || !Number.isInteger(c) || c < 0) return fail('값을 확인해 주세요.');
      g.coins = c;
      await writeMeta(meta);
      return Response.json({ ok: true });
    }

    case 'reset': {
      const start = Number(body.startCoins) > 0 ? Math.floor(Number(body.startCoins)) : meta.startCoins;
      const fresh = defaultMeta();
      fresh.startCoins = start;
      fresh.groups = meta.groups.map((g) => ({ ...g, coins: start }));
      await clearAll();
      await writeMeta(fresh);
      return Response.json({ ok: true });
    }

    default:
      return fail('알 수 없는 요청');
  }
}
