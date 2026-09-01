"use client";

import type { LayoutMode } from "@/lib/layoutRuleEngine";

const LAYOUT_MODES: { key: LayoutMode; label: string }[] = [
  { key: "dynamic", label: "Dynamic" },
  { key: "simple", label: "Simple" },
];

function ToggleSwitch({ defaultOn = false }: { defaultOn?: boolean }) {
  return (
    <div
      className={`relative h-[22px] w-[42px] cursor-pointer rounded-full transition-colors ${
        defaultOn ? "bg-accent" : "bg-rule"
      }`}
    >
      <div
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
          defaultOn ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </div>
  );
}

function SettingRow({
  label,
  right,
}: {
  label: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-rule px-4 py-3.5 text-sm font-medium last:border-b-0">
      <label>{label}</label>
      {right}
    </div>
  );
}

function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
        {title}
      </h3>
      <div className="rounded-xl border border-rule bg-card">{children}</div>
    </div>
  );
}

interface SettingsScreenProps {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
}

export function SettingsScreen({
  layoutMode,
  setLayoutMode,
}: SettingsScreenProps) {
  return (
    <div className="mx-auto max-w-[580px] px-6 py-8">
      <h2 className="mb-6 text-center font-serif text-3xl font-bold">
        Settings
      </h2>

      <SettingGroup title="Delivery">
        <SettingRow
          label="Push Notifications"
          right={<ToggleSwitch defaultOn />}
        />
        <SettingRow
          label="Morning Email Edition"
          right={<ToggleSwitch />}
        />
        <SettingRow
          label="Delivery Time"
          right={<span className="text-[13px] text-muted">6:00 AM</span>}
        />
      </SettingGroup>

      <SettingGroup title="Appearance">
        <SettingRow
          label="Layout"
          right={
            <div className="flex rounded-lg border border-rule bg-surface p-0.5">
              {LAYOUT_MODES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayoutMode(key)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                    layoutMode === key
                      ? "bg-white/15 text-ink shadow"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          label="Theme"
          right={<span className="text-[13px] text-muted">Dark</span>}
        />
        <SettingRow
          label="Reduce Motion"
          right={<ToggleSwitch />}
        />
        <SettingRow
          label="Page-Flip Sound"
          right={<ToggleSwitch defaultOn />}
        />
      </SettingGroup>

      <SettingGroup title="About">
        <SettingRow
          label="Version"
          right={<span className="text-[13px] text-muted">1.0.0 (PWA)</span>}
        />
        <SettingRow
          label="Licence"
          right={<span className="text-[13px] text-muted">Apache-2.0</span>}
        />
      </SettingGroup>
    </div>
  );
}
