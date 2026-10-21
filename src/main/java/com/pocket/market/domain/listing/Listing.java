package com.pocket.market.domain.listing;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.common.BaseTimeEntity;
import com.pocket.market.domain.user.User;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 판매자가 등록한 단일 카드 매물. 재고는 1개(단품)이며 상태 전이로 재고를 표현한다.
 * ON_SALE -> RESERVED(주문 생성) -> SOLD(입금 완료) / RESERVED -> ON_SALE(주문 만료·구매자 취소)
 */
@Getter
@Entity
@Table(name = "listings", indexes = @Index(name = "idx_listings_status", columnList = "status"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Listing extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @Column(nullable = false)
    private Long price;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_condition", nullable = false, length = 20)
    private CardCondition condition;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ListingStatus status;

    /** 감정(그레이딩) 업체. 미감정 카드는 null */
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private GradeCompany gradeCompany;

    /** 감정 점수 (예: 10, 9.5) */
    @Column(length = 5)
    private String gradeScore;

    /** 감정 인증번호 */
    @Column(length = 20)
    private String certNumber;

    private Listing(User seller, Card card, Long price, CardCondition condition, String description) {
        this.seller = seller;
        this.card = card;
        this.price = price;
        this.condition = condition;
        this.description = description;
        this.status = ListingStatus.ON_SALE;
    }

    public static Listing create(User seller, Card card, Long price, CardCondition condition, String description) {
        if (price == null || price <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "가격은 0보다 커야 합니다.");
        }
        return new Listing(seller, card, price, condition, description);
    }

    /** 감정 슬랩 정보 등록 */
    public void assignGrade(GradeCompany company, String score, String certNumber) {
        this.gradeCompany = company;
        this.gradeScore = score;
        this.certNumber = certNumber;
    }

    public boolean isSoldBy(Long userId) {
        return seller.getId().equals(userId);
    }

    /** 재고 선점. 반드시 비관적 락으로 조회한 엔티티에서 호출해야 한다. */
    public void reserve() {
        if (status != ListingStatus.ON_SALE) {
            throw new BusinessException(ErrorCode.LISTING_NOT_AVAILABLE);
        }
        this.status = ListingStatus.RESERVED;
    }

    public void markSold() {
        if (status != ListingStatus.RESERVED) {
            throw new BusinessException(ErrorCode.INVALID_LISTING_STATE);
        }
        this.status = ListingStatus.SOLD;
    }

    public void release() {
        if (status != ListingStatus.RESERVED) {
            throw new BusinessException(ErrorCode.INVALID_LISTING_STATE);
        }
        this.status = ListingStatus.ON_SALE;
    }
}
