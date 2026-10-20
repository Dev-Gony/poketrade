// Pokémon TCG API(https://pokemontcg.io) 연동.
// 백엔드에 연결할 수 없을 때 마켓을 실제 카드 50장으로 채우기 위한 외부 카탈로그다.
// - 카드 정보(이름·이미지·세트·번호·레어도·속성)는 API 원문을 쓰고,
// - C2C 거래 속성(시세·감정 등급·판매자·인증번호)은 카드 ID 시드로 결정적으로 부여한다.
// - 결과는 1시간 캐시(unstable_cache)하고, 실패는 캐시하지 않는다(호출부가 로컬 데모 데이터로 대체).

import "server-only";
import { unstable_cache } from "next/cache";
import type { BackendCardRarity, BackendEnergyType, BackendGradeCompany, ListingResponse, ListingStatus } from "@/lib/api/backend";
import { pick, randomBetween, randomDigits, randomInt, seededRandom, weightedPick, type Rng } from "@/lib/seeded";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const QUERY = 'supertype:Pokémon (subtypes:VMAX OR subtypes:VSTAR OR rarity:"Special Illustration Rare" OR rarity:"Rare Holo")';
const PAGE_SIZE = 50;
const CACHE_SECONDS = 3600;

/**
 * API 가 절반 가까운 확률로 500/502 를 즉시(1초 이내) 돌려주므로 여러 번 빠르게 재시도하되,
 * 페이지 렌더가 오래 멈추지 않게 전체 시간을 제한한다.
 */
const MAX_ATTEMPTS = 6;
const ATTEMPT_TIMEOUT_MS = 8_000;
const TOTAL_BUDGET_MS = 12_000;
/** 실패 직후에는 잠시 재호출하지 않는다 (API 장애 동안 매 요청이 느려지는 것을 방지) */
const FAILURE_COOLDOWN_MS = 30_000;

type TcgCard = {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  types?: string[];
  rarity?: string;
  number: string;
  set: { id: string; name: string; series?: string; releaseDate?: string; printedTotal?: number; total?: number };
  images: { small: string; large: string };
};

