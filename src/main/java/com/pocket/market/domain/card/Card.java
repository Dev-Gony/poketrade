package com.pocket.market.domain.card;

import com.pocket.market.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * 카드 마스터(카탈로그) 정보. 실제 판매 단위는 {@link com.pocket.market.domain.listing.Listing}.
 * 프론트엔드는 이 정보만으로 목록·상세·결제 화면을 그린다.
 */
@Getter
@Entity
@Table(name = "cards")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Card extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 외부 노출용 카드 코드 (프론트엔드 URL 슬러그, 예: charizard-vmax-074) */
    @Column(nullable = false, unique = true, length = 64)
    private String code;

    /** 한국어 카드명 */
    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String nameEn;

    @Column(length = 100)
    private String nameJa;

    @Column(nullable = false, length = 100)
    private String setName;

    private Integer releaseYear;

    @Column(nullable = false, length = 30)
    private String cardNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CardRarity rarity;

    /** 카드 분류 (예: Pokémon VMAX, Trainer / Supporter) */
    @Column(length = 50)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private EnergyType energyType;

    /** 인쇄 언어 (ISO 639-1, 예: en, ja) */
    @Column(length = 5)
    private String printLanguage;

    @Column(length = 500)
    private String imageUrl;

    @Builder
    private Card(String code, String name, String nameEn, String nameJa, String setName, Integer releaseYear, String cardNumber,
                 CardRarity rarity, String category, EnergyType energyType, String printLanguage, String imageUrl) {
        this.code = code != null ? code : "card-" + UUID.randomUUID().toString().substring(0, 8);
        this.name = name;
        this.nameEn = nameEn;
        this.nameJa = nameJa;
        this.setName = setName;
        this.releaseYear = releaseYear;
        this.cardNumber = cardNumber;
        this.rarity = rarity;
        this.category = category;
        this.energyType = energyType;
        this.printLanguage = printLanguage;
        this.imageUrl = imageUrl;
    }

    /** 최소 정보로 카드 생성 (code 는 자동 생성) */
    public static Card create(String name, String setName, String cardNumber, CardRarity rarity, String imageUrl) {
        return builder().name(name).setName(setName).cardNumber(cardNumber).rarity(rarity).imageUrl(imageUrl).build();
    }
}
