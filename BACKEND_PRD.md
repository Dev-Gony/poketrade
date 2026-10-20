# [PRD] PokeTrade Backend - Java/Spring Boot 기반 C2C 카드 거래 & 결제 API 서버

## 1. 프로젝트 개요 (Overview)
- **프로젝트명:** PokeTrade Backend API
- **목표:** 한정판 포켓몬 수집 카드를 거래하는 C2C 플랫폼의 REST API 서버 구축.
- **핵심 역량 어필 포인트:**
  1. 단일 매물에 대한 동시 구매 요청 제어 (DB 비관적 락 / 트랜잭션 격리).
  2. 가상계좌 입금 및 카드 결제 웹훅(Webhook) 처리 및 멱등성(Idempotency) 보장.
  3. 실무 표준 3계층 아키텍처(Controller - Service - Repository) 및 DTO 분리.

---

## 2. 기술 스택 (Tech Stack)
- **Language:** Java 17
- **Framework:** Spring Boot 3.3+
- **Build Tool:** Gradle (Groovy 또는 Kotlin DSL)
- **Database:** MariaDB (또는 MySQL 8.0) / 로컬 H2 (테스트용)
- **ORM / Persistence:** Spring Data JPA
- **API Doc:** Springdoc-OpenAPI (Swagger UI)
- **Utilities:** Lombok

---

## 3. 핵심 도메인 및 DB 스키마 설계

### 3.1. Entity 관계
- `User` (1) : `Listing` (N) - 판매자 매물
- `Card` (1) : `Listing` (N) - 카드 메타정보와 매물
- `Listing` (1) : `Order` (1) - 매물과 주문 거래

### 3.2. DDL 명세
```sql
-- 1. 사용자 (Users)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    nickname VARCHAR(50) NOT NULL,
    balance BIGINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 카드 마스터 (Cards)
CREATE TABLE cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    set_name VARCHAR(100) NOT NULL,
    card_number VARCHAR(50) NOT NULL,
    rarity VARCHAR(50) NOT NULL,
    image_url VARCHAR(500) NOT NULL
);

-- 3. 판매 매물 (Listings)
CREATE TABLE listings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    card_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    price INT NOT NULL,
    grade VARCHAR(30) DEFAULT 'Ungraded', -- e.g., PSA 10, Near Mint
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, PENDING_PAYMENT, SOLD
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_listings_card FOREIGN KEY (card_id) REFERENCES cards(id),
    CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- 4. 주문 및 결제 (Orders)
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(64) NOT NULL UNIQUE, -- 주문 고유 UUID
    listing_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    total_amount INT NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- CARD, VIRTUAL_ACCOUNT
    payment_status VARCHAR(30) DEFAULT 'WAITING_FOR_DEPOSIT', -- WAITING_FOR_DEPOSIT, COMPLETED, CANCELLED
    virtual_account_no VARCHAR(100),
    idempotency_key VARCHAR(100) UNIQUE, -- 웹훅 중복 처리 방지 키
    webhook_received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_listing FOREIGN KEY (listing_id) REFERENCES listings(id),
    CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id)
);

4. 핵심 REST API 명세 (API Endpoints)
4.1. 매물 조회 (Listings)
GET /api/v1/listings: 매물 목록 조회 (페이징, 상태 필터 status=ACTIVE)

GET /api/v1/listings/{id}: 특정 카드 매물 상세 조회

4.2. 주문 및 구매 트랜잭션 (Orders)
POST /api/v1/orders: 즉시 구매 요청

요청 Body: { "listingId": 1, "buyerId": 2, "paymentMethod": "VIRTUAL_ACCOUNT" }

비즈니스 로직 (동시성 제어):

해당 Listing을 SELECT ... FOR UPDATE (비관적 락)으로 조회.

매물 상태가 ACTIVE인지 검증. 이미 판매 중이거나 판매 완료된 경우 409 Conflict 반환.

Listing 상태를 PENDING_PAYMENT로 변경 후 Order 레코드 생성 (상태: WAITING_FOR_DEPOSIT).

4.3. 결제 웹훅 수신 (Webhooks - 핵심 면접 포인트)
POST /api/v1/webhooks/payment: PG사 가상계좌 입금 통보 수신

요청 Body: { "orderNo": "ORD-123456", "depositAmount": 150000, "status": "PAID" }

비즈니스 로직 (검증 및 멱등성):

주문 번호(orderNo)로 기존 Order 조회.

전달받은 depositAmount와 DB의 total_amount 일치 여부 검증 (위변조 방지).

이미 COMPLETED 상태인 경우 로직을 무시하고 200 OK 응답 (멱등성 보장).

정상 건일 경우 orders.payment_status = 'COMPLETED', listings.status = 'SOLD'로 트랜잭션 내 일괄 업데이트.

5. 비기능적 요구사항
예외 처리: @RestControllerAdvice를 활용한 전역 예외 처리(GlobalExceptionHandler) 및 표준 에러 응답(ErrorResponse) 규격 통일.

테스트 코드: 구매 동시성 제어(ExecutorService 기반 멀티스레드 동시 주문 테스트) 단위/통합 테스트 코드 작성.