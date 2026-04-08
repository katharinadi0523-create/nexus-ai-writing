type KnowledgeBaseSource = 'appforge';
type KnowledgeBaseRetrievalMode = 'live' | 'mock';

interface KnowledgeBaseDefinition {
  key: string;
  name: string;
  description: string;
  source: KnowledgeBaseSource;
  sourceLabel: string;
  projectName: string;
  projectId: string;
  datasetId: string;
  retrievalMode: KnowledgeBaseRetrievalMode;
  mockChunks?: string[];
}

const knowledgeBaseRegistry: KnowledgeBaseDefinition[] = [
  {
    key: 'appforge:mock-product-ops-2026-q1:product-quarterly-reports-2025',
    name: '25年产品季报',
    description: '沉淀 2025 年产品季度经营复盘、关键指标拆解与阶段策略总结。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '2026-Q1-产品经营',
    projectId: 'mock-product-ops-2026-q1',
    datasetId: 'mock_product_quarterly_reports_2025',
    retrievalMode: 'mock',
    mockChunks: [
      '产品季报通常需要同时呈现目标达成、核心指标变化、重点动作复盘与下阶段策略，避免只罗列数据不解释原因。',
      '季度经营复盘建议从收入贡献、用户增长、重点场景渗透和组织协同四个维度展开，突出变化趋势与关键转折点。',
      '面向管理层的季报结论应先给总体判断，再给结构性问题和下一季度行动，保证信息密度和决策可读性。',
    ],
  },
  {
    key: 'appforge:mock-product-ops-2026-q1:product-monthly-reports-2026',
    name: '26年产品月报',
    description: '整理 2026 年产品月度经营汇报材料，便于复用月报结构、表达与分析框架。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '2026-Q1-产品经营',
    projectId: 'mock-product-ops-2026-q1',
    datasetId: 'mock_product_monthly_reports_2026',
    retrievalMode: 'mock',
    mockChunks: [
      '产品月报建议固定呈现收入、活跃、转化、交付进度和风险事项五类内容，保证月度对比的一致性。',
      '月报分析要区分同比、环比和累计口径，避免把短期波动误判为长期趋势。',
      '当月重点结论应尽量落到具体产品线、客户群或场景，帮助管理层快速判断问题发生在哪里。',
    ],
  },
  {
    key: 'appforge:mock-product-ops-2026-q1:business-analysis-cases',
    name: '常见经营分析案例',
    description: '汇总收入、成本、毛利、活跃与转化等常见经营分析案例，适合复盘和数据汇报场景。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '2026-Q1-产品经营',
    projectId: 'mock-product-ops-2026-q1',
    datasetId: 'mock_business_analysis_cases',
    retrievalMode: 'mock',
    mockChunks: [
      '经营分析案例通常需要把现象、原因、影响和建议动作串成闭环，避免只停留在指标涨跌描述。',
      '分析收入增长时，建议拆分存量增购、新签转化和价格调整三类驱动，判断增长是否可持续。',
      '针对活跃度下滑类案例，可从用户结构变化、核心路径转化和功能使用深度三层定位问题。',
    ],
  },
  {
    key: 'appforge:mock-product-ops-2026-q1:classic-business-issue-cases',
    name: '经营问题经典case',
    description: '沉淀增长放缓、毛利承压、交付波动等典型经营问题的分析路径与复盘案例。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '2026-Q1-产品经营',
    projectId: 'mock-product-ops-2026-q1',
    datasetId: 'mock_classic_business_issue_cases',
    retrievalMode: 'mock',
    mockChunks: [
      '经典经营问题复盘应先判断是结构性问题还是阶段性波动，再决定是做专项治理还是持续观察。',
      '毛利承压类 case 往往要同步检查报价策略、实施边界和资源投入效率，不能只看单一成本项。',
      '对于新签转化变慢的问题，可从商机质量、销售周期、方案匹配度和决策链条长度四个维度展开排查。',
    ],
  },
  {
    key: 'appforge:mock-product-ops-2026-q1:reporting-metrics-definitions',
    name: '产品经营数据汇报数据口径',
    description: '统一产品经营汇报中的收入、毛利、活跃、转化与留存等指标定义和统计口径。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '2026-Q1-产品经营',
    projectId: 'mock-product-ops-2026-q1',
    datasetId: 'mock_reporting_metrics_definitions',
    retrievalMode: 'mock',
    mockChunks: [
      '经营汇报中的收入指标需明确是否含税、是否按签约口径还是确认口径统计，避免跨报告直接比较。',
      '毛利率分析应统一成本归集范围，明确是否包含实施人力、售后支持和渠道分成等间接成本。',
      '活跃、转化、留存等用户指标必须同步说明统计周期、去重规则和样本范围，确保口径一致。',
    ],
  },
  {
    key: 'appforge:proj-5ss04wr7:docstore_3qY9FZtK',
    name: '现代化作战报告集',
    description: '来自应用开发平台的真实知识库，可为通用写作智能体提供外挂检索片段。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: 'AF-PM项目组',
    projectId: 'proj-5ss04wr7',
    datasetId: 'docstore_3qY9FZtK',
    retrievalMode: 'live',
  },
  {
    key: 'appforge:proj-p5x1v8uj:j0im0b3s',
    name: '盐池项目基本信息知识库',
    description: '来自应用开发平台的真实知识库，提供盐池项目相关基础信息检索能力。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: 'AF-PM项目组',
    projectId: 'proj-p5x1v8uj',
    datasetId: 'docstore_j0im0b3s',
    retrievalMode: 'live',
  },
  {
    key: 'appforge:mock-rd-efficiency:delivery-metrics',
    name: '研发效能指标口径知识库',
    description: '沉淀研发提效项目中的效能度量口径、周报模板和分析方法。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '研发提效',
    projectId: 'mock-rd-efficiency',
    datasetId: 'mock_delivery_metrics',
    retrievalMode: 'mock',
    mockChunks: [
      '研发提效项目重点跟踪部署频次、需求交付周期、变更失败率和平均恢复时长四类核心指标，用于衡量交付效率与稳定性。',
      '团队效能周报建议同时呈现需求吞吐、代码评审时长、流水线成功率和线上缺陷率，便于快速识别研发瓶颈。',
      '阶段性复盘应区分组织级指标与项目级指标，避免仅用单一吞吐指标判断团队产能。',
    ],
  },
  {
    key: 'appforge:mock-rd-efficiency:frontend-engineering',
    name: '前端工程规范知识库',
    description: '整理前端研发规范、组件复用策略和质量门禁建议，适合研发提效场景写作。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '研发提效',
    projectId: 'mock-rd-efficiency',
    datasetId: 'mock_frontend_engineering',
    retrievalMode: 'mock',
    mockChunks: [
      '前端工程规范建议统一目录结构、接口层封装、异常态处理和埋点命名规则，降低多人协作成本。',
      '组件设计优先抽象通用业务能力，避免把场景文案和交互状态硬编码在基础组件中。',
      '发布前应完成静态检查、关键路径自测和核心页面回归，形成稳定的前端质量门禁。',
    ],
  },
  {
    key: 'appforge:mock-rd-efficiency:cicd-playbook',
    name: 'CI/CD流水线优化案例库',
    description: '汇总持续集成、自动化发布和流水线提效案例，便于沉淀方案材料。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '研发提效',
    projectId: 'mock-rd-efficiency',
    datasetId: 'mock_cicd_playbook',
    retrievalMode: 'mock',
    mockChunks: [
      'CI/CD 提效通常从缓存构建依赖、拆分并行任务和收敛人工审批节点三个方向入手。',
      '流水线优化方案应明确构建时长、测试时长和发布成功率三个基线指标，便于评估收益。',
      '对关键系统可引入灰度发布和自动回滚机制，在保证稳定性的同时提升上线频次。',
    ],
  },
  {
    key: 'appforge:mock-qa-acceptance:acceptance-criteria',
    name: 'QA验收标准知识库',
    description: '沉淀 QA 验收流程、验收口径和交付标准，适合输出测试与验收文档。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: 'QA验收',
    projectId: 'mock-qa-acceptance',
    datasetId: 'mock_acceptance_criteria',
    retrievalMode: 'mock',
    mockChunks: [
      'QA 验收需覆盖功能完整性、接口联调、权限控制、异常处理和关键数据准确性五个核心维度。',
      '验收结论通常分为通过、有条件通过和不通过，需同步记录遗留问题、风险等级和整改时限。',
      '上线前验收报告建议附带测试范围、执行环境、缺陷统计和回归结果，便于项目归档。',
    ],
  },
  {
    key: 'appforge:mock-qa-acceptance:test-cases',
    name: '测试用例设计模板库',
    description: '整理功能测试、接口测试与回归测试模板，支持 QA 场景的知识调用。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: 'QA验收',
    projectId: 'mock-qa-acceptance',
    datasetId: 'mock_test_cases',
    retrievalMode: 'mock',
    mockChunks: [
      '测试用例模板建议包含前置条件、输入数据、执行步骤、预期结果和优先级，保证执行一致性。',
      '接口测试需重点覆盖鉴权失败、参数缺失、边界值和幂等性校验等异常场景。',
      '回归测试可以按高频路径、历史缺陷和跨模块影响面建立分层用例池，提高执行效率。',
    ],
  },
  {
    key: 'appforge:mock-qa-acceptance:defect-regression',
    name: '缺陷分级与回归策略库',
    description: '包含缺陷分级标准、回归范围界定和验收风险管理经验。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: 'QA验收',
    projectId: 'mock-qa-acceptance',
    datasetId: 'mock_defect_regression',
    retrievalMode: 'mock',
    mockChunks: [
      '严重缺陷通常指阻塞主流程、导致数据错误或影响系统稳定性的故障，应优先处理并回归验证。',
      '回归范围评估应结合代码改动模块、依赖链路和历史问题分布，避免只做点状验证。',
      '验收阶段建议建立缺陷闭环台账，记录发现时间、责任人、修复版本和复测结论。',
    ],
  },
  {
    key: 'appforge:mock-shijiazhuang-llm:requirements',
    name: '政务场景需求资料库',
    description: '汇总石家庄市大模型项目的需求背景、业务场景和建设目标，适合方案撰写。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '石家庄市大模型项目',
    projectId: 'mock-shijiazhuang-llm',
    datasetId: 'mock_requirements',
    retrievalMode: 'mock',
    mockChunks: [
      '石家庄市大模型项目重点面向政务问答、公文辅助和知识检索三类场景建设统一能力底座。',
      '项目需求强调安全可控、数据分级治理和国产化适配，要求在政务场景中可落地可审计。',
      '建设目标包括提升政务服务响应效率、降低人工检索成本，并形成可复制的行业方案模板。',
    ],
  },
  {
    key: 'appforge:mock-shijiazhuang-llm:solution',
    name: '大模型实施方案知识库',
    description: '沉淀石家庄市大模型项目的实施路径、架构设计和阶段性交付策略。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '石家庄市大模型项目',
    projectId: 'mock-shijiazhuang-llm',
    datasetId: 'mock_solution',
    retrievalMode: 'mock',
    mockChunks: [
      '实施方案建议分为需求梳理、知识治理、模型接入、场景试点和运营评估五个阶段推进。',
      '总体架构一般包括模型服务层、知识检索层、应用编排层和安全运营层，保证业务可扩展。',
      '阶段性交付应明确样板场景、验收指标和培训计划，确保项目从 PoC 平滑过渡到正式运营。',
    ],
  },
  {
    key: 'appforge:mock-shijiazhuang-llm:delivery-acceptance',
    name: '交付与验收文档库',
    description: '包含石家庄市大模型项目的交付清单、培训材料和验收文档模板。',
    source: 'appforge',
    sourceLabel: '应用开发平台',
    projectName: '石家庄市大模型项目',
    projectId: 'mock-shijiazhuang-llm',
    datasetId: 'mock_delivery_acceptance',
    retrievalMode: 'mock',
    mockChunks: [
      '交付清单通常包括部署说明、账号权限表、场景配置表、运维手册和培训材料等内容。',
      '验收文档需同步记录功能验收、性能测试、安全检查和用户培训结果，形成完整闭环。',
      '针对政务项目，建议额外补充数据权限说明、审计策略和应急预案等保障性材料。',
    ],
  },
];

