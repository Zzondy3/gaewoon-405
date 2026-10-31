import { readAll, storageKind } from '@/lib/store';
import { publicScenario, totalRounds } from '@/lib/game';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { meta, subs } = await readAll();
  // 학생/발표 화면용: 다른 모둠의 투자 금액은 숨기고 제출 여부만 알려줌
  const submitted = Object.fromEntries(
    Object.entries(subs)
      .filter(([, v]) => v.round === meta.round)
      .map(([k]) => [k, true])
  );
  return Response.json(
    {
      storage: storageKind,
      totalRounds,
      round: meta.round,
      phase: meta.phase,
      groups: meta.groups,
      lastResult: meta.lastResult,
      submitted,
      scenario: publicScenario(meta.round, meta.phase),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
