# README Strategy — What Actually Works for Hackathon Judges

## The Reality

Judges have 50-200 submissions. They spend 30-90 seconds per entry deciding "interesting or skip." The video is 80% of that decision. The README is the backup if the video hooks them.

## What the Satellite Collision Repo Does Right

That README is ~3,000 words. Overkill? Maybe. But it works because of STRUCTURE, not length. A judge skimming for 20 seconds sees:

1. One emotional sentence (the hook)
2. Quick Links table (video + live demo — they click one of these)
3. A capabilities table with "Complete" checkmarks
4. Architecture diagram (one glance = "this person knows what they're doing")

The other 2,500 words? For the 2-3 judges who actually read. And for the "technical depth" rubric if the hackathon has one.

## The Honest Formula

```
Judge attention budget:
├── Video (30-60s)         → 80% of their decision
├── Live demo click (10s)  → "does it actually work?"
├── README first screen    → "is this person serious?"
└── Deep read              → only if they're already impressed
```

## DailyPress README Plan

### Above the fold (first screen, 5 seconds):
- One-liner: what it is
- Screenshot or GIF
- Quick Links: [Live Demo] [Video] [How it works]

### The hook (next 10 seconds if they scroll):
- 2-3 sentences: why this exists (agents need structured trusted news)
- The architecture diagram (ONE ascii box diagram)

### The substance (for deep readers):
- WebMCP tools table (9 tools, what each does)
- Content model (Tier 1/2 explained in 4 lines)
- Tech stack table (one-liner per component)
- How to run locally (3 commands max)

### DO NOT include:
- Philosophy essays about journalism
- Legal analysis paragraphs
- Future roadmap (judges don't care what you'll build later)
- Multiple architecture diagrams
- Paragraphs explaining why you chose React over Vue

## The Counter-Argument for Long READMEs

The satellite repo won (or placed) despite being 3,000 words because:
1. It's for a Kiro hackathon — they WANT to see you used their tool extensively
2. The `.kiro/` section is basically required content
3. The problem domain (orbital mechanics) genuinely needs explanation
4. Every section has a diagram — skimmers get value from diagrams alone

DailyPress is simpler. "AI newspaper with WebMCP tools" doesn't need 3,000 words of explanation. Our README should be ~500 words + 1 diagram + 1 tools table + quick links.

## The 30-Second Test

If a judge reads ONLY:
- The title
- The one-liner
- The Quick Links
- The tools table

...do they understand what this is and why it's interesting?

If yes → README is done. Everything else is bonus.
