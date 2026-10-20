package com.pocket.market.config;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.card.CardRarity;
import com.pocket.market.domain.card.EnergyType;
import com.pocket.market.domain.listing.CardCondition;
import com.pocket.market.domain.listing.GradeCompany;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.user.User;
import com.pocket.market.repository.CardRepository;
import com.pocket.market.repository.ListingRepository;
import com.pocket.market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 로컬 실행 시 데모용 감정 카드 매물 8건을 적재한다. DB 가 비어 있을 때만 적재한다. 프론트엔드는 이 데이터(GET /api/listings)만으로 화면을 그린다.
 * 데모 구매자(RedKetchum_99)를 가장 먼저 저장해 항상 userId=1 이 되도록 한다.
 */
@Slf4j
@Component
@Profile("local")
@RequiredArgsConstructor
public class LocalDataInitializer implements ApplicationRunner {

    private static final String CDN = "https://images.pokemontcg.io";

    private record SeedListing(String code, String nameKo, String nameEn, String nameJa, String setName, int year,
                               String cardNumber, CardRarity rarity, String category, EnergyType energyType,
                               String printLanguage, String imagePath, long price, String seller,
                               GradeCompany gradeCompany, String gradeScore, String certNumber) {
    }

    private static final List<SeedListing> SEED = List.of(
            new SeedListing("charizard-vmax-074", "리자몽 VMAX", "Charizard VMAX", "リザードンVMAX",
                    "Champion's Path", 2020, "074/073", CardRarity.UR, "Pokémon VMAX", EnergyType.FIRE, "en",
                    "/swsh35/74_hires.png", 3_450_000L, "TokyoVault_KR", GradeCompany.PSA, "10", "61238874"),
            new SeedListing("umbreon-vmax-069", "블래키 VMAX 어나더 아트 (문브레온)", "Umbreon VMAX Alt Art (Moonbreon)", "ブラッキーVMAX SA (ムーンブラッキー)",
                    "Evolving Skies", 2021, "215/203", CardRarity.UR, "Pokémon VMAX", EnergyType.DARKNESS, "en",
                    "/swsh7/215_hires.png", 1_920_000L, "GrailHunter_Seoul", GradeCompany.PSA, "10", "84920412"),
            // 원본 일러스트레이터 카드는 공식 CDN 에 없어 Wizards Black Star Promo #1 피카츄 이미지로 대체
            new SeedListing("pikachu-illustrator-promo", "피카츄 일러스트레이터", "Pikachu Illustrator", "ポケモンイラストレーター ピカチュウ",
                    "CoroCoro Illustration Contest Promo", 1998, "PROMO", CardRarity.PROMO, "Pokémon", EnergyType.LIGHTNING, "ja",
                    "/basep/1_hires.png", 45_000_000L, "MasterVault_Official", GradeCompany.CGC, "9.5", "4093118001"),
            new SeedListing("gengar-vmax-alt", "팬텀 VMAX 어나더 아트", "Gengar VMAX Alt Art", "ゲンガーVMAX SA",
                    "Fusion Strike", 2021, "271/264", CardRarity.UR, "Pokémon VMAX", EnergyType.DARKNESS, "en",
                    "/swsh8/271_hires.png", 620_000L, "KantoBanker", GradeCompany.PSA, "9", "78291044"),
            new SeedListing("rayquaza-vmax-alt", "레쿠쟈 VMAX 어나더 아트", "Rayquaza VMAX Alt Art", "レックウザVMAX SA",
                    "Evolving Skies", 2021, "218/203", CardRarity.UR, "Pokémon VMAX", EnergyType.DRAGON, "en",
                    "/swsh7/218_hires.png", 1_850_000L, "DragonPulse_Korea", GradeCompany.PSA, "10", "63912095"),
            new SeedListing("mewtwo-vstar-sar", "뮤츠 VSTAR 갤러리", "Mewtwo VSTAR Galarian Gallery", "ミュウツーVSTAR ギャラリー",
                    "Crown Zenith", 2023, "GG44/GG70", CardRarity.SAR, "Pokémon VSTAR", EnergyType.PSYCHIC, "en",
                    "/swsh12pt5gg/GG44_hires.png", 480_000L, "SeoulCollector", GradeCompany.BGS, "9.5", "0014892110"),
            // 일본 한정 프로모는 공식 CDN 에 없어 Sun & Moon 풀아트 릴리에 이미지로 대체
            new SeedListing("lillie-extra-battle", "릴리에 엑스트라 배틀", "Lillie Extra Battle Day", "リーリエ エクストラバトルの日",
                    "SM Promo (Extra Battle Day)", 2017, "397/SM-P", CardRarity.PROMO, "Trainer / Supporter", EnergyType.TRAINER, "ja",
                    "/sm1/147_hires.png", 12_000_000L, "MasterVault_Official", GradeCompany.PSA, "10", "52004173"),
            new SeedListing("giratina-v-alt", "기라티나 V 어나더 아트", "Giratina V Alt Art", "ギラティナV SA",
                    "Lost Origin", 2022, "186/196", CardRarity.RR, "Pokémon V", EnergyType.DRAGON, "en",
                    "/swsh11/186_hires.png", 1_100_000L, "GrailHunter_Busan", GradeCompany.PSA, "10", "70551938")
    );

    private final UserRepository userRepository;
    private final CardRepository cardRepository;
    private final ListingRepository listingRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Neon 등 영속 DB 에서는 재시작마다 다시 넣지 않는다.
        if (userRepository.count() > 0) {
            log.info("[LOCAL] 기존 데이터가 있어 샘플 데이터 적재를 건너뜀 - users={}, listings={}",
                    userRepository.count(), listingRepository.count());
            return;
        }

        User buyer = userRepository.save(User.create("buyer@pocket.com", "RedKetchum_99"));

        Map<String, User> sellers = new HashMap<>();
        for (SeedListing seed : SEED) {
            User seller = sellers.computeIfAbsent(seed.seller(), nickname ->
                    userRepository.save(User.create(nickname.toLowerCase() + "@pocket.com", nickname)));
            Card card = cardRepository.save(Card.builder()
                    .code(seed.code())
                    .name(seed.nameKo())
                    .nameEn(seed.nameEn())
                    .nameJa(seed.nameJa())
                    .setName(seed.setName())
                    .releaseYear(seed.year())
                    .cardNumber(seed.cardNumber())
                    .rarity(seed.rarity())
                    .category(seed.category())
                    .energyType(seed.energyType())
                    .printLanguage(seed.printLanguage())
                    .imageUrl(CDN + seed.imagePath())
                    .build());
            Listing listing = Listing.create(seller, card, seed.price(), CardCondition.MINT, null);
            listing.assignGrade(seed.gradeCompany(), seed.gradeScore(), seed.certNumber());
            listingRepository.save(listing);
        }

        log.info("[LOCAL] 샘플 데이터 적재 완료 - buyerId={}, sellers={}, listings={}", buyer.getId(), sellers.size(), SEED.size());
    }
}
