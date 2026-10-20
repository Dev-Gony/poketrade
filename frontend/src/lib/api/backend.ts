// Spring Boot 백엔드(pocket-market) API 타입과 호출 헬퍼.
// - 서버 컴포넌트/라우트 핸들러: BACKEND_URL(기본 http://localhost:8080) 로 호출
// - 브라우저: NEXT_PUBLIC_BACKEND_URL 로 직접 호출. 백엔드 WebConfig 의 CORS 설정(/api/listings/**, /api/orders/**)이 허용한다.

export type ListingStatus = "ON_SALE" | "RESERVED" | "SOLD";
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "EXPIRED";
export type BackendBankCode = "KB" | "SHINHAN" | "TOSS" | "WOORI" | "HANA";
export type BackendCardRarity = "C" | "U" | "R" | "RR" | "SR" | "SAR" | "UR" | "PROMO";
export type BackendEnergyType =
  | "FIRE"
  | "WATER"
  | "LIGHTNING"
  | "GRASS"
  | "PSYCHIC"
  | "FIGHTING"
  | "DARKNESS"
  | "METAL"
  | "DRAGON"
  | "COLORLESS"
  | "TRAINER";
export type BackendGradeCompany = "PSA" | "BGS" | "CGC";

/** GET /api/listings, /api/listings/by-card/{code} */
export type ListingResponse = {
  listingId: number;
  sellerId: number;
  sellerNickname: string;
  card: {
    cardId: number;
    code: string | null;
    /** 한국어 카드명 */
    name: string;
    nameEn: string | null;
    nameJa: string | null;
    setName: string;
    releaseYear: number | null;
    cardNumber: string;
    rarity: BackendCardRarity;
    category: string | null;
    energyType: BackendEnergyType | null;
    printLanguage: string | null;
    imageUrl: string | null;
  };
  price: number;
  condition: string;
  /** 감정 슬랩 정보. 미감정 매물은 null */
  grade: { company: BackendGradeCompany; score: string; certNumber: string | null } | null;
  description: string | null;
  status: ListingStatus;
  createdAt: string;
};

/** Spring Data PagedModel 직렬화 형태 */
export type PagedResponse<T> = {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
};

/** POST /api/orders, GET /api/orders/{id} */
export type OrderResponse = {
  orderId: number;
  orderNo: string;
  buyerId: number;
  listingId: number;
  amount: number;
  status: OrderStatus;
  virtualAccount: {
    bankCode: BackendBankCode | null;
    bankName: string | null;
    accountNumber: string | null;
    depositorName: string | null;
  };
  /** 서버 로컬 시각(Asia/Seoul), 타임존 표기 없음 */
  paymentDueAt: string;
  paidAt: string | null;
  pgTransactionId: string | null;
  createdAt: string;
};

/** POST /api/webhooks/payments/virtual-account */
export type WebhookResponse = {
  result: "PROCESSED" | "ALREADY_PROCESSED" | "IGNORED";
  orderNo: string;
};

/** GlobalExceptionHandler 의 ErrorResponse */
export type BackendErrorBody = {
  code: string;
  message: string;
};

/** 백엔드 ErrorCode.code 값 중 화면에서 구분해 안내하는 것들 */
export const BACKEND_ERROR_CODES = {
  LISTING_NOT_FOUND: "L001",
  LISTING_NOT_AVAILABLE: "L002",
  SELF_PURCHASE_NOT_ALLOWED: "L004",
  USER_NOT_FOUND: "U001",
  LOCK_ACQUISITION_FAILED: "C002",
} as const;

export class BackendError extends Error {
  constructor(
    readonly status: number,
    /** 백엔드 ErrorCode.code (예: L002). 연결 실패 시 "NETWORK" */
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }

  get isUnavailable() {
    return this.code === "NETWORK" || this.status >= 500;
  }
}

/** 서버(Next 서버 컴포넌트·라우트 핸들러)에서 보는 백엔드 주소 */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** 브라우저에서 보는 백엔드 주소 (빌드 시 번들에 포함되므로 NEXT_PUBLIC_ 접두사) */
export const PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(base: string, path: string, { method = "GET", body, headers }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // 재고 상태(판매중/거래중/판매완료)가 바로 반영돼야 하므로 캐시하지 않는다.
      cache: "no-store",
    });
  } catch (cause) {
    throw new BackendError(0, "NETWORK", cause instanceof Error ? cause.message : "Backend unreachable");
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as Partial<BackendErrorBody> | null;
    throw new BackendError(response.status, error?.code ?? (response.status >= 500 ? "NETWORK" : "UNKNOWN"), error?.message ?? response.statusText);
  }
  return (await response.json()) as T;
}

/** 서버 컴포넌트·라우트 핸들러 전용 (BACKEND_URL 직접 호출) */
export const serverApi = <T>(path: string, options?: RequestOptions) => request<T>(`${BACKEND_URL}/api`, path, options);

/** 브라우저 전용 (CORS 로 백엔드 직접 호출) */
export const browserApi = <T>(path: string, options?: RequestOptions) => request<T>(`${PUBLIC_BACKEND_URL}/api`, path, options);

/**
 * 백엔드 LocalDateTime(타임존 없음, Asia/Seoul 기준)을 Date 로 변환한다.
 * 브라우저 타임존과 무관하게 같은 시각을 가리키도록 +09:00 을 붙인다.
 */
export function parseServerDateTime(value: string) {
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}+09:00`);
}