const knowledgeBaseMap = new Map(
  knowledgeBaseRegistry.map((knowledgeBase) => [knowledgeBase.key, knowledgeBase])
);

function getKnowledgeBasesByKeys(keys: string[]): KnowledgeBaseDefinition[] {
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

const DEFAULT_APPFORGE_TIMEOUT_MS = 12000;

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

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === 'AbortError'
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
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
    requestTimeoutMs: parsePositiveInt(
      process.env.APPFORGE_REQUEST_TIMEOUT_MS,
      DEFAULT_APPFORGE_TIMEOUT_MS
    ),
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

function tokenizeQuery(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[\s,，。！？；：、/|()-]+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
    )
  );
}

async function requestMockKnowledgeBaseChunks(
  knowledgeBase: KnowledgeBaseDefinition,
  query: string,
  topK: number
): Promise<RetrievedKnowledgeBaseChunks> {
  const candidates = (knowledgeBase.mockChunks || []).map((chunk, index) => ({
    chunk,
    index,
    score: tokenizeQuery(query).reduce((total, keyword) => {
      return total + (chunk.toLowerCase().includes(keyword) ? 1 : 0);
    }, 0),
  }));

  const rankedChunks = [...candidates].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.index - right.index;
  });

  const selectedChunks = (rankedChunks.some((item) => item.score > 0)
    ? rankedChunks.filter((item) => item.score > 0)
    : rankedChunks
  )
    .slice(0, topK)
    .map((item) => cleanChunkContent(item.chunk))
    .filter(Boolean);

  return {
    knowledgeBase,
    chunks: selectedChunks,
    topK,
  };
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

  let response: Response;
  try {
    response = await fetchWithTimeout(
      runtimeConfig.appforgeDatasetApiUrl,
      {
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
      },
      runtimeConfig.requestTimeoutMs
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        `${knowledgeBase.name} 检索超时（>${runtimeConfig.requestTimeoutMs}ms）`
      );
    }
    throw error instanceof Error
      ? error
      : new Error(`${knowledgeBase.name} 检索调用失败`);
  }

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

async function requestKnowledgeBaseChunks(
  knowledgeBase: KnowledgeBaseDefinition,
  query: string,
  topK: number
): Promise<RetrievedKnowledgeBaseChunks> {
  if (knowledgeBase.retrievalMode === 'mock') {
    return requestMockKnowledgeBaseChunks(knowledgeBase, query, topK);
  }

  return requestAppforgeKnowledgeBaseChunks(knowledgeBase, query, topK);
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
      requestKnowledgeBaseChunks(
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
    const result: KnowledgeBaseContextResult = {
      mountedKnowledgeBases: mountedKnowledgeBaseRefs,
      contextText: '',
    };

    if (runtimeConfig.debug) {
      result.debug = buildDebugSummary(
        query,
        settledResults,
        mountedKnowledgeBases,
        topKDistribution,
        '',
        effectiveTotalTopK
      );
      logKnowledgeBaseDebug(result.debug);
    }

    return result;
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
