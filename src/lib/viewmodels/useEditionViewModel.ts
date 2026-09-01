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
  editionIndex: EditionIndexEntry[];
  currentEditionIdx: number;
}

export function useEditionViewModel(): EditionViewModel {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [editionIndex, setEditionIndex] = useState<EditionIndexEntry[]>([]);
  const [currentEditionIdx, setCurrentEditionIdx] = useState(-1);
  const [activeSectionFilter, setActiveSectionFilter] =
    useState<string>(SHOW_ALL_SECTIONS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("dynamic");
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("edition");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const activeSectionFilterRef = useRef(activeSectionFilter);
  activeSectionFilterRef.current = activeSectionFilter;

  useEffect(() => {
    fetch("/editions/index.json")
      .then((response) => response.json())
      .then((data: { editions: EditionIndexEntry[] }) => {
        setEditionIndex(data.editions);
        const latestIdx = data.editions.length - 1;
        setCurrentEditionIdx(latestIdx);
        return fetch(`/editions/${data.editions[latestIdx].file}`);
      })
      .then((response) => response.json())
      .then((loadedEdition: Edition) => setEdition(loadedEdition))
      .catch(() => {
        fetch("/edition.json")
          .then((response) => response.json())
          .then((loadedEdition: Edition) => setEdition(loadedEdition))
          .catch((loadError: unknown) => {
            console.error("Failed to load edition", loadError);
          });
      });
  }, []);

  const navigateEdition = useCallback(
    (direction: "prev" | "next") => {
      if (editionIndex.length === 0) return;
      const newIdx =
        direction === "prev"
          ? Math.max(0, currentEditionIdx - 1)
          : Math.min(editionIndex.length - 1, currentEditionIdx + 1);
      if (newIdx === currentEditionIdx) return;
      setCurrentEditionIdx(newIdx);
      setSelectedStory(null);
      fetch(`/editions/${editionIndex[newIdx].file}`)
        .then((response) => response.json())
        .then((loadedEdition: Edition) => setEdition(loadedEdition))
        .catch((loadError: unknown) => {
          console.error("Failed to load edition", loadError);
        });
    },
    [editionIndex, currentEditionIdx]
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
    editionIndex,
    currentEditionIdx,
  };
}
