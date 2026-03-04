import { getKnowledgeBaseByKey } from '../constants/knowledgeBases';

const STORAGE_KEY = 'nexus_mounted_knowledge_bases';

function normalizeMountedKnowledgeBaseIds(ids: string[]): string[] {
  return Array.from(new Set(ids)).filter((id) => Boolean(getKnowledgeBaseByKey(id)));
}

export function getMountedKnowledgeBaseIds(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeMountedKnowledgeBaseIds(
      parsed.filter((item): item is string => typeof item === 'string')
    );
  } catch (error) {
    console.error('Failed to load mounted knowledge bases:', error);
    return [];
  }
}

export function saveMountedKnowledgeBaseIds(ids: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizeMountedKnowledgeBaseIds(ids))
    );
  } catch (error) {
    console.error('Failed to save mounted knowledge bases:', error);
  }
}
