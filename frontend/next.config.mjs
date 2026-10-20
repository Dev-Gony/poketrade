/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 실행 중인 dev 서버(.next)를 건드리지 않고 빌드 검증할 수 있도록 출력 폴더를 바꿀 수 있게 한다.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // 매물 상태(판매중/거래중/판매완료)는 결제 직후 바뀌므로, 클라이언트 라우터가 동적 페이지를 캐시하지 않게 한다.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
