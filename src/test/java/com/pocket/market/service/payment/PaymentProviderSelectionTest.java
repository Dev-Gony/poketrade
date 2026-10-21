package com.pocket.market.service.payment;

import com.pocket.market.controller.TossWebhookController;
import com.pocket.market.service.payment.toss.TossPaymentsClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PaymentProviderSelectionTest {

    @Autowired
    private ApplicationContext context;

    @Test
    @DisplayName("provider 설정이 없으면 키 없이 동작하는 FakeVirtualAccountIssuer 가 쓰이고 토스 빈은 만들지 않는다")
    void fakeIsDefault() {
        assertThat(context.getBean(VirtualAccountIssuer.class)).isInstanceOf(FakeVirtualAccountIssuer.class);
        assertThat(context.getBeanNamesForType(TossPaymentsClient.class)).isEmpty();
        assertThat(context.getBeanNamesForType(TossWebhookController.class)).isEmpty();
    }
}
