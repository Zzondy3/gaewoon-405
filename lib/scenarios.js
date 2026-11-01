// =============================================================
//  라운드(시나리오) 목록 — 이 파일만 고치면 라운드를 바꿀 수 있어요.
//  그래프·자료는 PPT로 보여 주고, 여기에는 기업 이름과 결과만 적어요.
//
//  result 의 값 (투자한 코인 기준으로 얼마나 늘거나 줄어드는지)
//    gain  : 2    = 투자한 코인의 2배 획득   (100 투자 → +200)
//            1    = 투자한 코인만큼 획득     (100 투자 → +100)
//            0    = 변화 없음
//            -0.5 = 투자한 코인의 절반 잃기 (100 투자 → -50)
//            -1   = 투자한 코인 잃기       (100 투자 → -100)
//    bonus : 그 기업에 1코인이라도 투자한 모둠에게 더 주는 보너스 코인
//  화면에 보이는 설명 문구("투자한 코인의 2배 획득" 등)는 자동으로 만들어져요.
// =============================================================

const scenarios = [
  {
    title: 'ROUND 1',
    companies: { A: { name: '후끈후끈제작소' }, B: { name: '따끈전기주식회사' } },
    result: { A: { gain: 2 }, B: { gain: -1 } },
  },
  {
    title: 'ROUND 2',
    companies: { A: { name: '황금붕어빵' }, B: { name: '베스킨13' } },
    result: { A: { gain: 2 }, B: { gain: -1 } },
  },
  {
    title: 'ROUND 3',
    companies: { A: { name: '에버파크' }, B: { name: '배달의 친구' } },
    result: { A: { gain: -1 }, B: { gain: 2 } },
  },
  {
    title: 'ROUND 4',
    companies: { A: { name: '말랑말랑 제작소' }, B: { name: '쫀득슬랑 컴퍼니' } },
    result: { A: { gain: 2 }, B: { gain: 2, bonus: 100 } },
  },
  {
    title: 'ROUND 5',
    companies: { A: { name: '애플망고 주식회사' }, B: { name: '삼삼전자 주식회사' } },
    result: { A: { gain: -1 }, B: { gain: -0.5 } },
  },
  {
    title: 'ROUND 6',
    companies: { A: { name: '퐁당도너츠' }, B: { name: '바삭크림 도넛' } },
    result: { A: { gain: 2 }, B: { gain: 2, bonus: 100 } },
  },
  {
    title: 'ROUND 7',
    companies: { A: { name: '신나라면' }, B: { name: '진짜라면' } },
    result: { A: { gain: 2 }, B: { gain: -1 } },
  },
];

export default scenarios;
