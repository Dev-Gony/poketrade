package com.pocket.market.controller;

import com.pocket.market.dto.order.CreateOrderRequest;
import com.pocket.market.dto.order.OrderResponse;
import com.pocket.market.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Order", description = "즉시 구매 주문")
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "즉시 구매",
            description = "매물을 선점(RESERVED)하고 가상계좌를 발급한다. 이미 선점/판매된 매물이면 409.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(
            @Parameter(description = "구매자 ID (인증 연동 전 임시 헤더)", example = "2")
            @RequestHeader("X-User-Id") Long buyerId,
            @Valid @RequestBody CreateOrderRequest request) {
        return orderService.placeOrder(buyerId, request.listingId(), request.bank(), request.depositorName());
    }

    @Operation(summary = "주문 취소",
            description = "입금 전(PENDING_PAYMENT) 주문을 구매자가 취소하고 매물을 다시 판매중으로 돌린다. 이미 결제·만료·취소된 주문이면 409.")
    @PostMapping("/{orderId}/cancel")
    public OrderResponse cancelOrder(
            @Parameter(description = "구매자 ID (인증 연동 전 임시 헤더)", example = "2")
            @RequestHeader("X-User-Id") Long buyerId,
            @PathVariable Long orderId) {
        return orderService.cancelOrder(buyerId, orderId);
    }

    @Operation(summary = "주문 조회")
    @GetMapping("/{orderId}")
    public OrderResponse getOrder(@PathVariable Long orderId) {
        return orderService.getOrder(orderId);
    }
}
