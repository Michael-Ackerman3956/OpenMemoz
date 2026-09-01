"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edition, Story } from "@/lib/types";
import { registerAllWebMCPTools } from "@/lib/webmcp";
import type { LayoutMode } from "@/lib/layoutRuleEngine";

export const SHOW_ALL_SECTIONS = "ALL";
export type ActiveScreen = "edition" | "interests" | "settings";

interface EditionIndexEntry {
  date: string;
  editionNumber: number;
  file: string;
}

export interface EditionViewModel {
  edition: Edition | null;
  allEditions: Edition[];
  filteredStories: Story[];
  activeSectionFilter: string;
  setActiveSectionFilter: (section: string) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  selectedStory: Story | null;
  selectStory: (story: Story) => void;
  clearSelection: () => void;
  navigateEdition: (direction: "prev" | "next") => void;
  goToEditionIndex: (editionArrayIndex: number) => void;
  editionIndex: EditionIndexEntry[];
  currentEditionIdx: number;
}

export function useEditionViewModel(): EditionViewModel {
  const [allEditions, setAllEditions] = useState<Edition[]>([]);
  const [editionIndex, setEditionIndex] = useState<EditionIndexEntry[]>([]);
  const [currentEditionIdx, setCurrentEditionIdx] = useState(-1);
  const [activeSectionFilter, setActiveSectionFilter] =
    useState<string>(SHOW_ALL_SECTIONS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("dynamic");
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("edition");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const activeSectionFilterRef = useRef(activeSectionFilter);
  activeSectionFilterRef.current = activeSectionFilter;

  // Preload ALL editions up front (small static JSONs) so date navigation
  // and the page-flip book never wait on a fetch.
  useEffect(() => {
    fetch("/editions/index.json")
      .then((response) => response.json())
      .then(async (data: { editions: EditionIndexEntry[] }) => {
        const loadedEditions = await Promise.all(
          data.editions.map((entry) =>
            fetch(`/editions/${entry.file}`).then(
              (response) => response.json() as Promise<Edition>
            )
          )
        );
        setEditionIndex(data.editions);
        setAllEditions(loadedEditions);
        setCurrentEditionIdx(loadedEditions.length - 1);
      })
      .catch(() => {
        fetch("/edition.json")
          .then((response) => response.json())
          .then((fallbackEdition: Edition) => {
            setAllEditions([fallbackEdition]);
            setEditionIndex([
              {
                date: fallbackEdition.editionDate,
                editionNumber: fallbackEdition.editionNumber,
                file: "edition.json",
              },
            ]);
            setCurrentEditionIdx(0);
          })
          .catch((loadError: unknown) => {
            console.error("Failed to load edition", loadError);
          });
      });
  }, []);

  const edition =
    currentEditionIdx >= 0 ? allEditions[currentEditionIdx] ?? null : null;

  const goToEditionIndex = useCallback(
    (editionArrayIndex: number) => {
      if (
        editionArrayIndex < 0 ||
        editionArrayIndex >= allEditions.length ||
        editionArrayIndex === currentEditionIdx
      )
        return;
      setCurrentEditionIdx(editionArrayIndex);
      setSelectedStory(null);
    },
    [allEditions.length, currentEditionIdx]
  );

  const navigateEdition = useCallback(
    (direction: "prev" | "next") => {
      const newIdx =
        direction === "prev"
          ? Math.max(0, currentEditionIdx - 1)
          : Math.min(allEditions.length - 1, currentEditionIdx + 1);
      goToEditionIndex(newIdx);
    },
    [allEditions.length, currentEditionIdx, goToEditionIndex]
  );

  useEffect(() => {
    if (!edition) return;
    const registrationAbortController = new AbortController();
    registerAllWebMCPTools(
      edition,
      () => activeSectionFilterRef.current,
      setActiveSectionFilter,
      registrationAbortController.signal
    );
    return () => registrationAbortController.abort();
  }, [edition]);

  const filteredStories = useMemo(() => {
    if (!edition) return [];
    if (activeSectionFilter === SHOW_ALL_SECTIONS) return edition.stories;
    return edition.stories.filter(
      (story) => story.section === activeSectionFilter
    );
  }, [edition, activeSectionFilter]);

  const selectStory = useCallback(
    (story: Story) => setSelectedStory(story),
    []
  );
  const clearSelection = useCallback(() => setSelectedStory(null), []);

  return {
    edition,
    allEditions,
    filteredStories,
    activeSectionFilter,
    setActiveSectionFilter,
    layoutMode,
    setLayoutMode,
    activeScreen,
    setActiveScreen,
    selectedStory,
    selectStory,
    clearSelection,
    navigateEdition,
    goToEditionIndex,
    editionIndex,
    currentEditionIdx,
  };
}
