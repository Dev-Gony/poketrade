// 데모(오프라인) 모드용 매물 데이터.
// 백엔드에 연결할 수 없을 때(Vercel 단독 배포 등) GET /api/listings 응답 대신 사용한다.
// 백엔드 응답(ListingResponse)과 같은 형태라 실제 데이터와 똑같은 변환·렌더링 경로를 탄다.
// 값은 백엔드 local 시드(LocalDataInitializer)와 맞춰 두었다.

import type { ListingResponse } from "@/lib/api/backend";

const CDN = "https://images.pokemontcg.io";
const CREATED_AT = "2026-10-20T09:00:00";

type DemoSeed = {
  code: string;
  name: string;
  nameEn: string;
  nameJa: string;
  setName: string;
  releaseYear: number;
  cardNumber: string;
  rarity: ListingResponse["card"]["rarity"];
  category: string;
  energyType: NonNullable<ListingResponse["card"]["energyType"]>;
  printLanguage: string;
  imagePath: string;
  price: number;
  seller: string;
  grade: NonNullable<ListingResponse["grade"]>;
};

const SEED: DemoSeed[] = [
  {
    code: "charizard-vmax-074", name: "리자몽 VMAX", nameEn: "Charizard VMAX", nameJa: "リザードンVMAX",
    setName: "Champion's Path", releaseYear: 2020, cardNumber: "074/073", rarity: "UR", category: "Pokémon VMAX",
    energyType: "FIRE", printLanguage: "en", imagePath: "/swsh35/74_hires.png", price: 3_450_000, seller: "TokyoVault_KR",
    grade: { company: "PSA", score: "10", certNumber: "61238874" },
  },
  {
    code: "umbreon-vmax-069", name: "블래키 VMAX 어나더 아트 (문브레온)", nameEn: "Umbreon VMAX Alt Art (Moonbreon)",
    nameJa: "ブラッキーVMAX SA (ムーンブラッキー)", setName: "Evolving Skies", releaseYear: 2021, cardNumber: "215/203",
    rarity: "UR", category: "Pokémon VMAX", energyType: "DARKNESS", printLanguage: "en", imagePath: "/swsh7/215_hires.png",
    price: 1_920_000, seller: "GrailHunter_Seoul", grade: { company: "PSA", score: "10", certNumber: "84920412" },
  },
  {
    // 원본 일러스트레이터 카드는 공식 CDN 에 없어 Wizards Black Star Promo #1 피카츄 이미지로 대체
    code: "pikachu-illustrator-promo", name: "피카츄 일러스트레이터", nameEn: "Pikachu Illustrator", nameJa: "ポケモンイラストレーター ピカチュウ",
    setName: "CoroCoro Illustration Contest Promo", releaseYear: 1998, cardNumber: "PROMO", rarity: "PROMO", category: "Pokémon",
    energyType: "LIGHTNING", printLanguage: "ja", imagePath: "/basep/1_hires.png", price: 45_000_000, seller: "MasterVault_Official",
    grade: { company: "CGC", score: "9.5", certNumber: "4093118001" },
  },
  {
    code: "gengar-vmax-alt", name: "팬텀 VMAX 어나더 아트", nameEn: "Gengar VMAX Alt Art", nameJa: "ゲンガーVMAX SA",
    setName: "Fusion Strike", releaseYear: 2021, cardNumber: "271/264", rarity: "UR", category: "Pokémon VMAX",
    energyType: "DARKNESS", printLanguage: "en", imagePath: "/swsh8/271_hires.png", price: 620_000, seller: "KantoBanker",
    grade: { company: "PSA", score: "9", certNumber: "78291044" },
  },
  {
    code: "rayquaza-vmax-alt", name: "레쿠쟈 VMAX 어나더 아트", nameEn: "Rayquaza VMAX Alt Art", nameJa: "レックウザVMAX SA",
    setName: "Evolving Skies", releaseYear: 2021, cardNumber: "218/203", rarity: "UR", category: "Pokémon VMAX",
    energyType: "DRAGON", printLanguage: "en", imagePath: "/swsh7/218_hires.png", price: 1_850_000, seller: "DragonPulse_Korea",
    grade: { company: "PSA", score: "10", certNumber: "63912095" },
  },
  {
    code: "mewtwo-vstar-sar", name: "뮤츠 VSTAR 갤러리", nameEn: "Mewtwo VSTAR Galarian Gallery", nameJa: "ミュウツーVSTAR ギャラリー",
    setName: "Crown Zenith", releaseYear: 2023, cardNumber: "GG44/GG70", rarity: "SAR", category: "Pokémon VSTAR",
    energyType: "PSYCHIC", printLanguage: "en", imagePath: "/swsh12pt5gg/GG44_hires.png", price: 480_000, seller: "SeoulCollector",
    grade: { company: "BGS", score: "9.5", certNumber: "0014892110" },
  },
  {
    // 일본 한정 프로모는 공식 CDN 에 없어 Sun & Moon 풀아트 릴리에 이미지로 대체
    code: "lillie-extra-battle", name: "릴리에 엑스트라 배틀", nameEn: "Lillie Extra Battle Day", nameJa: "リーリエ エクストラバトルの日",
    setName: "SM Promo (Extra Battle Day)", releaseYear: 2017, cardNumber: "397/SM-P", rarity: "PROMO", category: "Trainer / Supporter",
    energyType: "TRAINER", printLanguage: "ja", imagePath: "/sm1/147_hires.png", price: 12_000_000, seller: "MasterVault_Official",
    grade: { company: "PSA", score: "10", certNumber: "52004173" },
  },
  {
    code: "giratina-v-alt", name: "기라티나 V 어나더 아트", nameEn: "Giratina V Alt Art", nameJa: "ギラティナV SA",
    setName: "Lost Origin", releaseYear: 2022, cardNumber: "186/196", rarity: "RR", category: "Pokémon V",
    energyType: "DRAGON", printLanguage: "en", imagePath: "/swsh11/186_hires.png", price: 1_100_000, seller: "GrailHunter_Busan",
    grade: { company: "PSA", score: "10", certNumber: "70551938" },
  },
];

const SELLER_IDS = new Map(Array.from(new Set(SEED.map((s) => s.seller))).map((name, i) => [name, i + 2]));

export const DEMO_LISTINGS: ListingResponse[] = SEED.map((seed, index) => ({
  listingId: index + 1,
  sellerId: SELLER_IDS.get(seed.seller) ?? 2,
  sellerNickname: seed.seller,
  card: {
    cardId: index + 1,
    code: seed.code,
    name: seed.name,
    nameEn: seed.nameEn,
    nameJa: seed.nameJa,
    setName: seed.setName,
    releaseYear: seed.releaseYear,
    cardNumber: seed.cardNumber,
    rarity: seed.rarity,
    category: seed.category,
    energyType: seed.energyType,
    printLanguage: seed.printLanguage,
    imageUrl: `${CDN}${seed.imagePath}`,
  },
  price: seed.price,
  condition: "MINT",
  grade: seed.grade,
  description: null,
  status: "ON_SALE",
  createdAt: CREATED_AT,
}));
