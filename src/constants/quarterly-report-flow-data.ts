import type { QuarterlyReportDemoState, QuarterlyReportSelectedAnswers } from '../types/quarterlyReportDemo';
import type { LocalWorkspaceFileSummary, LocalWorkspaceSelection } from '../types/localWorkspace';
import type { KnowledgeBaseDefinition } from './knowledgeBases';

export const QUARTERLY_REPORT_TEMPLATE_ID = 'org-product-quarterly-report';
export const QUARTERLY_REPORT_DEMO_PROMPT = '写一份符合公司规范的产品组季度工作汇报';
export const QUARTERLY_REPORT_DEMO_DOCUMENT_ID = 'demo-quarterly-report';
export const QUARTERLY_REPORT_DEMO_TITLE = '产品组 2026 年 Q1 季度工作汇报';
export const QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE = '2025年签约与汇款情况分析报告-最终版';
export const QUARTERLY_REPORT_FINAL_DOCX_PUBLIC_PATH =
  '/mock-documents/2025年签约与汇款情况分析报告-最终版.docx';
export const QUARTERLY_REPORT_FINAL_DOCX_PREVIEW_IMAGE_PATH =
  '/mock-previews/2025年签约与汇款情况分析报告-最终版.docx.png';

export const quarterlyReportTemplateCard = {
  name: '产品组季度工作汇报',
  scenario: '季度总结 / 管理汇报',
  output: '正式文稿',
  capabilities: ['经营数据引用', '知识依据引用', '模板富文本成稿'],
};

export const quarterlyReportAnalysisCards = [
  {
    title: '签约情况',
    value: 'Q1 累计签约额 ¥12,860,000，较上季度增长 18.4%',
  },
  {
    title: '回款情况',
    value: 'Q1 累计回款额 ¥9,430,000，回款率 73.3%',
  },
  {
    title: '项目推进情况',
    value: '在管重点项目 8 个，其中正常推进 6 个、风险项目 2 个',
  },
  {
    title: '资源投入情况',
    value: '本季度研发投入 1,420 人日，交付支持 380 人日',
  },
  {
    title: '阶段性亮点',
    value: '新增标杆项目 2 个，完成重点版本发布 3 次',
  },
];

export const quarterlyReportKnowledgeHits = [
  {
    title: '《季度工作汇报撰写规范》',
    usage: '约束文稿结构与章节顺序',
  },
  {
    title: '《管理层汇报表述口径要求》',
    usage: '统一正式表述，避免口语化和失真表达',
  },
  {
    title: '《产品组经营分析汇报示例》',
    usage: '提供经营分析章节的组织方式参考',
  },
  {
    title: '《问题与风险章节编写要求》',
    usage: '规范风险表述方式，避免绝对化和不审慎措辞',
  },
];

export const quarterlyReportRichTextExecutionSteps = [
  '已加载模板：产品组季度工作汇报',
  '已写入经营分析结果：产品经营分析数据洞察工作流',
  '已应用知识依据：产品经营汇报规范与案例知识库',
  '正在生成富文本结构化初稿：',
];

export const quarterlyReportRichTextOutputs = [
  '标题',
  '正文层级',
  '重点段落',
  '图表占位',
  '规范版式',
];

export const quarterlyReportResultTags = [
  '已应用模板',
  '已纳入经营数据',
  '已引用知识依据',
  '已融合本地文件',
  '已按富文本格式生成',
];

type QuarterlyReportKnowledgeCategory = 'structure' | 'analysis' | 'metrics' | 'risk';

interface QuarterlyReportKnowledgeSource {
  name: string;
  usage: string;
  evidence: string;
  category: QuarterlyReportKnowledgeCategory;
}

export interface QuarterlyReportKnowledgeHitItem {
  title: string;
  usage: string;
}

export interface QuarterlyReportKnowledgeRetrieveRound {
  title: string;
  objective: string;
  queryInput: {
    intent: string;
    knowledgeBases: string[];
    rewrittenQueries: string[];
  };
  output: {
    hitCount: number;
    topHits: Array<{
      knowledgeBase: string;
      usage: string;
      evidence: string;
    }>;
  };
}

export interface QuarterlyReportLocalRetrieveRound {
  title: string;
  objective: string;
  queryInput: {
    workspaceFolder: string;
    fileScope: string[];
    rewrittenQueries: string[];
  };
  output: {
    hitCount: number;
    topHits: Array<{
      file: string;
      reason: string;
      excerpt: string;
    }>;
  };
}

