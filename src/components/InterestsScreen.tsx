"use client";

import { useState, useEffect, useCallback } from "react";

const AVAILABLE_TOPICS = [
  "AI & Machine Learning",
  "Startups",
  "Finance & Markets",
  "World News",
  "Science",
  "Cybersecurity",
  "Climate & Energy",
  "Space",
  "Developer Tools",
  "Health",
];

const DEFAULT_ACTIVE_TOPICS = [
  "AI & Machine Learning",
  "Startups",
  "Finance & Markets",
  "World News",
  "Science",
];

const INTERESTS_STORAGE_KEY = "openmemoz_user_interests";

export interface UserInterests {
  activeTopics: string[];
  weights: Record<string, number>;
}

export function loadUserInterestsFromLocalStorage(): UserInterests {
  try {
    const stored = localStorage.getItem(INTERESTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as UserInterests;
  } catch { /* */ }
  return {
    activeTopics: DEFAULT_ACTIVE_TOPICS,
    weights: {
      "AI & Machine Learning": 85,
      "Finance & Markets": 70,
      "Science": 75,
      "World News": 50,
    },
  };
}

export { AVAILABLE_TOPICS };

export function saveUserInterestsToLocalStorage(interests: UserInterests): void {
  try {
    localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(interests));
  } catch { /* */ }
}

export function InterestsScreen() {
  const [interests, setInterests] = useState<UserInterests>(() => ({
    activeTopics: DEFAULT_ACTIVE_TOPICS,
    weights: { "AI & Machine Learning": 85, "Finance & Markets": 70, "Science": 75, "World News": 50 },
  }));

  useEffect(() => {
    setInterests(loadUserInterestsFromLocalStorage());
  }, []);

  const toggleTopic = useCallback((topic: string) => {
    setInterests((prev) => {
      const isActive = prev.activeTopics.includes(topic);
      const updated: UserInterests = {
        ...prev,
        activeTopics: isActive
          ? prev.activeTopics.filter((t) => t !== topic)
          : [...prev.activeTopics, topic],
      };
      saveUserInterestsToLocalStorage(updated);
      return updated;
    });
  }, []);

  const updateWeight = useCallback((topic: string, value: number) => {
    setInterests((prev) => {
      const updated: UserInterests = {
        ...prev,
        weights: { ...prev.weights, [topic]: value },
      };
      saveUserInterestsToLocalStorage(updated);
      return updated;
    });
  }, []);

  const activeWeightTopics = interests.activeTopics.filter(
    (t) => t in interests.weights || interests.activeTopics.includes(t)
  );

  return (
    <div className="mx-auto max-w-[580px] px-6 py-8">
      <h2 className="text-center font-serif text-3xl font-bold">
        Your Interests
      </h2>
      <p className="mt-2 text-center text-sm text-muted">
        Tap topics to follow. Adjust weights to control story prominence.
        AI agents can read these preferences via WebMCP.
      </p>

      <div className="mt-8">
        <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
          Topics
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {AVAILABLE_TOPICS.map((topic) => {
            const isActive = interests.activeTopics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                  isActive
                    ? "border-accent bg-accent text-white"
                    : "border-rule text-muted hover:border-muted"
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
          Weight
        </h3>
        <div className="space-y-3">
          {activeWeightTopics.map((topic) => (
            <div key={topic} className="flex items-center gap-3 px-2">
              <label className="min-w-[100px] text-[13px] font-medium">
                {topic.length > 15 ? topic.slice(0, 15) + "..." : topic}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={interests.weights[topic] ?? 50}
                onChange={(e) => updateWeight(topic, Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="min-w-[28px] text-right text-[12px] text-muted">
                {interests.weights[topic] ?? 50}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
