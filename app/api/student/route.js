import { readAll, setSub } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { groupId, a, b, round, reason } = await req.json();
  const why = String(reason || '').trim().slice(0, 150);
  const { meta } = await readAll();
  const g = meta.groups.find((x) => String(x.id) === String(groupId));
  const A = Number(a);
  const B = Number(b);
  const fail = (msg) => Response.json({ ok: false, error: msg }, { status: 400 });

  if (!g) return fail('모둠을 찾을 수 없어요.');
  if (meta.phase !== 'invest') return fail('지금은 투자할 수 없어요.');
  if (round !== meta.round) return fail('문제가 바뀌었어요. 화면을 새로고침 해 주세요.');
  if (![A, B].every((n) => Number.isInteger(n) && n >= 0)) return fail('0 이상의 정수로 적어 주세요.');
  if (A + B > g.coins) return fail(`가진 코인(${g.coins})보다 많이 투자할 수 없어요.`);

  if (!why) return fail('투자 이유를 적어 주세요.');

  await setSub(g.id, { a: A, b: B, reason: why, round: meta.round, at: Date.now() });
  return Response.json({ ok: true });
}