export interface QuarterlyReportFusionSummary {
  summary: string;
  sources: string[];
  actions: string[];
  outputs: string[];
}

const defaultQuarterlyReportKnowledgeSources: QuarterlyReportKnowledgeSource[] = [
  {
    name: '25年产品季报',
    usage: '提供季度汇报结构、章节顺序与管理层摘要写法参考',
    evidence:
      '产品季报通常需要同时呈现目标达成、核心指标变化、重点动作复盘与下阶段策略，避免只罗列数据不解释原因。',
    category: 'structure',
  },
  {
    name: '26年产品月报',
    usage: '补充 2026 年经营表述口径，以及月度成果向季度材料汇总的表达方式',
    evidence:
      '产品月报建议固定呈现收入、活跃、转化、交付进度和风险事项五类内容，保证月度对比的一致性。',
    category: 'structure',
  },
  {
    name: '常见经营分析案例',
    usage: '支撑经营分析章节的拆解逻辑、数据结论组织与阶段性亮点归因',
    evidence:
      '经营分析案例通常需要把现象、原因、影响和建议动作串成闭环，避免只停留在指标涨跌描述。',
    category: 'analysis',
  },
  {
    name: '经营问题经典case',
    usage: '支撑问题与风险章节的风险归因、审慎表述与改进动作写法',
    evidence:
      '经典经营问题复盘应先判断是结构性问题还是阶段性波动，再决定是做专项治理还是持续观察。',
    category: 'risk',
  },
  {
    name: '产品经营数据汇报数据口径',
    usage: '统一签约额、回款额、回款率和资源投入等核心指标的统计口径',
    evidence:
      '经营汇报中的收入指标需明确是否含税、是否按签约口径还是确认口径统计，避免跨报告直接比较。',
    category: 'metrics',
  },
];

const defaultQuarterlyReportLocalWorkspace: LocalWorkspaceSelection = {
  folderName: '2026Q1-产品经营工作空间',
  fileCount: 5,
  selectedAt: Date.now(),
  files: [
    {
      name: 'Q1经营周报汇总.md',
      relativePath: '2026Q1-产品经营工作空间/周报/Q1经营周报汇总.md',
      extension: 'md',
      size: 18240,
      contentPreview:
        'Q1 累计签约额 1286 万元，累计回款额 943 万元。重点项目整体推进平稳，3 月完成重点版本发布，客户侧需求收敛问题仍需持续跟踪。',
    },
    {
      name: '重点项目推进台账.xlsx',
      relativePath: '2026Q1-产品经营工作空间/项目/重点项目推进台账.xlsx',
      extension: 'xlsx',
      size: 245760,
      contentPreview:
        '记录 8 个重点项目推进状态，其中 6 个正常推进、2 个处于风险观察状态，涉及客户协同、需求变更和资源排期等信息。',
    },
    {
      name: '版本发布记录-2026Q1.docx',
      relativePath: '2026Q1-产品经营工作空间/版本/版本发布记录-2026Q1.docx',
      extension: 'docx',
      size: 98304,
      contentPreview:
        '季度内完成 3 次重点版本发布，覆盖客户管理、经营看板和项目协同能力升级，形成 2 个标杆案例支撑材料。',
    },
    {
      name: '需求变更风险复盘.md',
      relativePath: '2026Q1-产品经营工作空间/复盘/需求变更风险复盘.md',
      extension: 'md',
      size: 10420,
      contentPreview:
        '部分重点项目在客户侧需求收敛和跨团队协同上仍存在不确定性，建议通过版本边界确认、周级风险跟踪和专项支持机制控制影响范围。',
    },
    {
      name: '研发投入与交付支持.csv',
      relativePath: '2026Q1-产品经营工作空间/资源/研发投入与交付支持.csv',
      extension: 'csv',
      size: 5610,
      contentPreview:
        'Q1 研发投入 1420 人日，交付支持 380 人日，资源主要用于重点版本建设和标杆项目交付。',
    },
  ],
};

