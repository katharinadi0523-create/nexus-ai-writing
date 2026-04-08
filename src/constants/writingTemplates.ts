export type WritingTemplateSource = 'af-curated' | 'organization';
export type WritingTemplateTabId = 'af-curated' | 'organization' | 'favorite';

export interface WritingTemplate {
  id: string;
  name: string;
  description: string;
  source: WritingTemplateSource;
  categoryLabel?: string;
  accentLabel?: string;
}

export interface WritingTemplateGroup {
  id: string;
  label: string;
  description: string;
  source: WritingTemplateSource;
  templates: WritingTemplate[];
}

export const afCuratedTemplateGroups: WritingTemplateGroup[] = [
  {
    id: 'af-official-documents',
    label: '公文模板',
    description: '聚合 AF 平台常见政企公文格式，适合直接套用标准文种结构与口径。',
    source: 'af-curated',
    templates: [
      {
        id: 'af-notice',
        name: '通知',
        description: '适合发布安排、执行要求、时间节点与配套动作，强调对象、事项、执行时限。',
        source: 'af-curated',
        categoryLabel: '公文模板',
        accentLabel: '常用',
      },
      {
        id: 'af-announcement',
        name: '通告',
        description: '适合公开说明事项、范围与约束条件，突出发布主体、适用范围与执行依据。',
        source: 'af-curated',
        categoryLabel: '公文模板',
        accentLabel: '公开发布',
      },
      {
        id: 'af-letter',
        name: '函',
        description: '适合平级往来、商洽事项与征询回复，强调行文礼貌、事项清晰与附件说明。',
        source: 'af-curated',
        categoryLabel: '公文模板',
        accentLabel: '往来沟通',
      },
      {
        id: 'af-opinion',
        name: '意见',
        description: '适合提出原则性要求与推进建议，结构清晰，便于按条分项展开。',
        source: 'af-curated',
        categoryLabel: '公文模板',
        accentLabel: '规范建议',
      },
      {
        id: 'af-report',
        name: '请示报告',
        description: '适合逐层上报背景、事项、理由与请示建议，突出前因后果与决策请求。',
        source: 'af-curated',
        categoryLabel: '公文模板',
        accentLabel: '汇报请示',
      },
      {
        id: 'af-minute',
        name: '会议纪要',
        description: '适合沉淀会议信息、结论、责任人与后续动作，强调纪要化与责任闭环。',
        source: 'af-curated',
        categoryLabel: '公文模板',
        accentLabel: '会后沉淀',
      },
    ],
  },
];

export const organizationTemplates: WritingTemplate[] = [
  {
    id: 'org-weekly-brief',
    name: '项目周报简版',
    description: '适合项目负责人快速同步进展、风险、待协调事项，强调一页式摘要和状态变化。',
    source: 'organization',
    categoryLabel: '组织模板',
    accentLabel: '项目管理',
  },
  {
    id: 'org-product-quarterly-report',
    name: '产品组季度工作汇报',
    description: '聚焦季度目标达成、关键项目推进、数据结果、问题复盘与下季度策略安排。',
    source: 'organization',
    categoryLabel: '组织模板',
    accentLabel: '产品经营',
  },
  {
    id: 'org-customer-visit',
    name: '客户拜访纪要',
    description: '适合记录客户诉求、现场反馈、问题优先级与后续跟进计划，方便销售与产品协同。',
    source: 'organization',
    categoryLabel: '组织模板',
    accentLabel: '客户管理',
  },
  {
    id: 'org-review-summary',
    name: '需求评审结论单',
    description: '用于沉淀评审背景、关键结论、排期建议、责任分工与阻塞问题。',
    source: 'organization',
    categoryLabel: '组织模板',
    accentLabel: '研发协同',
  },
  {
    id: 'org-operations-retro',
    name: '运营复盘模板',
    description: '适合对活动、投放、内容专题做复盘，强调数据拆解、经验总结与动作回收。',
    source: 'organization',
    categoryLabel: '组织模板',
    accentLabel: '业务复盘',
  },
];

export const allWritingTemplates: WritingTemplate[] = [
  ...afCuratedTemplateGroups.flatMap((group) => group.templates),
  ...organizationTemplates,
];

export function getWritingTemplateById(templateId?: string | null) {
  if (!templateId) {
    return null;
  }

  return allWritingTemplates.find((template) => template.id === templateId) || null;
}

