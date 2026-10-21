package com.pocket.market.service.payment.toss;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/** src/test/resources/toss 의 샘플 페이로드를 읽는다. {{orderId}} 는 주어진 주문번호로 치환한다. */
final class TossSamples {

    static final String SECRET = "ps_sample_secret_0123456789abcdef";
    static final String DONE_TRANSACTION_KEY = "9FF15E1A29D0E77C218F57262BFA4986";

    static final ObjectMapper MAPPER = JsonMapper.builder().findAndAddModules().build();

    private TossSamples() {
    }

    static String json(String name, String orderId) {
        try {
            String raw = new ClassPathResource("toss/" + name).getContentAsString(StandardCharsets.UTF_8);
            return raw.replace("{{orderId}}", orderId);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static <T> T read(String name, String orderId, Class<T> type) {
        try {
            return MAPPER.readValue(json(name, orderId), type);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
