"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * 목업 로그인 세션. 백엔드 인증이 붙기 전까지 로그인/로그아웃 상태만 브라우저에 보관한다.
 * TODO: 인증 API 연동 시 user 를 /api/me 응답으로 교체
 */
export type SessionUser = {
  /** 백엔드 userId. 주문 생성 시 X-User-Id 헤더로 보낸다 (인증 연동 전 임시) */
  id: number;
  nickname: string;
  avatarUrl: string;
  /** 볼트 잔액 (KRW) */
  balanceKrw: number;
};

const MOCK_USER: SessionUser = {
  // 백엔드 local 시드에서 RedKetchum_99 는 항상 userId=1 로 생성된다.
  id: Number(process.env.NEXT_PUBLIC_DEMO_BUYER_ID ?? 1),
  nickname: "RedKetchum_99",
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAtrszgA-_3ckrO_EaoxOSX1qqkK7II_TbGNEuE9QCgWgJq9VW7h-c2hDbheMOOwcWWsxCK2xtl1wQ8RRqo2E-zPacbFEVM3DN4BrguHLC4cMTr3w9LAcLSqYPtG6PtJpdh31UpLa2gggXqCSf7knBpAM7aB0vResTUhSZaPhNp2i6LsuURR0077aUgWPljrp2AXKnFtTkbZJMrgmEg7K16KHyt5IXFUOPLDVwpMgrMz7Gh3Xuou46YKA",
  balanceKrw: 18_450_000,
};

const STORAGE_KEY = "poketrade-session";

type SessionContextValue = {
  user: SessionUser | null;
  login: () => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "signed-out") setSignedIn(false);
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((value: boolean) => {
    setSignedIn(value);
    try {
      if (value) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, "signed-out");
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(() => persist(true), [persist]);
  const logout = useCallback(() => persist(false), [persist]);

  const value = useMemo(() => ({ user: signedIn ? MOCK_USER : null, login, logout }), [signedIn, login, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}
