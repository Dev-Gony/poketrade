# 토스페이먼츠 샘플 페이로드

토스페이먼츠 문서에 나온 필드 구조를 따라 만든 테스트용 샘플입니다. 실제 키·실제 결제에서 캡처한 값이 아닙니다.
`{{orderId}}` 는 테스트가 생성한 주문번호로 바꿔 씁니다. secret·paymentKey·transactionKey 는 모두 가짜 값입니다.

- `virtual-account-issued.json`: POST /v1/virtual-accounts 응답 (Payment 객체, WAITING_FOR_DEPOSIT)
- `payment-done.json`: GET /v1/payments/orders/{orderId} 응답 (입금 완료 후, DONE)
- `deposit-callback-done.json`: DEPOSIT_CALLBACK 웹훅 본문 (입금 완료)
- `deposit-callback-waiting.json`: DEPOSIT_CALLBACK 웹훅 본문 (입금 오류로 WAITING_FOR_DEPOSIT 복귀)

참고 문서
- https://docs.tosspayments.com/reference#가상계좌-발급-요청
- https://docs.tosspayments.com/reference/using-api/webhook-events
