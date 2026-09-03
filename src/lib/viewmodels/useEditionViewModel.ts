"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edition, Story } from "@/lib/types";
import { registerAllWebMCPTools } from "@/lib/webmcp";
import { trackStoryOpened } from "@/lib/readingTracker";
import type { LayoutMode } from "@/lib/layoutRuleEngine";
import type { VisualStyleIdentifier } from "@/lib/themeSystem";
import {
  loadSavedPaletteIdentifier,
  loadSavedVisualStyleIdentifier,
  savePaletteIdentifier,
  saveVisualStyleIdentifier,
  findPaletteByIdentifier,
  applyPaletteToDocument,
  applyVisualStyleToDocument,
} from "@/lib/themeSystem";

export const SHOW_ALL_SECTIONS = "ALL";
export type ActiveScreen = "edition" | "interests" | "settings";

const LOCAL_STORAGE_KEY_PREFIX = "openmemoz_edition_";

function saveEditionToLocalStorage(edition: Edition): void {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY_PREFIX + edition.editionDate,
      JSON.stringify(edition)
    );
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

function loadEditionFromLocalStorage(editionDate: string): Edition | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + editionDate);
    return stored ? (JSON.parse(stored) as Edition) : null;
  } catch {
    return null;
  }
}

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
  activePaletteIdentifier: string;
  setActivePaletteIdentifier: (paletteIdentifier: string) => void;
  activeVisualStyle: VisualStyleIdentifier;
  setActiveVisualStyle: (style: VisualStyleIdentifier) => void;
  toggleFavouriteForStory: (storyIdentifier: string) => void;
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
  const [activePaletteIdentifier, setActivePaletteIdentifierState] = useState("midnight");
  const [activeVisualStyle, setActiveVisualStyleState] = useState<VisualStyleIdentifier>("flat");

  const activeSectionFilterRef = useRef(activeSectionFilter);
  activeSectionFilterRef.current = activeSectionFilter;

  // Load and apply saved theme on mount
  useEffect(() => {
    const savedPalette = loadSavedPaletteIdentifier();
    const savedStyle = loadSavedVisualStyleIdentifier();
    setActivePaletteIdentifierState(savedPalette);
    setActiveVisualStyleState(savedStyle);
    applyPaletteToDocument(findPaletteByIdentifier(savedPalette));
    applyVisualStyleToDocument(savedStyle);
  }, []);

  const setActivePaletteIdentifier = useCallback((paletteIdentifier: string) => {
    setActivePaletteIdentifierState(paletteIdentifier);
    savePaletteIdentifier(paletteIdentifier);
    applyPaletteToDocument(findPaletteByIdentifier(paletteIdentifier));
  }, []);

  const setActiveVisualStyle = useCallback((style: VisualStyleIdentifier) => {
    setActiveVisualStyleState(style);
    saveVisualStyleIdentifier(style);
    applyVisualStyleToDocument(style);
  }, []);

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
        const editionsWithLocalOverrides = loadedEditions.map((edition) => {
          const localVersion = loadEditionFromLocalStorage(edition.editionDate);
          return localVersion ?? edition;
        });
        setEditionIndex(data.editions);
        setAllEditions(editionsWithLocalOverrides);
        setCurrentEditionIdx(editionsWithLocalOverrides.length - 1);
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

  const handleEditionMutatedByWebMCPTool = useCallback(
    (updatedEdition: Edition, editionArrayIndex: number) => {
      setAllEditions((prev) => {
        const next = [...prev];
        next[editionArrayIndex] = updatedEdition;
        return next;
      });
      saveEditionToLocalStorage(updatedEdition);
    },
    []
  );

  useEffect(() => {
    if (!edition) return;
    const registrationAbortController = new AbortController();
    registerAllWebMCPTools(
      edition,
      allEditions,
      () => activeSectionFilterRef.current,
      setActiveSectionFilter,
      handleEditionMutatedByWebMCPTool,
      registrationAbortController.signal
    );
    return () => registrationAbortController.abort();
  }, [edition, allEditions, handleEditionMutatedByWebMCPTool]);

  const filteredStories = useMemo(() => {
    if (!edition) return [];
    if (activeSectionFilter === SHOW_ALL_SECTIONS) return edition.stories;
    return edition.stories.filter(
      (story) => story.section === activeSectionFilter
    );
  }, [edition, activeSectionFilter]);

  // Reading tracker: when user opens a story, start tracking time.
  // When they close it, finalize the duration and save to localStorage.
  const stopTrackingReadRef = useRef<(() => void) | null>(null);

  const selectStory = useCallback((story: Story) => {
    // Finalize any previous reading session
    stopTrackingReadRef.current?.();
    stopTrackingReadRef.current = trackStoryOpened(
      story.storyIdentifier,
      story.headline,
      story.section
    );
    setSelectedStory(story);
  }, []);

  const clearSelection = useCallback(() => {
    stopTrackingReadRef.current?.();
    stopTrackingReadRef.current = null;
    setSelectedStory(null);
  }, []);

  const toggleFavouriteForStory = useCallback(
    (storyIdentifier: string) => {
      if (!edition) return;
      const storyIndex = edition.stories.findIndex(
        (s) => s.storyIdentifier === storyIdentifier
      );
      if (storyIndex === -1) return;
      const updatedStories = [...edition.stories];
      const currentStory = updatedStories[storyIndex];
      updatedStories[storyIndex] = {
        ...currentStory,
        isFavourite: !currentStory.isFavourite || undefined,
      };
      const updatedEdition: Edition = { ...edition, stories: updatedStories };
      handleEditionMutatedByWebMCPTool(updatedEdition, currentEditionIdx);
      if (selectedStory?.storyIdentifier === storyIdentifier) {
        setSelectedStory(updatedStories[storyIndex]);
      }
    },
    [edition, currentEditionIdx, handleEditionMutatedByWebMCPTool, selectedStory]
  );

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
    activePaletteIdentifier,
    setActivePaletteIdentifier,
    activeVisualStyle,
    setActiveVisualStyle,
    toggleFavouriteForStory,
  };
}
