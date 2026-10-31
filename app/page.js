import Link from 'next/link';

export default function Home() {
  return (
    <main className="home">
      <h1>📈 그래프 투자 교실</h1>
      <p className="muted">꺾은선 그래프를 읽고, 어느 기업에 투자할지 모둠별로 정해 보세요.</p>
      <div className="links">
        <Link href="/student">🙋 학생 화면<span>모둠을 고르고 투자하기</span></Link>
        <Link href="/teacher">🧑‍🏫 선생님 화면<span>제출 현황 보기 · 결과 공개 · 다음 문제</span></Link>
        <Link href="/present">🖥️ 발표 화면 (선택)<span>그래프와 결과를 TV/프로젝터에 크게 띄우기</span></Link>
      </div>
    </main>
  );
}
