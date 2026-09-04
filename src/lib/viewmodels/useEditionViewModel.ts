"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Edition, Story } from "@/lib/types";
import { registerAllWebMCPTools } from "@/lib/webmcp";
import { trackStoryOpened } from "@/lib/readingTracker";
import { startAutoCurationScheduler, AUTO_CURATION_RUN_EVENT_NAME } from "@/lib/autoCurationScheduler";
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

function compareEditionsByDateAscending(first: Edition, second: Edition): number {
  return first.editionDate.localeCompare(second.editionDate);
}

function compareIndexEntriesByDateAscending(first: EditionIndexEntry, second: EditionIndexEntry): number {
  return first.date.localeCompare(second.date);
}

function buildEditionIndexEntryForEdition(edition: Edition): EditionIndexEntry {
  return {
    date: edition.editionDate,
    editionNumber: edition.editionNumber,
    file: `edition-${edition.editionDate}.json`,
  };
}

function insertEditionSortedByDate(editions: Edition[], newEdition: Edition): Edition[] {
  if (editions.some((existing) => existing.editionDate === newEdition.editionDate)) return editions;
  return [...editions, newEdition].sort(compareEditionsByDateAscending);
}

// Editions created by agents or auto-curation live only in localStorage, never in
// index.json, so they must be merged in here or they vanish on the next reload.
function loadDynamicallyCreatedEditionsFromLocalStorage(staticEditionDates: Set<string>): Edition[] {
  const dynamicallyCreatedEditions: Edition[] = [];
  try {
    for (let keyIndex = 0; keyIndex < localStorage.length; keyIndex++) {
      const storageKey = localStorage.key(keyIndex);
      if (!storageKey?.startsWith(LOCAL_STORAGE_KEY_PREFIX)) continue;
      const editionDate = storageKey.slice(LOCAL_STORAGE_KEY_PREFIX.length);
      if (staticEditionDates.has(editionDate)) continue;
      const storedEdition = loadEditionFromLocalStorage(editionDate);
      if (storedEdition?.editionDate === editionDate && Array.isArray(storedEdition.stories)) {
        dynamicallyCreatedEditions.push(storedEdition);
      }
    }
  } catch {
    // localStorage unavailable — nothing dynamic to merge
  }
  return dynamicallyCreatedEditions;
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
        const staticEditionDates = new Set(data.editions.map((entry) => entry.date));
        const dynamicallyCreatedEditions = loadDynamicallyCreatedEditionsFromLocalStorage(staticEditionDates);
        const mergedEditions = [...editionsWithLocalOverrides, ...dynamicallyCreatedEditions].sort(
          compareEditionsByDateAscending
        );
        const mergedEditionIndex = [
          ...data.editions,
          ...dynamicallyCreatedEditions.map(buildEditionIndexEntryForEdition),
        ].sort(compareIndexEntriesByDateAscending);
        setEditionIndex(mergedEditionIndex);
        setAllEditions(mergedEditions);
        setCurrentEditionIdx(mergedEditions.length - 1);
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

  // flushSync makes the render (and the tool re-registration effect) complete before
  // this returns, so an agent's next tool call never sees a stale edition closure.
  const handleEditionMutatedByWebMCPTool = useCallback(
    (updatedEdition: Edition, editionArrayIndex: number) => {
      flushSync(() => {
        setAllEditions((prev) => {
          const next = [...prev];
          next[editionArrayIndex] = updatedEdition;
          return next;
        });
      });
      saveEditionToLocalStorage(updatedEdition);
    },
    []
  );

  // Inserts the new edition in date order, mirrors it into the index (the nav
  // arrows read editionIndex.length), persists it, and navigates to it. Returns
  // the index it will occupy so the caller can pass it to handleEditionMutatedByWebMCPTool.
  const handleNewEditionCreatedByAgentTool = useCallback(
    (newEdition: Edition): number => {
      const insertedAtIndex = insertEditionSortedByDate(allEditions, newEdition).findIndex(
        (existing) => existing.editionDate === newEdition.editionDate
      );
      flushSync(() => {
        setAllEditions((previousEditions) => insertEditionSortedByDate(previousEditions, newEdition));
        setEditionIndex((previousIndex) =>
          previousIndex.some((entry) => entry.date === newEdition.editionDate)
            ? previousIndex
            : [...previousIndex, buildEditionIndexEntryForEdition(newEdition)].sort(compareIndexEntriesByDateAscending)
        );
        setCurrentEditionIdx(insertedAtIndex);
      });
      saveEditionToLocalStorage(newEdition);
      return insertedAtIndex;
    },
    [allEditions]
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
      handleNewEditionCreatedByAgentTool,
      registrationAbortController.signal
    );
    return () => registrationAbortController.abort();
  }, [edition, allEditions, handleEditionMutatedByWebMCPTool, handleNewEditionCreatedByAgentTool]);

  useEffect(() => {
    startAutoCurationScheduler();
    const handleAutoCurationRunCompleted = (event: Event) => {
      const logEntry = (event as CustomEvent).detail;
      if (!logEntry?.editionDate) return;
      const curatedEdition = loadEditionFromLocalStorage(logEntry.editionDate);
      if (!curatedEdition) return;
      const existingEditionIndex = allEditions.findIndex((e) => e.editionDate === logEntry.editionDate);
      if (existingEditionIndex >= 0) {
        handleEditionMutatedByWebMCPTool(curatedEdition, existingEditionIndex);
      } else {
        handleNewEditionCreatedByAgentTool(curatedEdition);
      }
    };
    window.addEventListener(AUTO_CURATION_RUN_EVENT_NAME, handleAutoCurationRunCompleted);
    return () => window.removeEventListener(AUTO_CURATION_RUN_EVENT_NAME, handleAutoCurationRunCompleted);
  }, [allEditions, handleEditionMutatedByWebMCPTool, handleNewEditionCreatedByAgentTool]);

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