let lastFailureAt = 0;
/** 마지막으로 성공한 결과. 캐시가 만료된 뒤 API 가 실패하면 로컬 데모 대신 이 값을 쓴다. */
let lastGood: ListingResponse[] | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestCards(): Promise<TcgCard[]> {
  const params = new URLSearchParams({
    q: QUERY,
    pageSize: String(PAGE_SIZE),
    // 최신 세트부터 받아 SIR·ex 등 요즘 인기 카드 위주로 구성한다.
    orderBy: "-set.releaseDate",
    select: "id,name,supertype,subtypes,types,rarity,number,set,images",
  });
  const headers: Record<string, string> = { Accept: "application/json" };
  // API 키가 있으면 호출 한도가 늘어난다 (선택).
  if (process.env.POKEMON_TCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;

  const startedAt = Date.now();
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 500) break;
    try {
      const response = await fetch(`${API_URL}?${params}`, {
        headers,
        // unstable_cache 가 결과를 캐시하므로 fetch 자체는 매번 원본을 요청한다.
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { data?: TcgCard[] };
      const cards = (body.data ?? []).filter((card) => card.images?.large && /^[A-Za-z0-9.-]+$/.test(card.id));
      if (cards.length === 0) throw new Error("empty result");
      return cards;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(Math.min(250 * attempt, 1_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Pokémon TCG API request failed");
}

// ---------------------------------------------------------------------------
// API 카드 → 백엔드 ListingResponse 형태로 매핑
// ---------------------------------------------------------------------------

const ENERGY_TYPES: Record<string, BackendEnergyType> = {
  Fire: "FIRE",
  Water: "WATER",
  Lightning: "LIGHTNING",
  Grass: "GRASS",
  Psychic: "PSYCHIC",
  // 페어리 타입은 스칼렛·바이올렛부터 초(Psychic) 타입으로 통합됐다.
  Fairy: "PSYCHIC",
  Fighting: "FIGHTING",
  Darkness: "DARKNESS",
  Metal: "METAL",
  Dragon: "DRAGON",
  Colorless: "COLORLESS",
};

function toRarity(rarity: string | undefined): BackendCardRarity {
  const r = (rarity ?? "").toLowerCase();
  if (r.includes("special illustration")) return "SAR";
  if (r.includes("hyper") || r.includes("secret") || r.includes("rainbow")) return "UR";
  if (r.includes("illustration")) return "SR";
  if (r.includes("promo")) return "PROMO";
  // Rare Holo / VMAX / VSTAR / GX / EX / ex / Double·Ultra Rare 는 모두 홀로 카드
  if (r.includes("holo") || r.includes("ultra") || r.includes("double")) return "RR";
  return "R";
}

/** 카드 분류 표기 (예: Pokémon VMAX, Pokémon ex) */
function toCategory(card: TcgCard) {
  const mechanics = (card.subtypes ?? []).filter((s) => !/^(Basic|Stage \d|Restored|Baby|LEVEL-UP|Single Strike|Rapid Strike|Fusion Strike)$/i.test(s));
  return mechanics.length > 0 ? `Pokémon ${mechanics.join(" ")}` : "Pokémon";
}

/** 시세 기준가(PSA 10 기준, KRW) 범위. 레어도·인기 포켓몬·발매 연도에 따라 달라진다. */
function basePriceRange(card: TcgCard, rarity: BackendCardRarity, year: number): [number, number] {
  const ranges: Record<BackendCardRarity, [number, number]> = {
    SAR: [350_000, 3_500_000],
    UR: [400_000, 2_800_000],
    SR: [150_000, 900_000],
    RR: [120_000, 1_200_000],
    PROMO: [150_000, 1_500_000],
    R: [80_000, 400_000],
    U: [80_000, 200_000],
    C: [80_000, 150_000],
  };
  let [min, max] = ranges[rarity];
  // 인기 포켓몬 프리미엄
  if (/charizard|pikachu|umbreon|rayquaza|mew\b|mewtwo|lugia|gengar|eevee|giratina|greninja/i.test(card.name)) {
    min *= 2.2;
    max *= 3;
  }
  // 오래된 세트일수록 희소성 프리미엄 (2010년 이전 홀로 등)
  if (year && year < 2010) {
    min *= 2.5;
    max *= 4;
  }
  return [min, max];
}

const GRADES: readonly (readonly [{ company: BackendGradeCompany; score: string } | null, number])[] = [
  [{ company: "PSA", score: "10" }, 40],
  [{ company: "PSA", score: "9" }, 25],
  [{ company: "BGS", score: "9.5" }, 15],
  [null, 20], // Raw (미감정)
];

/** 감정 등급에 따른 가격 배율 (PSA 10 = 1.0) */
function gradeMultiplier(grade: { company: BackendGradeCompany; score: string } | null) {
  if (!grade) return 0.32;
  if (grade.company === "PSA" && grade.score === "10") return 1;
  if (grade.company === "BGS") return 0.85;
  return 0.45;
}

function certNumberFor(rng: Rng, company: BackendGradeCompany) {
  if (company === "BGS") return `00${randomDigits(rng, 8)}`;
  if (company === "CGC") return randomDigits(rng, 10);
  return `${randomInt(rng, 6, 9)}${randomDigits(rng, 7)}`;
}

const SELLERS = [
  "SeoulCollector",
  "TokyoVault_KR",
  "GrailHunter_Seoul",
  "GrailHunter_Busan",
  "KantoBanker",
  "DragonPulse_Korea",
  "MasterVault_Official",
  "IncheonSlabHouse",
  "PallettownTrader",
  "JejuHoloClub",
] as const;

const MIN_PRICE = 80_000;
const MAX_PRICE = 35_000_000;

const roundPrice = (value: number) => {
  const step = value >= 1_000_000 ? 10_000 : 5_000;
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, Math.round(value / step) * step));
};

/** 백엔드 LocalDateTime 과 같은 형식(타임존 없음, Asia/Seoul 기준) */
const toServerDateTime = (date: Date) => new Date(date.getTime() + 9 * 3_600_000).toISOString().replace("Z", "").slice(0, 19);

function toListing(card: TcgCard, index: number, now: number): ListingResponse {
  const rng = seededRandom(card.id);
  const year = Number(card.set.releaseDate?.slice(0, 4)) || null;
  const rarity = toRarity(card.rarity);
  const grade = weightedPick(rng, GRADES);
  const [min, max] = basePriceRange(card, rarity, year ?? 0);
  // 로그 분포로 뽑아 저가~고가가 고르게 섞이게 한다.
  const base = Math.exp(randomBetween(rng, Math.log(min), Math.log(max)));
  const seller = pick(rng, SELLERS);
  const status: ListingStatus = weightedPick(rng, [["ON_SALE", 90], ["RESERVED", 6], ["SOLD", 4]] as const);
  const total = card.set.printedTotal ?? card.set.total;
  const energy = card.types?.[0];

  return {
    listingId: 100_000 + index,
    sellerId: 1_000 + SELLERS.indexOf(seller),
    sellerNickname: seller,
    card: {
      cardId: 100_000 + index,
      code: card.id,
      // 공식 API 는 영문명만 제공한다.
      name: card.name,
      nameEn: card.name,
      nameJa: null,
      setName: card.set.name,
      releaseYear: year,
      cardNumber: total ? `${card.number}/${total}` : card.number,
      rarity,
      rarityLabel: card.rarity ?? null,
      category: toCategory(card),
      energyType: energy ? (ENERGY_TYPES[energy] ?? "COLORLESS") : card.supertype === "Trainer" ? "TRAINER" : "COLORLESS",
      printLanguage: "en",
      imageUrl: card.images.large,
    },
    price: roundPrice(base * gradeMultiplier(grade)),
    condition: "MINT",
    grade: grade ? { ...grade, certNumber: certNumberFor(rng, grade.company) } : null,
    description: null,
    status,
    // 최근 3일 사이에 등록된 것처럼 분산 (최신 등록순 정렬용)
    createdAt: toServerDateTime(new Date(now - randomInt(rng, 0, 72 * 60) * 60_000)),
  };
}

const getCachedTcgListings = unstable_cache(
  async () => {
    const cards = await requestCards();
    const now = Date.now();
    return cards.map((card, index) => toListing(card, index, now));
  },
  ["pokemon-tcg-listings-v1"],
  { revalidate: CACHE_SECONDS, tags: ["pokemon-tcg"] },
);

/**
 * 실제 카드 50장을 C2C 매물 형태로 돌려준다.
 * 실패는 캐시하지 않으며, 마지막 성공 결과가 있으면 그것을, 없으면 예외를 던져 호출부가 로컬 데모 데이터로 대체하게 한다.
 * 실패 직후 30초 동안은 API 를 다시 부르지 않는다.
 */
export async function fetchPokemonTcgListings(): Promise<ListingResponse[]> {
  if (Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS) {
    if (lastGood) return lastGood;
    throw new Error("Pokémon TCG API cooling down after a recent failure");
  }
  try {
    lastGood = await getCachedTcgListings();
    return lastGood;
  } catch (error) {
    lastFailureAt = Date.now();
    if (lastGood) return lastGood;
    throw error;
  }
}
