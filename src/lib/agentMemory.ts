/**
 * Agent-writable memory — app-layer persistence, NOT WebMCP.
 *
 * Lets AI agents store and recall facts about the user via WebMCP tools
 * (save_memory, recall_memories). The agent decides what to remember —
 * e.g. "user prefers long-form analysis" or "user skips finance stories."
 *
 * All data lives in the user's browser (localStorage). The agent accesses
 * it through WebMCP tools, but the user owns the data. No server needed.
 */

const AGENT_MEMORY_STORAGE_KEY = "openmemoz_agent_memory";
const MAXIMUM_MEMORY_ENTRIES = 50;

export interface AgentMemoryEntry {
  memoryIdentifier: string;
  content: string;
  category: string;
  savedAtTimestamp: number;
}

/**
 * Save a memory entry. Called by the WebMCP save_memory tool.
 * Deduplicates by memoryIdentifier — saving with the same ID overwrites.
 */
export function saveAgentMemoryEntry(
  memoryIdentifier: string,
  content: string,
  category: string
): void {
  const memories = loadAllAgentMemories();

  // Overwrite if same identifier exists
  const existingIndex = memories.findIndex(
    (m) => m.memoryIdentifier === memoryIdentifier
  );

  const entry: AgentMemoryEntry = {
    memoryIdentifier,
    content,
    category,
    savedAtTimestamp: Date.now(),
  };

  if (existingIndex >= 0) {
    memories[existingIndex] = entry;
  } else {
    memories.unshift(entry);
  }

  const trimmedMemories = memories.slice(0, MAXIMUM_MEMORY_ENTRIES);

  try {
    localStorage.setItem(
      AGENT_MEMORY_STORAGE_KEY,
      JSON.stringify(trimmedMemories)
    );
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Load all agent memories from localStorage.
 * Called by the WebMCP recall_memories tool.
 */
export function loadAllAgentMemories(): AgentMemoryEntry[] {
  try {
    const stored = localStorage.getItem(AGENT_MEMORY_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AgentMemoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Delete a specific memory entry by identifier.
 * Called by the WebMCP forget_memory tool.
 */
export function deleteAgentMemoryEntry(memoryIdentifier: string): boolean {
  const memories = loadAllAgentMemories();
  const filtered = memories.filter(
    (m) => m.memoryIdentifier !== memoryIdentifier
  );

  if (filtered.length === memories.length) return false;

  try {
    localStorage.setItem(
      AGENT_MEMORY_STORAGE_KEY,
      JSON.stringify(filtered)
    );
  } catch {
    // localStorage full or unavailable
  }

  return true;
}
