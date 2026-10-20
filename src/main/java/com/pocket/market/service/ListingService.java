package com.pocket.market.service;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;
import com.pocket.market.domain.user.User;
import com.pocket.market.dto.listing.CreateListingRequest;
import com.pocket.market.dto.listing.ListingResponse;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.repository.CardRepository;
import com.pocket.market.repository.ListingRepository;
import com.pocket.market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ListingService {

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final CardRepository cardRepository;

    @Transactional
    public ListingResponse createListing(Long sellerId, CreateListingRequest request) {
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Card card = cardRepository.findById(request.cardId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));

        Listing listing = listingRepository.save(
                Listing.create(seller, card, request.price(), request.condition(), request.description()));
        return ListingResponse.from(listing);
    }

    public ListingResponse getListing(Long listingId) {
        return listingRepository.findWithDetailsById(listingId)
                .map(ListingResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.LISTING_NOT_FOUND));
    }

    public Page<ListingResponse> getListings(Collection<ListingStatus> statuses, Pageable pageable) {
        return listingRepository.findByStatusIn(statuses, pageable).map(ListingResponse::from);
    }

    public ListingResponse getListingByCardCode(String cardCode) {
        return listingRepository.findFirstByCardCodeOrderByIdDesc(cardCode)
                .map(ListingResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.LISTING_NOT_FOUND));
    }
}
