package com.pocket.market.service;

import com.pocket.market.support.PostgresContainers;
import org.springframework.boot.testcontainers.context.ImportTestcontainers;
import org.testcontainers.junit.jupiter.Testcontainers;

/** {@link OrderConcurrencyTest} 를 운영 DB 와 같은 PostgreSQL 16 에서 그대로 실행한다. Docker 가 없으면 건너뛴다. */
@Testcontainers(disabledWithoutDocker = true)
@ImportTestcontainers(PostgresContainers.class)
class OrderConcurrencyPostgresTest extends OrderConcurrencyTest {
}
