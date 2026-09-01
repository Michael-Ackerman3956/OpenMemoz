"use client";

import type { ActiveScreen } from "@/lib/viewmodels/useEditionViewModel";

interface MobileTabBarProps {
  activeScreen: ActiveScreen;
  onSetScreen: (screen: ActiveScreen) => void;
}

const TABS: { key: ActiveScreen; icon: string; label: string }[] = [
  { key: "edition", icon: "📰", label: "Edition" },
  { key: "interests", icon: "♥", label: "Interests" },
  { key: "settings", icon: "⚙", label: "Settings" },
];

export function MobileTabBar({ activeScreen, onSetScreen }: MobileTabBarProps) {
  return (
    <nav className="fixed bottom-5 left-6 right-6 z-50 flex items-center justify-around rounded-[26px] border border-white/8 bg-surface/75 py-2.5 shadow-xl backdrop-blur-xl md:hidden">
      {TABS.map(({ key, icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSetScreen(key)}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-semibold transition-colors ${
            activeScreen === key ? "text-accent" : "text-muted"
          }`}
        >
          <span className="text-lg">{icon}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}
