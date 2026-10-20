# PokeTrade Vault

감정(PSA·BGS·CGC)을 받은 포켓몬 카드를 사고파는 C2C 마켓플레이스입니다.
Spring Boot REST API 백엔드와 Next.js 프론트엔드로 구성되어 있고, **즉시 구매 → 가상계좌 발급 → PG 입금 웹훅 → 판매 완료**까지의 거래 흐름이 실제로 동작합니다.

## 주요 기능

**백엔드**
- 즉시 구매 시 매물 행을 비관적 락(`SELECT … FOR UPDATE`)으로 잠가, 같은 카드에 동시 주문이 몰려도 1건만 성공
- 주문 생성과 함께 가상계좌 발급(은행·입금자명 지정), 24시간 입금 기한, 기한이 지난 주문은 스케줄러가 1분마다 만료 처리
- PG 입금 웹훅: 공유 시크릿 검증, 입금 금액 검증, 같은 거래의 재수신은 한 번만 반영(멱등성)
- 브라우저용 API(`/api/listings/**`, `/api/orders/**`)만 CORS 허용, 웹훅은 서버 간 호출 전용
- Swagger UI로 API 문서 제공

**프론트엔드**
- 마켓플레이스: 실시간 검색(한글·영문·일본어명, 세트명), 속성·등급·레어도 필터 칩, 가격 정렬·최신 등록순, 가격 범위 슬라이더
- 카드 상세: 3D 틸트 슬랩 뷰어, 시세 차트, 판매 상태(판매중 / 거래 진행 중 / 판매 완료) 반영
- 에스크로 결제: 가상계좌 발급 모달과 시연용 **모의 입금(웹훅 통보) 버튼**
- 한국어·영어·일본어, KRW/USD 환산(1 USD = 1,350 KRW), 다크/라이트 테마

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| 백엔드 | Java 17, Spring Boot 3.3, Spring Data JPA, Lombok, springdoc-openapi, Gradle 8.10 |
| DB | PostgreSQL (Neon), H2 (오프라인 개발·테스트), MySQL 프로필 예시 |
| 프론트엔드 | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3 |

## 폴더 구조

```
.
├── src/main/java/com/pocket/market
│   ├── config/         # CORS, JPA Auditing, Swagger, 로컬 시드 데이터
│   ├── controller/     # Listing, Order, Webhook REST 컨트롤러
│   ├── domain/         # User, Card, Listing, Order 엔티티
│   ├── dto/            # 요청/응답 DTO
│   ├── exception/      # ErrorCode, 전역 예외 처리
│   ├── repository/     # JPA 리포지토리 (비관적 락 조회 포함)
│   ├── scheduler/      # 입금 기한 만료 스케줄러
│   └── service/        # 주문, 웹훅, 가상계좌 발급
├── src/test/           # 동시성·웹훅·CORS 통합 테스트
└── frontend/
    └── src/
        ├── app/        # 페이지 (마켓, 카드 상세, 결제, 준비 중) + 모의 PG 라우트
        ├── components/ # Navbar, 슬랩 뷰어, 결제 패널 등
        ├── lib/        # 백엔드 API 클라이언트, 필터·정렬 로직
        ├── i18n/       # KO / EN / JA 번역
        └── data/       # 아직 API 가 없는 부가 시세 정보 (목업)
```

## 실행 방법