function deriveQuarterlyReportKnowledgeSource(
  knowledgeBase: KnowledgeBaseDefinition
): QuarterlyReportKnowledgeSource {
  const name = knowledgeBase.name;
  const evidence = knowledgeBase.mockChunks?.[0] || knowledgeBase.description;

  if (name.includes('季报')) {
    return {
      name,
      evidence,
      usage: '提供季度汇报结构、章节顺序与管理层摘要写法参考',
      category: 'structure',
    };
  }

  if (name.includes('月报')) {
    return {
      name,
      evidence,
      usage: '补充 2026 年经营表述口径，以及月度成果向季度材料汇总的表达方式',
      category: 'structure',
    };
  }

  if (name.includes('经营分析')) {
    return {
      name,
      evidence,
      usage: '支撑经营分析章节的拆解逻辑、数据结论组织与阶段性亮点归因',
      category: 'analysis',
    };
  }

  if (name.includes('口径')) {
    return {
      name,
      evidence,
      usage: '统一签约额、回款额、回款率和资源投入等核心指标的统计口径',
      category: 'metrics',
    };
  }

  if (name.includes('问题') || name.includes('case')) {
    return {
      name,
      evidence,
      usage: '支撑问题与风险章节的风险归因、审慎表述与改进动作写法',
      category: 'risk',
    };
  }

  return {
    name,
    evidence,
    usage: '补充正式汇报生成所需的结构与表述依据',
    category: 'structure',
  };
}

function getQuarterlyReportKnowledgeSources(
  knowledgeBases: KnowledgeBaseDefinition[]
): QuarterlyReportKnowledgeSource[] {
  const uniqueSources = knowledgeBases.reduce<QuarterlyReportKnowledgeSource[]>((result, knowledgeBase) => {
    if (result.some((item) => item.name === knowledgeBase.name)) {
      return result;
    }

    result.push(deriveQuarterlyReportKnowledgeSource(knowledgeBase));
    return result;
  }, []);

  return uniqueSources.length > 0 ? uniqueSources : defaultQuarterlyReportKnowledgeSources;
}

function pickKnowledgeSources(
  sources: QuarterlyReportKnowledgeSource[],
  preferredCategories: QuarterlyReportKnowledgeCategory[],
  maxCount: number
) {
  const matched = sources.filter((source) => preferredCategories.includes(source.category));
  const fallback = sources.filter((source) => !matched.includes(source));
  return [...matched, ...fallback].slice(0, maxCount);
}

function getEffectiveLocalWorkspaceSelection(
  localWorkspace?: LocalWorkspaceSelection | null
) {
  if (localWorkspace && localWorkspace.files.length > 0) {
    return localWorkspace;
  }

  return defaultQuarterlyReportLocalWorkspace;
}

function formatLocalWorkspaceReference(localWorkspace?: LocalWorkspaceSelection | null) {
  const workspace = getEffectiveLocalWorkspaceSelection(localWorkspace);
  return `工作空间「${workspace.folderName}」`;
}

function getLocalWorkspaceFilesForRetrieval(
  localWorkspace?: LocalWorkspaceSelection | null,
  maxCount = 4
) {
  const workspace = getEffectiveLocalWorkspaceSelection(localWorkspace);
  const keywordList = ['季度', '经营', '项目', '版本', '风险', '签约', '回款', '复盘', '推进'];

  return [...workspace.files]
    .sort((left, right) => {
      const score = (file: LocalWorkspaceFileSummary) => {
        const haystack = `${file.relativePath} ${file.contentPreview || ''}`.toLowerCase();
        return keywordList.reduce(
          (total, keyword) => total + (haystack.includes(keyword) ? 1 : 0),
          0
        );
      };

      return score(right) - score(left);
    })
    .slice(0, maxCount);
}

function buildLocalWorkspaceFileReason(file: LocalWorkspaceFileSummary) {
  const haystack = `${file.relativePath} ${file.contentPreview || ''}`;

  if (haystack.includes('版本')) {
    return '包含版本发布、阶段性成果和标杆案例相关信息';
  }

  if (haystack.includes('项目')) {
    return '包含重点项目推进状态和风险观察信息';
  }

  if (haystack.includes('风险') || haystack.includes('复盘')) {
    return '包含问题归因、风险判断与后续动作建议';
  }

  if (haystack.includes('签约') || haystack.includes('回款') || haystack.includes('经营')) {
    return '包含经营指标、过程结论或数据跟踪信息';
  }

  return '作为本地工作材料被纳入综合检索范围';
}

