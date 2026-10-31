// 저장소: Vercel의 Upstash Redis(KV)가 연결돼 있으면 사용하고,
// 없으면(내 컴퓨터에서 npm run dev) 메모리에 저장합니다.
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = process.env.GAME_KEY || 'invest-class:game';

export const storageKind = URL && TOKEN ? 'redis' : 'memory';

const mem = globalThis.__investMem || (globalThis.__investMem = new Map());

async function redis(args) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export function defaultMeta() {
  return {
    startCoins: 1000,
    round: 0,
    phase: 'invest', // invest | result | final
    groups: [1, 2, 3, 4, 5, 6].map((n) => ({ id: n, members: '', coins: 1000 })),
    lastResult: null,
    history: [],
  };
}

// 전체 상태 읽기 → { meta, subs: { [groupId]: {a,b,at,round} } }
export async function readAll() {
  let fields = {};
  if (storageKind === 'redis') {
    const arr = (await redis(['HGETALL', KEY])) || [];
    for (let i = 0; i < arr.length; i += 2) fields[arr[i]] = arr[i + 1];
  } else {
    fields = Object.fromEntries(mem);
  }
  const meta = fields.meta ? JSON.parse(fields.meta) : defaultMeta();
  const subs = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k.startsWith('sub:')) subs[k.slice(4)] = JSON.parse(v);
  }
  return { meta, subs };
}

export async function writeMeta(meta) {
  const v = JSON.stringify(meta);
  if (storageKind === 'redis') await redis(['HSET', KEY, 'meta', v]);
  else mem.set('meta', v);
}

export async function setSub(groupId, sub) {
  const v = JSON.stringify(sub);
  if (storageKind === 'redis') await redis(['HSET', KEY, `sub:${groupId}`, v]);
  else mem.set(`sub:${groupId}`, v);
}

export async function clearSubs(groupIds) {
  const fields = groupIds.map((id) => `sub:${id}`);
  if (!fields.length) return;
  if (storageKind === 'redis') await redis(['HDEL', KEY, ...fields]);
  else fields.forEach((f) => mem.delete(f));
}

export async function clearAll() {
  if (storageKind === 'redis') await redis(['DEL', KEY]);
  else mem.clear();
}