### 사전 준비
- JDK 17
- Node.js 18.17 이상 (20 LTS 권장)
- PostgreSQL 데이터베이스 (예: [Neon](https://neon.tech)). DB 없이 실행하려면 아래 [H2로 실행](#h2로-실행-db-없이)을 참고하세요.

### 1. 백엔드 (포트 8080)

DB 접속 정보는 Git에 올리지 않는 `.env.properties`에 둡니다.

```bash
cp .env.properties.example .env.properties
```

`.env.properties`에 JDBC 형식으로 접속 정보를 채웁니다. Neon 접속 문자열 `postgresql://USER:PASSWORD@HOST/DB?sslmode=require&channel_binding=require`를 아래처럼 나눠 적으면 됩니다.

```properties
DB_URL=jdbc:postgresql://<host>/<database>?sslmode=require&channelBinding=require
DB_USERNAME=<user>
DB_PASSWORD=<password>
```

서버를 실행합니다. 테이블은 자동으로 만들어지고(`ddl-auto: update`), DB가 비어 있으면 데모 매물 8건과 구매자 계정이 들어갑니다.

```bash
./gradlew bootRun
```

- Swagger UI: http://localhost:8080/swagger-ui.html
- API 문서(JSON): http://localhost:8080/v3/api-docs

#### H2로 실행 (DB 없이)

```bash
./gradlew bootRun --args='--spring.profiles.active=local,h2'
```

인메모리 DB라 서버를 다시 켜면 데이터가 초기화됩니다. H2 콘솔은 http://localhost:8080/h2-console (JDBC URL `jdbc:h2:mem:pocket`, 사용자 `sa`)입니다.

### 2. 프론트엔드 (포트 3000)

```bash
cd frontend
npm install
npm run dev
```

http://localhost:3000 에서 확인합니다. 기본 설정이 로컬 백엔드(`http://localhost:8080`)를 바라보므로 환경변수 없이 바로 동작합니다. 주소를 바꾸려면 `frontend/.env.example`을 `frontend/.env.local`로 복사해 수정하세요.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `BACKEND_URL` | `http://localhost:8080` | Next 서버가 호출하는 백엔드 주소 |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8080` | 브라우저가 직접 호출하는 백엔드 주소 (CORS) |
| `BACKEND_WEBHOOK_SECRET` | `local-webhook-secret` | 모의 입금 웹훅용 시크릿. 백엔드 `app.payment.webhook-secret`과 같아야 함 |
| `NEXT_PUBLIC_DEMO_BUYER_ID` | `1` | 데모 구매자 userId (시드의 `RedKetchum_99`) |

### 3. 테스트

```bash
./gradlew test
```

테스트는 항상 H2로 실행되며 실제 DB에 영향을 주지 않습니다.

| 테스트 | 검증 내용 |
| --- | --- |
| `OrderConcurrencyTest` | 같은 매물에 동시에 주문하면 1건만 성공하고 나머지는 `LISTING_NOT_AVAILABLE` |
| `PaymentWebhookServiceTest` | 정상 입금 시 주문 PAID·매물 SOLD, 금액 불일치 거부, 재수신 멱등 응답, 동시 수신 시 1회 반영, 다른 거래 ID 거부, 시크릿 검증 |
| `CorsConfigTest` | 프론트 출처의 preflight 허용, 외부 출처와 웹훅 경로는 거부 |

## 거래 흐름

```
[프론트] 즉시 구매 클릭
   │  POST /api/orders  (X-User-Id 헤더, 은행·입금자명)
   ▼
[백엔드] 매물 FOR UPDATE 잠금 → ON_SALE 이면 RESERVED 로 선점 → 주문 생성 + 가상계좌 발급
   │
[프론트] 가상계좌 발급 모달 → [모의 입금 완료] 클릭
   │  POST /api/mock-pg/deposit   (Next 서버 라우트 = 모의 PG)
   ▼
[Next 서버] POST /api/webhooks/payments/virtual-account  (X-Webhook-Secret)
   ▼
[백엔드] 시크릿·금액 검증, 중복 수신 확인 → 주문 PAID, 매물 SOLD
```

웹훅 시크릿이 브라우저에 노출되지 않도록, 모의 입금은 브라우저가 아니라 Next 서버가 백엔드로 보냅니다.

## API 요약

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/listings?status=ON_SALE,RESERVED,SOLD` | 매물 목록 (상태 여러 개 가능, 페이지네이션) |
| `GET` | `/api/listings/{listingId}` | 매물 상세 |
| `GET` | `/api/listings/by-card/{cardCode}` | 카드 코드(URL 슬러그)로 최근 매물 조회 |
| `POST` | `/api/listings` | 매물 등록 (`X-User-Id`: 판매자) |
| `POST` | `/api/orders` | 즉시 구매 + 가상계좌 발급 (`X-User-Id`: 구매자) |
| `GET` | `/api/orders/{orderId}` | 주문 조회 |
| `POST` | `/api/webhooks/payments/virtual-account` | PG 입금 통보 (`X-Webhook-Secret`) |

에러는 `{ "code": "L002", "message": "..." }` 형태로 응답합니다. 예를 들어 `L002`는 이미 거래 중이거나 판매된 매물, `P001`은 입금 금액 불일치입니다. 전체 목록은 [ErrorCode.java](src/main/java/com/pocket/market/exception/ErrorCode.java)를 참고하세요.

## 현재 한계

- **인증 없음:** 로그인 대신 `X-User-Id` 헤더로 사용자를 구분하는 임시 방식입니다. 프론트는 데모 구매자(userId 1)로 고정되어 있습니다.
- **PG 연동 없음:** 가상계좌는 임의 번호로 발급되며(`FakeVirtualAccountIssuer`), 카드·간편결제는 동작하지 않습니다.
- **일부 목업 데이터:** 30일 시세 변동률, 감정 개체수, 판매자 평점, 상단 실시간 체결 티커, 알림은 API가 없어 [marketInsights.ts](frontend/src/data/marketInsights.ts)와 [notifications.ts](frontend/src/lib/notifications.ts)의 목업 데이터를 씁니다.
- **DB 스키마 관리:** `ddl-auto: update`로 테이블을 자동 관리합니다. 운영 환경에서는 Flyway 같은 마이그레이션 도구와 `validate`를 권장합니다.

## 문제 해결

**Windows에서 Gradle이 `Unable to establish loopback connection`으로 실패할 때**

임시 폴더 경로가 `C:\Users\ADMINI~1\...`처럼 축약형이면 JDK가 내부 통신용 소켓 파일을 만들지 못해 생기는 문제입니다. 소켓 파일 위치를 다른 폴더로 지정하면 해결됩니다.

```powershell
$env:JAVA_TOOL_OPTIONS = "-Djdk.net.unixdomain.tmpdir=C:\github\pocket\.gradle-tmp"
.\gradlew.bat bootRun
```

## 이미지 출처

카드 이미지는 [Pokémon TCG API](https://pokemontcg.io) CDN을 사용합니다. 공식 CDN에 없는 일본 한정 카드 2종(피카츄 일러스트레이터, 릴리에 엑스트라 배틀)은 비슷한 카드 이미지로 대신했습니다. Pokémon 및 관련 상표는 Nintendo, Creatures, GAME FREAK, The Pokémon Company의 자산이며, 이 프로젝트는 학습·시연 목적의 비공식 프로젝트입니다.
