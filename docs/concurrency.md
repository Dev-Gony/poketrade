# 두 명이 같은 카드를 동시에 사면, 왜 한 명만 성공하는가

> 1장뿐인 매물에 구매 요청이 동시에 들어올 때 PokeTrade 백엔드가 이중 판매를 막는 과정을 **코드 순서대로** 따라가고,
> 그 결과를 **직접 확인하는 방법 3가지**(GitHub Actions · 로컬 테스트 · API 호출)를 정리한 문서입니다.

**한 줄 요약**: 구매 트랜잭션이 매물 행을 `SELECT … FOR UPDATE`로 잠그고 상태를 확인한 뒤 바꾸기 때문에, 뒤에 온 요청은 앞 트랜잭션이 끝날 때까지 기다렸다가 **이미 바뀐 상태(`RESERVED`)를 읽고 실패**합니다.

---

## 1. 잠금이 없으면 무엇이 문제인가

"상태 확인 → 상태 변경"이 두 단계로 나뉘어 있으면, 두 트랜잭션이 확인 단계를 동시에 통과할 수 있습니다.

```
시간 →
구매자 A:  SELECT status → ON_SALE ──┐          UPDATE RESERVED · INSERT 주문 A
구매자 B:  SELECT status → ON_SALE ──┴─ 둘 다 "살 수 있음" ── UPDATE RESERVED · INSERT 주문 B   ← 이중 판매
```

카드는 1장인데 주문과 가상계좌가 2개 생기고, 두 사람 모두 입금하면 한 명에게는 카드를 줄 수 없습니다.

## 2. 코드 흐름 따라가기

