"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ConsentCategory } from "@/types";

const CONSENT_KEY = "vdb_consent";

export interface ConsentPreferences {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

interface ConsentContextValue {
  preferences: ConsentPreferences | null;
  hasChosen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: Omit<ConsentPreferences, "necessary" | "timestamp">) => void;
  hasConsent: (category: ConsentCategory) => boolean;
  openPreferences: () => void;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function loadConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ConsentPreferences;
  } catch {
    return null;
  }
}

function saveConsent(prefs: ConsentPreferences) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

function getInitialConsent() {
  const stored = loadConsent();
  return {
    preferences: stored,
    hasChosen: stored !== null,
    showBanner: stored === null,
  };
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(getInitialConsent);
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(
    initial.preferences,
  );
  const [hasChosen, setHasChosen] = useState(initial.hasChosen);
  const [showBanner, setShowBanner] = useState(initial.showBanner);

  const acceptAll = useCallback(() => {
    const prefs: ConsentPreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    saveConsent(prefs);
    setPreferences(prefs);
    setHasChosen(true);
    setShowBanner(false);
  }, []);

  const rejectAll = useCallback(() => {
    const prefs: ConsentPreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    saveConsent(prefs);
    setPreferences(prefs);
    setHasChosen(true);
    setShowBanner(false);
  }, []);

  const savePreferences = useCallback(
    (prefs: Omit<ConsentPreferences, "necessary" | "timestamp">) => {
      const full: ConsentPreferences = {
        necessary: true,
        ...prefs,
        timestamp: new Date().toISOString(),
      };
      saveConsent(full);
      setPreferences(full);
      setHasChosen(true);
      setShowBanner(false);
    },
    [],
  );

  const hasConsent = useCallback(
    (category: ConsentCategory) => {
      if (category === "necessary") return true;
      return preferences?.[category] ?? false;
    },
    [preferences],
  );

  const openPreferences = useCallback(() => {
    setShowBanner(true);
  }, []);

  return (
    <ConsentContext.Provider
      value={{
        preferences,
        hasChosen,
        acceptAll,
        rejectAll,
        savePreferences,
        hasConsent,
        openPreferences,
        showBanner,
        setShowBanner,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}
