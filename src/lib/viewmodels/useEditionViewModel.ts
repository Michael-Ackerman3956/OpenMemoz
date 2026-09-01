"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edition, Story } from "@/lib/types";
import { registerAllWebMCPTools } from "@/lib/webmcp";
import type { LayoutMode } from "@/lib/layoutRuleEngine";

export const SHOW_ALL_SECTIONS = "ALL";

export interface EditionViewModel {
  edition: Edition | null;
  filteredStories: Story[];
  activeSectionFilter: string;
  setActiveSectionFilter: (section: string) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  selectedStory: Story | null;
  selectStory: (story: Story) => void;
  clearSelection: () => void;
}

export function useEditionViewModel(): EditionViewModel {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [activeSectionFilter, setActiveSectionFilter] =
    useState<string>(SHOW_ALL_SECTIONS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("dynamic");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const activeSectionFilterRef = useRef(activeSectionFilter);
  activeSectionFilterRef.current = activeSectionFilter;

  useEffect(() => {
    const fetchAbortController = new AbortController();
    fetch("/edition.json", { signal: fetchAbortController.signal })
      .then((response) => response.json())
      .then((loadedEdition: Edition) => setEdition(loadedEdition))
      .catch((loadError: unknown) => {
        if ((loadError as Error).name !== "AbortError") {
          console.error("Failed to load edition", loadError);
        }
      });
    return () => fetchAbortController.abort();
  }, []);

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
    selectedStory,
    selectStory,
    clearSelection,
  };
}
