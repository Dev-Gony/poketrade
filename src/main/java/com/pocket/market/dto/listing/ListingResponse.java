package com.pocket.market.dto.listing;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.card.CardRarity;
import com.pocket.market.domain.card.EnergyType;
import com.pocket.market.domain.listing.CardCondition;
import com.pocket.market.domain.listing.GradeCompany;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;

import java.time.LocalDateTime;

public record ListingResponse(
        Long listingId,
        Long sellerId,
        String sellerNickname,
        CardSummary card,
        Long price,
        CardCondition condition,
        Grade grade,
        String description,
        ListingStatus status,
        LocalDateTime createdAt
) {

    public record CardSummary(Long cardId, String code, String name, String nameEn, String nameJa, String setName,
                              Integer releaseYear, String cardNumber, CardRarity rarity, String category,
                              EnergyType energyType, String printLanguage, String imageUrl) {

        static CardSummary from(Card card) {
            return new CardSummary(card.getId(), card.getCode(), card.getName(), card.getNameEn(), card.getNameJa(),
                    card.getSetName(), card.getReleaseYear(), card.getCardNumber(), card.getRarity(), card.getCategory(),
                    card.getEnergyType(), card.getPrintLanguage(), card.getImageUrl());
        }
    }

    /** 감정 슬랩 정보. 미감정 매물은 null */
    public record Grade(GradeCompany company, String score, String certNumber) {

        static Grade from(Listing listing) {
            return listing.getGradeCompany() == null ? null
                    : new Grade(listing.getGradeCompany(), listing.getGradeScore(), listing.getCertNumber());
        }
    }

    public static ListingResponse from(Listing listing) {
        return new ListingResponse(
                listing.getId(),
                listing.getSeller().getId(),
                listing.getSeller().getNickname(),
                CardSummary.from(listing.getCard()),
                listing.getPrice(),
                listing.getCondition(),
                Grade.from(listing),
                listing.getDescription(),
                listing.getStatus(),
                listing.getCreatedAt()
        );
    }
}