| 순서 | 코드 | 하는 일 |
| --- | --- | --- |
| ① | [`OrderController`](../src/main/java/com/pocket/market/controller/OrderController.java) | `POST /api/orders` 요청을 받아 `OrderService.placeOrder` 호출 (`@Transactional` 시작) |
| ② | [`OrderService.placeOrder` L60–62](../src/main/java/com/pocket/market/service/OrderService.java#L60-L62) | `lockTimeout.apply()`로 대기 상한(3초)을 건 뒤 `listingRepository.findByIdForUpdate(listingId)`로 **매물 행 잠금 획득** |
| ③ | [`ListingRepository.findByIdForUpdate` L24–26](../src/main/java/com/pocket/market/repository/ListingRepository.java#L24-L26) | `@Lock(PESSIMISTIC_WRITE)` → SQL `select … from listings where id=? for update` |
| ④ | [`OrderService` L68](../src/main/java/com/pocket/market/service/OrderService.java#L68) → [`Listing.reserve` L101–103](../src/main/java/com/pocket/market/domain/listing/Listing.java#L101-L103) | 상태가 `ON_SALE`이면 `RESERVED`로 전이, 아니면 `LISTING_NOT_AVAILABLE` 예외 |
| ⑤ | [`OrderService` L71](../src/main/java/com/pocket/market/service/OrderService.java#L71) | 주문 생성(금액 스냅샷) + 가상계좌 발급 → 커밋하면서 **잠금 해제** |
| ⑥ | [`ErrorCode` L23](../src/main/java/com/pocket/market/exception/ErrorCode.java#L23) | 실패한 요청은 `409 { "code": "L002" }`로 응답 |

핵심은 **②에서 잠금을 잡은 뒤에 ④에서 상태를 확인**한다는 점입니다. 확인과 변경 사이에 다른 트랜잭션이 끼어들 수 없습니다.

## 3. 두 트랜잭션의 실제 순서

```mermaid
sequenceDiagram
    autonumber
    participant A as 구매자 A (트랜잭션 1)
    participant DB as listings 행 (id=2)
    participant B as 구매자 B (트랜잭션 2)

    A->>DB: SELECT … FOR UPDATE
    DB-->>A: 잠금 획득 · status = ON_SALE
    B->>DB: SELECT … FOR UPDATE
    Note over B,DB: A 가 잠금을 쥐고 있어 여기서 대기
    A->>DB: UPDATE status = RESERVED, INSERT 주문 A
    A->>DB: COMMIT (잠금 해제)
    DB-->>B: 잠금 획득 · status = RESERVED (A 가 바꾼 값)
    B->>B: listing.reserve() → LISTING_NOT_AVAILABLE
    B->>DB: ROLLBACK
    Note over A,B: A = 201 Created (가상계좌 발급) / B = 409 L002
```

- B는 "먼저 읽고 나중에 실패"하는 것이 아니라, **A의 결과가 확정된 뒤에야 읽습니다.** 그래서 B는 주문 생성이나 가상계좌 발급 같은 작업을 하기 전에 바로 실패합니다.
- 잠금 대기는 최대 3초입니다. PostgreSQL에서는 잠금 조회 직전에 [`LockTimeout`](../src/main/java/com/pocket/market/repository/LockTimeout.java)이 현재 트랜잭션에만 `lock_timeout = 3000ms`를 겁니다(`SET LOCAL`과 같아서 커넥션 풀로 새지 않습니다). 시간이 초과되면 PostgreSQL이 `55P03 lock_not_available`을 내고, Spring이 이를 `PessimisticLockingFailureException`으로 바꾸며, [`GlobalExceptionHandler` L46](../src/main/java/com/pocket/market/exception/GlobalExceptionHandler.java#L46)이 `409 C002`(잠시 후 다시 시도)로 응답합니다.
- JPA 힌트 `jakarta.persistence.lock.timeout`만으로는 안 됩니다. Hibernate 6의 PostgreSQL 방언은 이 값을 SQL로 옮기지 못해(PostgreSQL에는 `FOR UPDATE WAIT n`이 없습니다) 그냥 `for update`를 보냅니다. 실제로 힌트만 둔 상태에서 잠금을 15초 쥐고 있었더니 요청도 15초를 다 기다렸습니다. 그래서 힌트를 지우고 `lock_timeout`으로 바꿨습니다.

## 4. 직접 확인하는 방법

### ① GitHub Actions에서 보기 (설치 없이)

저장소의 **Actions → CI → 최근 실행 → Summary**에 테스트 결과 표와 아래 줄이 표시됩니다.

```
LockTimeoutPostgresTest — 매물 행 잠금 중 구매 요청 → HTTP 409, 3020 ms 대기 후 응답
LockTimeoutPostgresTest — 주문 행 잠금 중 입금 웹훅 → HTTP 409, 3351 ms 대기 후 응답
OrderConcurrencyPostgresTest — 20명 동시 주문 → 성공 1건, 실패 19건 (LISTING_NOT_AVAILABLE 19건), 생성된 주문 1건, 매물 상태 RESERVED
OrderConcurrencyTest — 20명 동시 주문 → 성공 1건, 실패 19건 (LISTING_NOT_AVAILABLE 19건), 생성된 주문 1건, 매물 상태 RESERVED
PaymentWebhookServicePostgresTest — 같은 웹훅 8건 동시 수신 → PROCESSED 1건, ALREADY_PROCESSED 7건, 예외 0건, 매물 상태 SOLD
PaymentWebhookServiceTest — 같은 웹훅 8건 동시 수신 → PROCESSED 1건, ALREADY_PROCESSED 7건, 예외 0건, 매물 상태 SOLD
```

`…PostgresTest`는 같은 테스트를 PostgreSQL 16 컨테이너에서 실행한 결과이고, 이름에 `Postgres`가 없는 것은 H2 결과입니다. CI는 PostgreSQL 테스트가 건너뛰어지면 실패하도록 되어 있습니다.

전체 HTML 테스트 리포트는 같은 실행의 `backend-test-report` 아티팩트로 내려받을 수 있습니다.

### ② 로컬에서 테스트 실행

```bash
./gradlew test --tests "*OrderConcurrency*"
```

H2용 `OrderConcurrencyTest`와 PostgreSQL용 `OrderConcurrencyPostgresTest`가 함께 실행됩니다. PostgreSQL 쪽은 [Testcontainers](../src/test/java/com/pocket/market/support/PostgresContainers.java)가 Docker로 `postgres:16-alpine`을 띄워 실행하며, Docker가 없으면 건너뜁니다(H2 테스트는 그대로 실행).

[`OrderConcurrencyTest`](../src/test/java/com/pocket/market/service/OrderConcurrencyTest.java#L79-L126)가 하는 일은 다음과 같습니다.

1. 판매자 1명, 매물 1건, **서로 다른 구매자 20명**을 만듭니다.
2. 20개 스레드를 `CountDownLatch`로 대기시켰다가 **같은 순간에 출발**시킵니다([L104](../src/test/java/com/pocket/market/service/OrderConcurrencyTest.java#L104)).
3. 성공 1건, 실패 19건(모두 `LISTING_NOT_AVAILABLE`), 주문 행 1개, 매물 `RESERVED`를 검증합니다([L117–126](../src/test/java/com/pocket/market/service/OrderConcurrencyTest.java#L117-L126)).

잠금 대기 상한은 [`LockTimeoutPostgresTest`](../src/test/java/com/pocket/market/service/LockTimeoutPostgresTest.java)가 검증합니다. 다른 트랜잭션이 매물 행(또는 주문 행)을 `FOR UPDATE`로 쥔 채 놓지 않게 한 뒤 구매 API(또는 입금 웹훅)를 호출하고, 약 3초 뒤 `409 C002`가 오는지와 매물·주문 상태가 그대로인지 확인합니다.

테스트는 H2 인메모리 DB나 테스트가 직접 띄운 컨테이너에서만 실행되므로 실제 DB(Neon)에 영향을 주지 않습니다.

### ③ API로 재현하기

DB 없이 H2로 백엔드를 띄웁니다(데모 매물 8건이 들어갑니다).

```bash
./gradlew bootRun --args='--server.port=8081 --spring.profiles.active=local,h2'
```

다른 터미널에서 **구매자 1과 2가 매물 2번을 동시에** 주문합니다.

```bash
for buyer in 1 2; do
  curl -s -o /dev/null -w "buyer $buyer → HTTP %{http_code}\n" \
    -X POST http://localhost:8081/api/orders \
    -H 'Content-Type: application/json' -H "X-User-Id: $buyer" \
    -d '{"listingId":2}' &
done; wait
```

실제 실행 결과(누가 이길지는 실행마다 다릅니다):

```
buyer 1 → HTTP 201   (PENDING_PAYMENT, 가상계좌 발급)
buyer 2 → HTTP 409   (L002 이미 판매되었거나 거래 진행 중인 매물입니다.)
```

이후 `GET http://localhost:8081/api/listings/2`의 `status`는 `RESERVED`입니다.

## 5. 다른 방법 대신 비관적 락을 고른 이유

| 방법 | 이 상황에서의 판단 |
| --- | --- |
| 낙관적 락 (`@Version`) | 충돌을 커밋 시점에야 알기 때문에, 진 쪽도 주문 생성·가상계좌 발급까지 하고 롤백됩니다. 재고가 1개라 경합 시 성공자는 어차피 한 명뿐입니다. |
| 조건부 UPDATE (`… WHERE status='ON_SALE'`) | 가장 가볍지만 상태 전이 규칙이 엔티티 밖 SQL로 흩어집니다. 유력한 대안입니다. |
| Redis 분산 락 | 단일 DB 안의 정합성 문제에 인프라를 추가하는 셈이고, 락 만료와 트랜잭션 경계를 따로 맞춰야 합니다. |
| **비관적 락** | 진입 시점에 줄을 세우고, 진 쪽은 바뀐 상태를 읽고 즉시 실패합니다. 트랜잭션이 짧아(선점 + 주문 INSERT) 대기도 짧습니다. |

## 6. 같은 원리로 막는 것: 웹훅 중복 반영

PG 입금 웹훅도 같은 방식으로 처리합니다. [`PaymentWebhookService` L48–49](../src/main/java/com/pocket/market/service/PaymentWebhookService.java#L48-L49)에서 **주문 행을 `FOR UPDATE`로 잠근 뒤** 이미 같은 거래로 결제됐는지 확인합니다([L52–54](../src/main/java/com/pocket/market/service/PaymentWebhookService.java#L52-L54)).

- 그래서 같은 웹훅 8건이 동시에 와도 결제 반영은 1번이고, 나머지 7건은 `ALREADY_PROCESSED`로 응답합니다.
- `orders.pg_transaction_id`의 UNIQUE 제약([`Order` L72–73](../src/main/java/com/pocket/market/domain/order/Order.java#L72-L73))이 마지막 방어선입니다.

자세한 내용은 [README의 웹훅 멱등성 절](../README.md#5-핵심-문제-해결--가상계좌-웹훅-멱등성-보장)을 참고하세요.

## 7. 알려진 한계

PostgreSQL에서 확인된 것과 아직 남은 것을 나눠 적습니다.

**PostgreSQL 16에서 검증됨** (Testcontainers, CI에서 매번 실행)
- 20명 동시 주문 → 1건만 성공 (`OrderConcurrencyPostgresTest`)
- 같은 웹훅 8건 동시 수신 → 결제 반영 1회, 나머지 `ALREADY_PROCESSED` (`PaymentWebhookServicePostgresTest`, 웹훅 테스트 6개 전부)
- 잠금 대기 3초 초과 시 구매·웹훅 모두 `409 C002`로 실패하고 데이터는 그대로 (`LockTimeoutPostgresTest`)

**남은 한계**
- **Neon 고유 동작:** 테스트는 일반 PostgreSQL 16 컨테이너에서 돌기 때문에, Neon의 커넥션 풀러(PgBouncer)나 컴퓨트 일시 중지 같은 환경 차이는 검증하지 않습니다. `lock_timeout`은 트랜잭션 단위(`set_config(…, true)`)로 걸어 트랜잭션 모드 풀러에서도 다른 요청에 새지 않도록 했습니다.
- **대기 상한 값:** 3초(`app.lock.timeout-ms`)는 트랜잭션이 짧다는 가정에서 정한 값이며 부하 테스트로 정한 값은 아닙니다.
- **H2·MySQL 프로필:** H2는 JDBC URL의 `LOCK_TIMEOUT`이 상한을 맡고, `mysql` 프로필에는 DB 수준 상한(`innodb_lock_wait_timeout`)을 따로 설정하지 않았습니다.
- **웹훅 재전송:** `409 C002`를 받은 PG는 웹훅을 다시 보낸다고 가정합니다(멱등 처리이므로 재전송은 안전). 실제 PG의 재시도 정책은 연동 시 확인이 필요합니다.
