import {
  getKnowledgeBasesByKeys,
  type KnowledgeBaseDefinition,
} from '../src/constants/knowledgeBases';

interface AppforgeDatasetResponse {
  code?: string;
  message?: string;
  data?: {
    datasetQueryResults?: Array<{
      content?: string;
      contentShot?: string;
    }>;
  };
}

interface RetrievedKnowledgeBaseChunks {
  knowledgeBase: KnowledgeBaseDefinition;
  chunks: string[];
  topK: number;
}

export interface KnowledgeBaseContextResult {
  mountedKnowledgeBases: Array<{
    key: string;
    name: string;
  }>;
  contextText: string;
  debug?: {
    enabled: boolean;
    query: string;
    totalTopK: number;
    knowledgeBases: Array<{
      key: string;
      name: string;
      topK: number;
      chunkCount: number;
      chunkPreview: string[];
      error?: string;
    }>;
    contextLength: number;
  };
}

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolvePositiveIntOverride(
  overrideValue: number | undefined,
  fallback: number
): number {
  if (typeof overrideValue !== 'number' || !Number.isFinite(overrideValue)) {
    return fallback;
  }

  const normalized = Math.floor(overrideValue);
  return normalized > 0 ? normalized : fallback;
}

function getKnowledgeBaseRuntimeConfig() {
  return {
    appforgeDatasetApiUrl:
      process.env.APPFORGE_DATASET_API_URL?.trim() ||
      'https://ai.cecloud.com:37701/ceai/appforge/api/v1/TestDataset',
    appforgeCookie: process.env.APPFORGE_COOKIE?.trim() || '',
    appforgeRegionId: process.env.APPFORGE_REGION_ID?.trim() || 'region1',
    appforgeAuthValidate:
      process.env.APPFORGE_X_AUTH_VALIDATE?.trim() || 'true',
    defaultTotalTopK: parsePositiveInt(
      process.env.KNOWLEDGE_BASE_TOTAL_TOP_K,
      6
    ),
    maxContextChars: parsePositiveInt(
      process.env.KNOWLEDGE_BASE_MAX_CONTEXT_CHARS,
      8000
    ),
    maxChunkChars: parsePositiveInt(
      process.env.KNOWLEDGE_BASE_MAX_CHUNK_CHARS,
      1200
    ),
    debug:
      process.env.KNOWLEDGE_BASE_DEBUG?.trim().toLowerCase() === 'true',
  };
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function isIgnoredStructuredKey(key: string): boolean {
  const normalizedKey = key.trim().toLowerCase();
  return normalizedKey === 'id' || normalizedKey === '_id' || normalizedKey === 'uuid';
}

function flattenStructuredValue(value: unknown, keyPrefix = ''): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    const normalized = normalizeWhitespace(value);
    if (!normalized) {
      return [];
    }
    return keyPrefix ? [`${keyPrefix}：${normalized}`] : [normalized];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return keyPrefix ? [`${keyPrefix}：${String(value)}`] : [String(value)];
  }

  if (Array.isArray(value)) {
    const flattenedArray = value.flatMap((item) => flattenStructuredValue(item));
    if (!keyPrefix) {
      return flattenedArray;
    }
    if (flattenedArray.length === 0) {
      return [];
    }
    return [`${keyPrefix}：${flattenedArray.join('；')}`];
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
      if (isIgnoredStructuredKey(key)) {
        return [];
      }

      if (
        nestedValue !== null &&
        typeof nestedValue === 'object' &&
        !Array.isArray(nestedValue)
      ) {
        return flattenStructuredValue(
          nestedValue,
          keyPrefix ? `${keyPrefix}.${key}` : key
        );
      }

      return flattenStructuredValue(nestedValue, keyPrefix ? `${keyPrefix}.${key}` : key);
    });
  }

  return [];
}

function cleanChunkContent(rawContent: string): string {
  const trimmedContent = rawContent.trim();
  if (!trimmedContent) {
    return '';
  }

  const looksLikeJson =
    trimmedContent.startsWith('{') || trimmedContent.startsWith('[');

  if (!looksLikeJson) {
    return normalizeWhitespace(trimmedContent);
  }

  try {
    const parsed = JSON.parse(trimmedContent) as unknown;
    const flattenedLines = flattenStructuredValue(parsed);
    if (flattenedLines.length === 0) {
      return normalizeWhitespace(trimmedContent);
    }
    return flattenedLines.join('\n');
  } catch {
    return normalizeWhitespace(trimmedContent);
  }
}

