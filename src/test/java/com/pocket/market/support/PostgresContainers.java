package com.pocket.market.support;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * 운영 DB(Neon)와 같은 PostgreSQL 을 Docker 컨테이너로 띄운다.
 * <p>
 * 사용법: 테스트 클래스에 {@code @Testcontainers(disabledWithoutDocker = true)} 와
 * {@code @ImportTestcontainers(PostgresContainers.class)} 를 붙인다.
 * {@code @ServiceConnection} 이 datasource 접속 정보를 컨테이너로 덮어쓰므로 H2 설정(test application.yml)이나
 * 실제 Neon DB 를 건드리지 않는다. 컨테이너는 JVM 당 1번만 뜨고 여러 테스트 클래스가 공유한다.
 */
public interface PostgresContainers {

    @ServiceConnection
    PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
}
