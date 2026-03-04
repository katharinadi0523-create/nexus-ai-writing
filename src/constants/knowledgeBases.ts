export type KnowledgeBaseSource = 'appforge';

export interface KnowledgeBaseDefinition {
  key: string;
  name: string;
  description: string;
  source: KnowledgeBaseSource;
  sourceLabel: string;
  projectId: string;
  datasetId: string;
  itemCount?: number;
  size?: string;
  createdAt?: string;
}

export const knowledgeBaseRegistry: KnowledgeBaseDefinition[] = [
  {
    key: 'appforge:proj-5ss04wr7:docstore_3qY9FZtK',
    name: '现代化作战报告集',
    description: '来自应用开发平台的真实知识库，可为通用写作智能体提供外挂检索片段。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectId: 'proj-5ss04wr7',
    datasetId: 'docstore_3qY9FZtK',
  },
  {
    key: 'appforge:proj-p5x1v8uj:j0im0b3s',
    name: '盐池项目基本信息知识库',
    description: '来自应用开发平台的真实知识库，提供盐池项目相关基础信息检索能力。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectId: 'proj-p5x1v8uj',
    datasetId: 'docstore_j0im0b3s',
  },
];

const knowledgeBaseMap = new Map(
  knowledgeBaseRegistry.map((knowledgeBase) => [knowledgeBase.key, knowledgeBase])
);

export function getAllKnowledgeBases(): KnowledgeBaseDefinition[] {
  return knowledgeBaseRegistry;
}

export function getKnowledgeBaseByKey(
  key: string
): KnowledgeBaseDefinition | undefined {
  return knowledgeBaseMap.get(key);
}

export function getKnowledgeBasesByKeys(
  keys: string[]
): KnowledgeBaseDefinition[] {
  const seen = new Set<string>();

  return keys.reduce<KnowledgeBaseDefinition[]>((result, key) => {
    if (seen.has(key)) {
      return result;
    }

    const knowledgeBase = knowledgeBaseMap.get(key);
    if (!knowledgeBase) {
      return result;
    }

    seen.add(key);
    result.push(knowledgeBase);
    return result;
  }, []);
}

export function groupKnowledgeBasesBySource(): Array<{
  sourceLabel: string;
  items: KnowledgeBaseDefinition[];
}> {
  const groups = new Map<string, KnowledgeBaseDefinition[]>();

  knowledgeBaseRegistry.forEach((knowledgeBase) => {
    const current = groups.get(knowledgeBase.sourceLabel) || [];
    current.push(knowledgeBase);
    groups.set(knowledgeBase.sourceLabel, current);
  });

  return Array.from(groups.entries()).map(([sourceLabel, items]) => ({
    sourceLabel,
    items,
  }));
}
