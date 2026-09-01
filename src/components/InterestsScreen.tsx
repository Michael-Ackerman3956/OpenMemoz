"use client";

const TOPICS = [
  { name: "AI & Machine Learning", active: true },
  { name: "Startups", active: true },
  { name: "Finance & Markets", active: true },
  { name: "World News", active: true },
  { name: "Science", active: true },
  { name: "Cybersecurity", active: false },
  { name: "Climate & Energy", active: false },
  { name: "Space", active: false },
  { name: "Developer Tools", active: false },
  { name: "Health", active: false },
];

const WEIGHTS = [
  { label: "AI & ML", value: 85 },
  { label: "Finance", value: 70 },
  { label: "Science", value: 75 },
  { label: "World News", value: 50 },
];

export function InterestsScreen() {
  return (
    <div className="mx-auto max-w-[580px] px-6 py-8">
      <h2 className="text-center font-serif text-3xl font-bold">
        Your Interests
      </h2>
      <p className="mt-2 text-center text-sm text-muted">
        Tap topics to follow. Adjust weights to control story prominence.
      </p>

      <div className="mt-8">
        <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
          Topics
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.name}
              type="button"
              className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                topic.active
                  ? "border-accent bg-accent text-white"
                  : "border-rule text-muted hover:border-muted"
              }`}
            >
              {topic.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
          Weight
        </h3>
        <div className="space-y-3">
          {WEIGHTS.map((weight) => (
            <div
              key={weight.label}
              className="flex items-center gap-3 px-2"
            >
              <label className="min-w-[100px] text-[13px] font-medium">
                {weight.label}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue={weight.value}
                className="flex-1 accent-accent"
              />
              <span className="min-w-[28px] text-right text-[12px] text-muted">
                {weight.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="mx-auto mt-8 block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/80"
      >
        + Add Custom Source
      </button>
    </div>
  );
}
