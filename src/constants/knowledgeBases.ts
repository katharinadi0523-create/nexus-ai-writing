export type KnowledgeBaseSource = 'appforge';
export type KnowledgeBaseRetrievalMode = 'live' | 'mock';

export interface KnowledgeBaseDefinition {
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
    itemCount: 28,
    createdAt: '2026-02-18',
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
    itemCount: 35,
    createdAt: '2026-02-24',
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
    itemCount: 22,
    createdAt: '2026-03-02',
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
    itemCount: 31,
    createdAt: '2026-01-28',
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
    itemCount: 44,
    createdAt: '2026-02-06',
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
    itemCount: 26,
    createdAt: '2026-02-11',
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
    itemCount: 19,
    createdAt: '2026-02-20',
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
    itemCount: 24,
    createdAt: '2026-02-26',
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
    itemCount: 17,
    createdAt: '2026-03-05',
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
  defaultProjectName: string;
  projects: Array<{
    projectName: string;
    items: KnowledgeBaseDefinition[];
  }>;
  items: KnowledgeBaseDefinition[];
}> {
  const groups = new Map<string, KnowledgeBaseDefinition[]>();

  knowledgeBaseRegistry.forEach((knowledgeBase) => {
    const current = groups.get(knowledgeBase.sourceLabel) || [];
    current.push(knowledgeBase);
    groups.set(knowledgeBase.sourceLabel, current);
  });

  return Array.from(groups.entries()).map(([sourceLabel, items]) => {
    const projectGroups = new Map<string, KnowledgeBaseDefinition[]>();

    items.forEach((knowledgeBase) => {
      const current = projectGroups.get(knowledgeBase.projectName) || [];
      current.push(knowledgeBase);
      projectGroups.set(knowledgeBase.projectName, current);
    });

    const projects = Array.from(projectGroups.entries()).map(([projectName, projectItems]) => ({
      projectName,
      items: projectItems,
    }));

    return {
      sourceLabel,
      defaultProjectName: projects[0]?.projectName || '',
      projects,
      items,
    };
  });
}