function buildLocalWorkspaceFileExcerpt(file: LocalWorkspaceFileSummary) {
  if (file.contentPreview) {
    return file.contentPreview;
  }

  if (file.extension === 'docx') {
    return 'Word 文档已纳入本地检索索引，可用于提取阶段成果、正式表述和附件事实。';
  }

  if (file.extension === 'xlsx' || file.extension === 'csv') {
    return '表格文件已纳入本地检索索引，可用于提取项目状态、经营数据与资源投入信息。';
  }

  return '本地文件已纳入检索索引，可用于补充季度汇报生成所需事实。';
}

function formatKnowledgeBaseReference(knowledgeBases: KnowledgeBaseDefinition[]) {
  const names = getQuarterlyReportKnowledgeSources(knowledgeBases).map((item) => item.name);

  if (names.length === 0) {
    return '已挂载知识库';
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]}、${names[1]}`;
  }

  return `${names[0]}、${names[1]}等 ${names.length} 个知识库`;
}

export function buildQuarterlyReportKnowledgeHits(
  knowledgeBases: KnowledgeBaseDefinition[]
): QuarterlyReportKnowledgeHitItem[] {
  return getQuarterlyReportKnowledgeSources(knowledgeBases).map((source) => ({
    title: source.name,
    usage: source.usage,
  }));
}

export function buildQuarterlyReportKnowledgeRetrieveRounds(
  knowledgeBases: KnowledgeBaseDefinition[]
): QuarterlyReportKnowledgeRetrieveRound[] {
  const knowledgeSources = getQuarterlyReportKnowledgeSources(knowledgeBases);
  const structureSources = pickKnowledgeSources(knowledgeSources, ['structure'], 2);
  const analysisSources = pickKnowledgeSources(knowledgeSources, ['analysis', 'metrics'], 2);
  const riskSources = pickKnowledgeSources(knowledgeSources, ['risk', 'metrics'], 2);

  return [
    {
      title: '结构与章节规划检索',
      objective: '锁定季度正式汇报的章节顺序、摘要语气与管理层阅读节奏。',
      queryInput: {
        intent: '建立季度工作汇报的正式结构与章节骨架',
        knowledgeBases: structureSources.map((item) => item.name),
        rewrittenQueries: [
          '季度工作汇报 标准结构 管理层阅读顺序',
          '产品组季度汇报 摘要 亮点 风险 下季度安排',
          '2026 产品经营月报 向季度正式汇报的章节复用方式',
        ],
      },
      output: {
        hitCount: structureSources.length,
        topHits: structureSources.map((item) => ({
          knowledgeBase: item.name,
          usage: item.usage,
          evidence: item.evidence,
        })),
      },
    },
    {
      title: '经营分析与口径补齐',
      objective: '补齐经营分析章节的数据拆解方式、结论写法与指标统计口径。',
      queryInput: {
        intent: '为经营分析章节准备指标拆解逻辑与数据口径约束',
        knowledgeBases: analysisSources.map((item) => item.name),
        rewrittenQueries: [
          '签约 回款 项目推进 资源投入 阶段亮点 分析写法',
          '经营分析章节 现象 原因 影响 建议 闭环表达',
          '签约额 回款率 研发投入 交付支持 指标统计口径',
        ],
      },
      output: {
        hitCount: analysisSources.length,
        topHits: analysisSources.map((item) => ({
          knowledgeBase: item.name,
          usage: item.usage,
          evidence: item.evidence,
        })),
      },
    },
    {
      title: '风险表达与案例校验',
      objective: '补齐问题与风险章节的归因框架、审慎表述与行动建议写法。',
      queryInput: {
        intent: '约束问题与风险章节的表达方式，避免口语化和绝对化表述',
        knowledgeBases: riskSources.map((item) => item.name),
        rewrittenQueries: [
          '季度汇报 问题与风险章节 写法 审慎表述',
          '经营问题复盘 风险归因 改进动作 管理汇报',
          '经营汇报 风险章节 避免绝对化措辞 示例',
        ],
      },
      output: {
        hitCount: riskSources.length,
        topHits: riskSources.map((item) => ({
          knowledgeBase: item.name,
          usage: item.usage,
          evidence: item.evidence,
        })),
      },
    },
  ];
}

export function getQuarterlyReportKnowledgeRetrieveSubtitle(
  knowledgeBases: KnowledgeBaseDefinition[]
) {
  const knowledgeReference = formatKnowledgeBaseReference(knowledgeBases);
  return `正在深度检索 ${knowledgeReference}，补齐结构规划、指标口径与案例依据。`;
}

export function buildQuarterlyReportLocalRetrieveRounds(
  localWorkspace?: LocalWorkspaceSelection | null
) {
  const workspace = getEffectiveLocalWorkspaceSelection(localWorkspace);
  const candidateFiles = getLocalWorkspaceFilesForRetrieval(localWorkspace, 4);
  const indexFiles = candidateFiles.slice(0, 4);
  const focusFiles = candidateFiles.slice(0, 3);
  const evidenceFiles = candidateFiles.slice(0, 3);

  return [
    {
      title: '扫描工作空间索引',
      objective: '识别本地工作空间内与季度汇报相关的文档范围和材料类型。',
      queryInput: {
        workspaceFolder: workspace.folderName,
        fileScope: indexFiles.map((item) => item.relativePath),
        rewrittenQueries: [
          '季度工作汇报 经营数据 项目推进 版本发布',
          '本地工作空间 产品经营 Q1 汇报支撑材料',
        ],
      },
      output: {
        hitCount: indexFiles.length,
        topHits: indexFiles.map((item) => ({
          file: item.relativePath,
          reason: buildLocalWorkspaceFileReason(item),
          excerpt: buildLocalWorkspaceFileExcerpt(item),
        })),
      },
    },
    {
      title: '定位高相关业务文档',
      objective: '围绕经营数据、重点项目和版本发布定位高相关本地文件。',
      queryInput: {
        workspaceFolder: workspace.folderName,
        fileScope: focusFiles.map((item) => item.relativePath),
        rewrittenQueries: [
          '签约 回款 重点项目 风险项目 本地文件',
          '版本发布 标杆项目 阶段亮点 经营汇报 证据',
          '研发投入 交付支持 资源投入 本地材料',
        ],
      },
      output: {
        hitCount: focusFiles.length,
        topHits: focusFiles.map((item) => ({
          file: item.relativePath,
          reason: buildLocalWorkspaceFileReason(item),
          excerpt: buildLocalWorkspaceFileExcerpt(item),
        })),
      },
    },
    {
      title: '抽取可写入正文的本地事实',
      objective: '抽取可直接写入“季度整体情况、经营分析、问题与风险”章节的本地事实。',
      queryInput: {
        workspaceFolder: workspace.folderName,
        fileScope: evidenceFiles.map((item) => item.relativePath),
        rewrittenQueries: [
          '提取季度整体情况摘要所需事实',
          '提取经营分析章节可引用的本地项目和版本事实',
          '提取问题与风险章节的本地复盘与行动建议',
        ],
      },
      output: {
        hitCount: evidenceFiles.length,
        topHits: evidenceFiles.map((item) => ({
          file: item.relativePath,
          reason: buildLocalWorkspaceFileReason(item),
          excerpt: buildLocalWorkspaceFileExcerpt(item),
        })),
      },
    },
  ] satisfies QuarterlyReportLocalRetrieveRound[];
}

export function getQuarterlyReportLocalRetrieveSubtitle(
  localWorkspace?: LocalWorkspaceSelection | null
) {
  return `正在检索 ${formatLocalWorkspaceReference(localWorkspace)}，提取项目推进、版本发布、风险复盘和经营跟踪材料。`;
}

export function buildQuarterlyReportFusionSummary(
  knowledgeBases: KnowledgeBaseDefinition[],
  localWorkspace?: LocalWorkspaceSelection | null
): QuarterlyReportFusionSummary {
  return {
    summary: '正在融合经营分析结果、知识依据和本地工作空间材料，形成可直接进入模板的结构化结论。',
    sources: [
      '经营分析结果：签约情况、回款情况、项目推进情况、资源投入情况',
      `知识依据：${formatKnowledgeBaseReference(knowledgeBases)}`,
      `本地材料：${formatLocalWorkspaceReference(localWorkspace)}`,
    ],
    actions: [
      '对齐季度汇报模板章节顺序和正式表述口径',
      '交叉校验经营指标、本地项目事实和版本发布信息',
      '整合问题与风险归因，补齐下季度工作安排建议',
    ],
    outputs: [
      '已形成管理层摘要候选内容',
      '已形成经营分析章节的事实链与表述方向',
      '已形成问题与风险、下季度安排的候选段落',
    ],
  };
}

export function getQuarterlyReportRichTextExecutionStepsForContext(
  knowledgeBases: KnowledgeBaseDefinition[],
  localWorkspace?: LocalWorkspaceSelection | null
) {
  return [
    '已加载模板：产品组季度工作汇报',
    '已写入经营分析结果：产品经营分析数据洞察工作流',
    `已应用知识依据：${formatKnowledgeBaseReference(knowledgeBases)}`,
    `已融合本地材料：${formatLocalWorkspaceReference(localWorkspace)}`,
    '已完成多源融合分析：经营分析 + 知识库 + 本地工作空间',
    '正在生成富文本结构化初稿：',
  ];
}

export function createDefaultQuarterlyReportDemoState(): QuarterlyReportDemoState {
  return {
    currentStep: 1,
    autoPlay: true,
    selectedAnswers: {
      reportingPeriod: null,
      includeMetrics: null,
    },
  };
}

function normalizePrompt(prompt: string) {
  return prompt
    .toLowerCase()
    .replace(/[，。、《》：“”‘’；：！？、,.!?;:()[\]【】]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function shouldUseQuarterlyReportDemo(
  prompt: string,
  selectedTemplateId?: string | null
) {
  const normalizedPrompt = normalizePrompt(prompt);
  if (!normalizedPrompt) {
    return false;
  }

  const normalizedDemoPrompt = normalizePrompt(QUARTERLY_REPORT_DEMO_PROMPT);
  const hasTemplateSelected = selectedTemplateId === QUARTERLY_REPORT_TEMPLATE_ID;
  const hasMetricsIntent =
    normalizedPrompt.includes('经营数据') ||
    normalizedPrompt.includes('经营分析') ||
    normalizedPrompt.includes('签约') ||
    normalizedPrompt.includes('回款');

  const hasQuarterlyReportIntent =
    normalizedPrompt.includes(normalizedDemoPrompt) ||
    normalizedPrompt.includes('产品组季度工作汇报') ||
    normalizedPrompt.includes('季度工作汇报') ||
    normalizedPrompt.includes('季度正式汇报') ||
    normalizedPrompt.includes('产品工作季报') ||
    normalizedPrompt.includes('产品季报') ||
    (normalizedPrompt.includes('季度') && normalizedPrompt.includes('汇报')) ||
    (normalizedPrompt.includes('q1') && normalizedPrompt.includes('汇报'));

  const hasStrongPromptMatch =
    normalizedPrompt.includes('产品工作季报') ||
    normalizedPrompt.includes('产品季报') ||
    (normalizedPrompt.includes('季报') && hasMetricsIntent) ||
    (normalizedPrompt.includes('季度') && normalizedPrompt.includes('汇报') && hasMetricsIntent);

  if (hasTemplateSelected) {
    return hasQuarterlyReportIntent;
  }

  return hasStrongPromptMatch;
}

export function getQuarterlyReportPeriodEcho(answer: boolean | null) {
  if (answer === false) {
    return '演示版本已固定回填汇报周期：2026 年 Q1';
  }

  return '汇报周期：2026 年 Q1';
}

export function getQuarterlyReportMetricsEcho(answer: boolean | null) {
  if (answer === false) {
    return '演示版本仍将展示经营数据支撑链路';
  }

  return '纳入经营数据：是';
}

export function getQuarterlyReportParameterSummary(answers: QuarterlyReportSelectedAnswers) {
  if (answers.reportingPeriod && answers.includeMetrics) {
    return '已确认本次写作参数：汇报周期为 2026 年 Q1，纳入经营数据分析结果。';
  }

  if (answers.reportingPeriod === false || answers.includeMetrics === false) {
    return '已确认本次写作参数。当前演示版本将继续按固定链路展示 2026 年 Q1 周期、经营分析支撑、知识库深度检索、本地检索、融合分析与模板成稿过程。';
  }

  return '已确认本次写作参数：汇报周期为 2026 年 Q1，纳入经营数据分析结果。';
}

export function buildQuarterlyReportPreviewMarkdown(
  currentStep: number,
  answers: QuarterlyReportSelectedAnswers
) {
  if (currentStep < 5) {
    return [
      '# 产品组季度工作汇报（演示预览）',
      '',
      '> 文稿预览区域（后续由设计稿替换）',
      '',
      '## 当前状态',
      `- 已锁定模板：${quarterlyReportTemplateCard.name}`,
      `- ${answers.reportingPeriod === null ? '等待确认汇报周期' : getQuarterlyReportPeriodEcho(answers.reportingPeriod)}`,
      `- ${answers.includeMetrics === null ? '等待确认是否纳入经营数据分析结果' : getQuarterlyReportMetricsEcho(answers.includeMetrics)}`,
      '- 正式文稿尚未开始排版',
    ].join('\n');
  }

  if (currentStep < 9) {
    return [
      '# 产品组季度工作汇报（生成中）',
      '',
      '> 正在组织文稿结构',
      '',
      '## 已准备内容',
      '- 模板结构已锁定',
      '- 经营分析结果正在写入“经营数据分析”章节',
      '- 企业知识依据正在约束结构规划与正式表述',
      '- 本地工作空间材料正在补充项目进展、版本发布与风险事实',
      '- 多源材料融合分析正在生成可写入模板的结构化结论',
      '',
      '## 预排版占位',
      '- 标题区',
      '- 管理汇报摘要',
      '- 经营分析章节',
      '- 问题与风险章节',
      '- 下季度工作安排',
    ].join('\n');
  }

  return [
    `# ${QUARTERLY_REPORT_FINAL_EDITOR_DOCUMENT_TITLE}`,
    '',
    '## 一、总体情况概述',
    '2025 年度，产品组围绕重点客户签约转化、回款节奏优化与项目交付协同推进经营工作。整体来看，签约规模保持增长，回款表现总体稳定，但不同季度之间仍存在阶段性波动，部分项目在签约落地与回款兑现之间存在节奏错配，需要持续加强经营过程管理。',
    '',
    '## 二、年度签约情况分析',
    '2025 年全年累计签约额保持稳步增长，其中上半年以重点客户续签和增购项目为主要来源，下半年则更多依赖新项目拓展与重点行业客户突破。从结构上看，核心项目贡献度较高，头部客户对整体签约盘子的拉动作用较为明显，说明产品能力在关键行业场景中的认可度持续提升。',
    '',
    '从季度节奏看，签约情况呈现“前稳后升”的趋势。Q1 主要完成年度经营目标拆解与重点机会跟进，Q2 起重点项目逐步进入签约窗口期，Q3 和 Q4 在版本能力释放与标杆案例带动下形成较明显增长。需要关注的是，部分签约仍集中在季度末完成，说明销售推进与方案协同效率仍有优化空间。',
    '',
    '## 三、年度回款情况分析',
    '回款整体与签约保持正相关，但回款兑现的均衡性弱于签约表现。部分项目在合同签订后回款周期偏长，导致阶段性资金回笼承压。结合项目执行情况来看，客户内部流程审批、里程碑验收周期与交付边界变更，是影响回款节奏的主要因素。',
    '',
    '从回款质量看，成熟客户和标准化交付项目的回款表现更为稳定，而涉及定制化能力、跨部门协同或多阶段验收的项目，更容易出现回款递延。后续需要进一步推动项目交付、商务结算与客户成功团队的联动，提升回款前置管理能力，降低经营波动。',
    '',
    '## 四、签约与回款匹配情况',
    '综合来看，2025 年签约增长为后续收入确认和客户拓展奠定了较好基础，但部分项目的签约金额尚未及时转化为对应回款，签约与回款之间仍存在一定的节奏差。该差异一方面来自项目实施与验收周期，另一方面也反映出部分合同条款在付款节点设计上缺乏足够约束。',
    '',
    '建议在后续经营管理中，进一步强化签约项目分层管理，对重点大单建立签约后回款跟踪台账，并结合月度经营复盘机制动态识别风险项目，确保签约成果能够更高效地转化为经营回款表现。',
    '',
    '## 五、主要问题与改进建议',
    '1. 部分项目签约集中在季度末，前期机会推进不均衡，建议加强商机分层运营与关键节点前置管理。',
    '2. 回款节奏受交付和验收影响较大，建议在项目启动阶段同步明确验收标准与付款条件。',
    '3. 经营分析口径在不同汇报材料之间存在轻微差异，建议统一年度签约额、回款额与回款率的统计口径，提升管理视角下的数据一致性。',
    '',
    '## 六、结论',
    '总体而言，2025 年产品组签约与回款表现处于稳中向好的区间，重点客户拓展与标杆项目沉淀已开始形成正向带动效应。下一阶段应继续围绕高质量签约、可兑现回款和项目闭环交付三个维度提升经营韧性，为后续季度经营汇报与资源决策提供更加稳定、可复用的依据。',
  ].join('\n');
}
