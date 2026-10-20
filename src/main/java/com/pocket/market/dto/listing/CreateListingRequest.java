package com.pocket.market.dto.listing;

import com.pocket.market.domain.listing.CardCondition;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateListingRequest(
        @Schema(description = "판매할 카드 ID", example = "1")
        @NotNull Long cardId,

        @Schema(description = "판매 가격(원)", example = "15000")
        @NotNull @Positive Long price,

        @Schema(description = "카드 상태", example = "MINT")
        @NotNull CardCondition condition,

        @Schema(description = "매물 설명", example = "슬리브 보관")
        @Size(max = 1000) String description
) {
}
