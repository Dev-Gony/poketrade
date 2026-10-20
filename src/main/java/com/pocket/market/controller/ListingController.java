package com.pocket.market.controller;

import com.pocket.market.domain.listing.ListingStatus;
import com.pocket.market.dto.listing.CreateListingRequest;
import com.pocket.market.dto.listing.ListingResponse;
import com.pocket.market.service.ListingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Listing", description = "카드 매물")
@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    @Operation(summary = "매물 등록")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ListingResponse createListing(
            @Parameter(description = "판매자 ID (인증 연동 전 임시 헤더)", example = "1")
            @RequestHeader("X-User-Id") Long sellerId,
            @Valid @RequestBody CreateListingRequest request) {
        return listingService.createListing(sellerId, request);
    }

    @Operation(summary = "매물 목록 조회", description = "상태별 페이지 조회 (기본: 판매중). 여러 상태는 status=ON_SALE,RESERVED 처럼 콤마로 구분")
    @GetMapping
    public Page<ListingResponse> getListings(
            @RequestParam(defaultValue = "ON_SALE") List<ListingStatus> status,
            @ParameterObject @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return listingService.getListings(status, pageable);
    }

    @Operation(summary = "카드 코드로 매물 조회", description = "프론트엔드 URL 슬러그(카드 코드)로 가장 최근 매물을 조회한다. 상태 무관.")
    @GetMapping("/by-card/{cardCode}")
    public ListingResponse getListingByCardCode(@PathVariable String cardCode) {
        return listingService.getListingByCardCode(cardCode);
    }

    @Operation(summary = "매물 상세 조회")
    @GetMapping("/{listingId}")
    public ListingResponse getListing(@PathVariable Long listingId) {
        return listingService.getListing(listingId);
    }
}