function distributeTopK(totalTopK: number, knowledgeBaseCount: number): number[] {
  if (knowledgeBaseCount <= 0) {
    return [];
  }

  const effectiveTotalTopK = Math.max(totalTopK, knowledgeBaseCount);
  const baseTopK = Math.floor(effectiveTotalTopK / knowledgeBaseCount);
  const remainder = effectiveTotalTopK % knowledgeBaseCount;

  return Array.from({ length: knowledgeBaseCount }, (_item, index) => {
    const extra = index < remainder ? 1 : 0;
    return Math.max(1, baseTopK + extra);
  });
}

async function requestAppforgeKnowledgeBaseChunks(
  knowledgeBase: KnowledgeBaseDefinition,
  query: string,
  topK: number
): Promise<RetrievedKnowledgeBaseChunks> {
  const runtimeConfig = getKnowledgeBaseRuntimeConfig();

  if (!runtimeConfig.appforgeCookie) {
    throw new Error('服务端未配置 APPFORGE_COOKIE');
  }

  const response = await fetch(runtimeConfig.appforgeDatasetApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-validate': runtimeConfig.appforgeAuthValidate,
      'x-regionid': runtimeConfig.appforgeRegionId,
      Cookie: runtimeConfig.appforgeCookie,
    },
    body: JSON.stringify({
      projectID: knowledgeBase.projectId,
      id: knowledgeBase.datasetId,
      query,
      retrievalModel: {
        rerankingEnable: true,
        rerankingModel: {
          rerankingModelName: '',
          rerankingProviderName: '',
        },
        scoreThreshold: 0.1,
        scoreThresholdEnabled: true,
        searchMethod: 'HybridSearch',
        topK,
        weights: 0.6,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `${knowledgeBase.name} 检索失败（${response.status}）`
    );
  }

  const payload = (await response.json()) as AppforgeDatasetResponse;
  if (payload.code && payload.code !== 'Success') {
    throw new Error(
      payload.message || `${knowledgeBase.name} 检索返回异常`
    );
  }

  const seen = new Set<string>();
  const chunks = (payload.data?.datasetQueryResults || [])
    .map((item) => cleanChunkContent(item.content || item.contentShot || ''))
    .filter((chunk) => {
      if (!chunk || seen.has(chunk)) {
        return false;
      }
      seen.add(chunk);
      return true;
    });

  return {
    knowledgeBase,
    chunks,
    topK,
  };
}

function buildDebugSummary(
  query: string,
  settledResults: PromiseSettledResult<RetrievedKnowledgeBaseChunks>[],
  mountedKnowledgeBases: KnowledgeBaseDefinition[],
  topKDistribution: number[],
  contextText: string,
  totalTopK: number
): NonNullable<KnowledgeBaseContextResult['debug']> {
  return {
    enabled: true,
    query,
    totalTopK,
    knowledgeBases: mountedKnowledgeBases.map((knowledgeBase, index) => {
      const settledResult = settledResults[index];

      if (!settledResult) {
        return {
          key: knowledgeBase.key,
          name: knowledgeBase.name,
          topK: topKDistribution[index] || 1,
          chunkCount: 0,
          chunkPreview: [],
          error: '未生成检索结果',
        };
      }

      if (settledResult.status === 'rejected') {
        return {
          key: knowledgeBase.key,
          name: knowledgeBase.name,
          topK: topKDistribution[index] || 1,
          chunkCount: 0,
          chunkPreview: [],
          error:
            settledResult.reason instanceof Error
              ? settledResult.reason.message
              : '知识库检索失败',
        };
      }

      return {
        key: knowledgeBase.key,
        name: knowledgeBase.name,
        topK: settledResult.value.topK,
        chunkCount: settledResult.value.chunks.length,
        chunkPreview: settledResult.value.chunks
          .slice(0, 3)
          .map((chunk) => truncateText(chunk, 120)),
      };
    }),
    contextLength: contextText.length,
  };
}

function logKnowledgeBaseDebug(
  debug: NonNullable<KnowledgeBaseContextResult['debug']>
): void {
  console.log('[KB DEBUG] query:', debug.query);
  console.log('[KB DEBUG] totalTopK:', debug.totalTopK);

  debug.knowledgeBases.forEach((knowledgeBase, index) => {
    console.log(
      `[KB DEBUG] [${index + 1}] ${knowledgeBase.name} topK=${knowledgeBase.topK} chunkCount=${knowledgeBase.chunkCount}`
    );

    if (knowledgeBase.error) {
      console.log(`[KB DEBUG] [${index + 1}] error=${knowledgeBase.error}`);
      return;
    }

    knowledgeBase.chunkPreview.forEach((preview, previewIndex) => {
      console.log(
        `[KB DEBUG] [${index + 1}] chunkPreview${previewIndex + 1}: ${preview}`
      );
    });
  });

  console.log('[KB DEBUG] contextLength:', debug.contextLength);
}

function formatKnowledgeBaseContext(
  retrievedResults: RetrievedKnowledgeBaseChunks[],
  options: {
    maxContextChars: number;
    maxChunkChars: number;
  }
): string {
  const blocks: string[] = [];
  let totalChars = 0;

  for (const result of retrievedResults) {
    result.chunks.forEach((chunk, index) => {
      const normalizedChunk = truncateText(chunk, options.maxChunkChars);
      const block = `【知识库：${result.knowledgeBase.name}｜片段${index + 1}】\n${normalizedChunk}`;

      if (
        totalChars > 0 &&
        totalChars + block.length > options.maxContextChars
      ) {
        return;
      }

      blocks.push(block);
      totalChars += block.length;
    });
  }

  return blocks.join('\n\n');
}

export async function getKnowledgeBaseContext({
  knowledgeBaseKeys,
  query,
  totalTopKOverride,
  maxContextCharsOverride,
  maxChunkCharsOverride,
}: {
  knowledgeBaseKeys?: string[];
  query: string;
  totalTopKOverride?: number;
  maxContextCharsOverride?: number;
  maxChunkCharsOverride?: number;
}): Promise<KnowledgeBaseContextResult> {
  const runtimeConfig = getKnowledgeBaseRuntimeConfig();
  const effectiveTotalTopK = resolvePositiveIntOverride(
    totalTopKOverride,
    runtimeConfig.defaultTotalTopK
  );
  const effectiveMaxContextChars = resolvePositiveIntOverride(
    maxContextCharsOverride,
    runtimeConfig.maxContextChars
  );
  const effectiveMaxChunkChars = resolvePositiveIntOverride(
    maxChunkCharsOverride,
    runtimeConfig.maxChunkChars
  );
  const mountedKnowledgeBases = getKnowledgeBasesByKeys(knowledgeBaseKeys || []);
  const mountedKnowledgeBaseRefs = mountedKnowledgeBases.map((knowledgeBase) => ({
    key: knowledgeBase.key,
    name: knowledgeBase.name,
  }));

  if (!query.trim() || mountedKnowledgeBases.length === 0) {
    const result: KnowledgeBaseContextResult = {
      mountedKnowledgeBases: mountedKnowledgeBaseRefs,
      contextText: '',
    };

    if (runtimeConfig.debug) {
      result.debug = {
        enabled: true,
        query,
        totalTopK: effectiveTotalTopK,
        knowledgeBases: mountedKnowledgeBases.map((knowledgeBase) => ({
          key: knowledgeBase.key,
          name: knowledgeBase.name,
          topK: 0,
          chunkCount: 0,
          chunkPreview: [],
        })),
        contextLength: 0,
      };
      logKnowledgeBaseDebug(result.debug);
    }

    return result;
  }

  const topKDistribution = distributeTopK(
    effectiveTotalTopK,
    mountedKnowledgeBases.length
  );

  const settledResults = await Promise.allSettled(
    mountedKnowledgeBases.map((knowledgeBase, index) =>
      requestAppforgeKnowledgeBaseChunks(
        knowledgeBase,
        query,
        topKDistribution[index] || 1
      )
    )
  );

  const successfulResults = settledResults
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<RetrievedKnowledgeBaseChunks> =>
        result.status === 'fulfilled'
    )
    .map((result) => result.value)
    .filter((result) => result.chunks.length > 0);

  if (successfulResults.length === 0) {
    const firstFailure = settledResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );

    if (firstFailure) {
      throw firstFailure.reason instanceof Error
        ? firstFailure.reason
        : new Error('知识库检索失败');
    }
  }

  const contextText = formatKnowledgeBaseContext(successfulResults, {
    maxContextChars: effectiveMaxContextChars,
    maxChunkChars: effectiveMaxChunkChars,
  });
  const result: KnowledgeBaseContextResult = {
    mountedKnowledgeBases: mountedKnowledgeBaseRefs,
    contextText,
  };

  if (runtimeConfig.debug) {
    result.debug = buildDebugSummary(
      query,
      settledResults,
      mountedKnowledgeBases,
      topKDistribution,
      contextText,
      effectiveTotalTopK
    );
    logKnowledgeBaseDebug(result.debug);
  }

  return result;
}
