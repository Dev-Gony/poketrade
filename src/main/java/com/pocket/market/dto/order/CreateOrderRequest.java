package com.pocket.market.dto.order;

import com.pocket.market.service.payment.VirtualAccountBank;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateOrderRequest(
        @Schema(description = "즉시 구매할 매물 ID", example = "1")
        @NotNull Long listingId,

        @Schema(description = "가상계좌 발급 은행 (기본: KB)", example = "SHINHAN")
        VirtualAccountBank bank,

        @Schema(description = "입금자명 (기본: 구매자 닉네임)", example = "홍길동")
        @Size(max = 20) String depositorName
) {
}
