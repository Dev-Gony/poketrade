"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n/I18nProvider";
import { GRADE_STYLES, type CardData } from "@/lib/cards";

const MAX_TILT_DEG = 12;
const SIM_TILT_DEG = 9;
const SIM_STEP = 0.04;
const RESTING_TRANSFORM = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
const RESTING_FOIL_OPACITY = "0.3";

type SlabViewerProps = {
  card: CardData;
};

const BARCODE_WIDTHS = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3];

const TOOLBAR_ITEMS = [
  { icon: "view_in_ar", labelKey: "slab.view360", tone: "text-primary" },
  { icon: "flare", labelKey: "slab.uv", tone: "text-tertiary" },
  { icon: "verified", labelKey: "slab.certMatch", tone: "text-secondary" },
] as const;

export default function SlabViewer({ card }: SlabViewerProps) {
  const { t, tRich } = useTranslation();
  const { certNumber, vaultBox } = card;
  const gradeTone = GRADE_STYLES[card.grade.company].text;
  const containerRef = useRef<HTMLDivElement>(null);
  const slabRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLDivElement>(null);
  const specularRef = useRef<HTMLDivElement>(null);

  // 매 프레임 변하는 값은 리렌더 없이 ref 로 관리한다.
  const isSimulatingRef = useRef(false);
  const animIdRef = useRef<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const updateSlab = useCallback((rotX: number, rotY: number, glarePos: number) => {
    const slab = slabRef.current;
    if (!slab) return;
    slab.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

    const foil = foilRef.current;
    if (foil) {
      foil.style.opacity = String(Math.min(0.65, Math.max(0.15, Math.abs(rotX + rotY) / 12)));
      foil.style.filter = `hue-rotate(${rotX * 6}deg)`;
    }

    const specular = specularRef.current;
    if (specular) {
      specular.style.background = `linear-gradient(${115 + glarePos}deg, rgba(255,255,255,0.25) 0%, transparent 60%)`;
    }
  }, []);

  const resetSlab = useCallback(() => {
    if (slabRef.current) slabRef.current.style.transform = RESTING_TRANSFORM;
    if (foilRef.current) foilRef.current.style.opacity = RESTING_FOIL_OPACITY;
  }, []);

  const stopSimulation = useCallback(() => {
    if (animIdRef.current !== null) {
      cancelAnimationFrame(animIdRef.current);
      animIdRef.current = null;
    }
  }, []);

  // 마우스 위치 기반 3D 틸트
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isSimulatingRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const rotY = ((x - midX) / midX) * MAX_TILT_DEG;
      const rotX = -((y - midY) / midY) * MAX_TILT_DEG;
      updateSlab(rotX, rotY, rotY * 3);
    };

    const handleMouseLeave = () => {
      if (isSimulatingRef.current) return;
      resetSlab();
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [updateSlab, resetSlab]);

  // 언마운트 시 진행 중인 자이로 시뮬레이션 정리
  useEffect(() => stopSimulation, [stopSimulation]);

  const toggleTiltSimulation = useCallback(() => {
    const next = !isSimulatingRef.current;
    isSimulatingRef.current = next;
    setIsSimulating(next);

    if (next) {
      let step = 0;
      const loop = () => {
        step += SIM_STEP;
        const rotX = Math.sin(step) * SIM_TILT_DEG;
        const rotY = Math.cos(step) * SIM_TILT_DEG;
        updateSlab(rotX, rotY, rotY * 4);
        animIdRef.current = requestAnimationFrame(loop);
      };
      loop();
    } else {
      stopSimulation();
      resetSlab();
    }
  }, [updateSlab, resetSlab, stopSimulation]);

  return (
    <div className="lg:col-span-5 flex flex-col gap-space-md">
      {/* Interactive Slab Showcase Pedestal */}
      <div
        ref={containerRef}
        className="relative group rounded-xl p-space-md bg-surface-container-low shadow-xl overflow-hidden transition-all duration-300"
      >
        {/* Chromatic ambient glow backdrops */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-tertiary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-surface-container-lowest/80 via-transparent to-primary/10 pointer-events-none" />

        {/* Top Status Strip */}
        <div className="relative z-10 flex items-center justify-between mb-space-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest font-label-caps text-label-caps uppercase text-tertiary">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            {t("slab.scanReady")}
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-pressed={isSimulating}
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
              onClick={toggleTiltSimulation}
              title={t("slab.toggleFoil")}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
            </button>
            <button
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
              aria-label={t("slab.bookmark")}
              title={t("slab.bookmark")}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">bookmark</span>
            </button>
          </div>
        </div>

        {/* Physical Slab Encapsulation Frame */}
        <div
          ref={slabRef}
          className="relative mx-auto w-full max-w-[340px] rounded-xl bg-surface-container-lowest shadow-2xl p-3 transition-transform duration-200 ease-out"
        >
          {/* Acrylic Specular Sheen Overlay */}
          <div
            ref={specularRef}
            className="absolute inset-0 rounded-xl pointer-events-none opacity-40 mix-blend-screen bg-gradient-to-tr from-transparent via-tertiary/20 to-primary/30"
          />

          {/* Grading Label Bar */}
          <div className="rounded bg-surface-bright p-2.5 mb-2 shadow-sm text-left relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-1 text-[9px] font-label-caps uppercase tracking-wider font-extrabold ${gradeTone}`}>
                  <span>{card.grade.company}</span>
                  <span className="text-outline">Certification Registry</span>
                </div>
                <p className="font-label-numeric-sm text-label-numeric-sm font-bold text-on-surface truncate leading-tight mt-0.5">
                  {card.year ?? ""} POKÉMON {card.setName.toUpperCase()}
                </p>
                <p className="font-label-numeric-sm text-label-numeric-sm text-outline truncate leading-tight">
                  #{card.cardNumber.split("/")[0]} {card.slabName}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`block font-label-caps text-[10px] font-extrabold uppercase ${gradeTone}`}>{card.grade.label}</span>
                <span className="block font-display text-[26px] leading-none font-black text-on-surface">{card.grade.score}</span>
              </div>
            </div>

            {/* Micro Barcode & Cert */}
            <div className="mt-2 pt-1 flex items-center justify-between">
              <div className="flex items-center gap-0.5 opacity-80 h-3">
                {BARCODE_WIDTHS.map((w, i) => (
                  <span key={i} className="h-full bg-on-surface" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant tracking-wider font-semibold">
                #{certNumber}
              </span>
            </div>
          </div>

          {/* Card Art Viewport with Holographic Foil Sheen */}
          <div className="relative w-full aspect-[63/88] rounded-lg overflow-hidden bg-surface-container-high shadow-inner">
            <img alt={card.name.en} className="w-full h-full object-cover select-none" draggable={false} src={card.imageUrl} />
            {/* Iridescent Foil Shimmer Effect Layer */}
            <div
              ref={foilRef}
              className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-30 bg-gradient-to-tr from-tertiary-fixed via-primary to-secondary"
            />
            {/* Diagonal Glass Glare */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-60" />
          </div>

          {/* Slab Bottom Frosted Mark */}
          <div className="mt-2 flex items-center justify-center gap-1.5 py-1">
            <span className="material-symbols-outlined text-[14px] text-tertiary">shield</span>
            <span className="font-label-caps text-[10px] text-outline uppercase tracking-widest">{t("slab.seal")}</span>
          </div>
        </div>

        {/* Pedestal Stand Glow */}
        <div className="w-48 h-2 mx-auto mt-4 rounded-full bg-primary/30 blur-md" />
      </div>

      {/* Interactive Viewer Toolbar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.labelKey}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors group text-center"
            type="button"
          >
            <span className={`material-symbols-outlined text-[20px] ${item.tone} group-hover:scale-110 transition-transform mb-1`}>
              {item.icon}
            </span>
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{t(item.labelKey)}</span>
          </button>
        ))}
        <button
          aria-pressed={isSimulating}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors group text-center"
          onClick={toggleTiltSimulation}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px] text-primary-container group-hover:scale-110 transition-transform mb-1">
            vibration
          </span>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{t("slab.foilTilt")}</span>
        </button>
      </div>

      {/* Vault Physical Security Badge */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-low shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-tertiary shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[22px]">lock</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-label-caps uppercase text-tertiary font-bold tracking-wide">{t("slab.vaulted")}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            <span className="font-label-numeric-sm text-label-numeric-sm text-outline">{t("slab.box", { id: vaultBox })}</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
            {tRich("slab.vaultBody", { vault: <strong className="text-on-surface">{t("slab.vaultName")}</strong> })}
          </p>
        </div>
      </div>
    </div>
  );
}
