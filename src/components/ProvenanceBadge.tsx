import type { Story } from "@/lib/types";

const TIER_LABELS: Record<Story["provenanceTier"], string> = {
  1: "Tier 1 · Source Text",
  2: "Tier 2 · AI Synthesis",
};

const TIER_CLASSES: Record<Story["provenanceTier"], string> = {
  1: "border-teal/40 bg-teal/10 text-teal",
  2: "border-amber/40 bg-amber/10 text-amber",
};

interface ProvenanceBadgeProps {
  provenanceTier: Story["provenanceTier"];
}

export function ProvenanceBadge({ provenanceTier }: ProvenanceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-widest ${TIER_CLASSES[provenanceTier]}`}
    >
      {TIER_LABELS[provenanceTier]}
    </span>
  );
}
