/**
 * 不可动摇的资产库
 * 所有 UI 组件必须根据 activeScenarioId 从此文件中取值
 */

export type ScenarioId = string;

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  memoryConfigs: { key: string; label: string; placeholder?: string; defaultValue?: string }[];
  paramConfigs: {
    key: string;
    label: string;
    type: string;
    options?: string[];
    defaultValue?: string;
    required?: boolean;
  }[];
}

export interface AgentRuntimeConfig {
  source: 'appforge';
  appId?: string;
  agentType?: 'workflow';
}

export type AgentCategory = 'GENERAL' | 'PLANNING' | 'WORKFLOW';

export interface ScenarioData {
  id: ScenarioId;
  name: string;
  category: AgentCategory;
  isFavorite?: boolean;
  suggestedQuestion?: string;
  // 通用模式数据
  generalData: {
    outline: string;
    fullText: string;
  };
  // @智能体模式数据
  agentConfig: AgentConfig;
  agentRuntime?: AgentRuntimeConfig;
}

/**
 * 已接入真实接口的智能体配置
 */
export const mockDataStore: Record<ScenarioId, ScenarioData> = {
  'report-compile': {
    id: 'report-compile',
    name: '报告整编',
    category: 'WORKFLOW',
    isFavorite: true,
    suggestedQuestion: '空军协同作战',
    generalData: {
      outline: '',
      fullText: '',
    },
    agentConfig: {
      id: 'agent-report-compile',
      name: '报告整编智能体',
      description: '对接真实报告整编工作流，自动完成资料梳理、章节组织与全文整编。',
      memoryConfigs: [],
      paramConfigs: [],
    },
    agentRuntime: {
      source: 'appforge',
      appId: 'app-6p23bh2c',
      agentType: 'workflow',
    },
  },
  'oil-gas': {
    id: 'oil-gas',
    name: '10月油气价格分析',
    category: 'WORKFLOW',
    isFavorite: true,
    suggestedQuestion: '10月油气价格分析',
    generalData: {
      outline: '',
      fullText: '',
    },
    agentConfig: {
      id: 'agent-oil',
      name: '油气价格分析工作流',
      description: '对接真实油气价格分析工作流，结合特别关注点生成结构化分析全文。',
      memoryConfigs: [],
      paramConfigs: [
        {
          key: 'special_anal_points',
          label: '特别关注点',
          type: 'text',
          defaultValue: '供需分析',
          required: false,
        },
      ],
    },
    agentRuntime: {
      source: 'appforge',
      appId: 'app-c8kfj18j',
      agentType: 'workflow',
    },
  }
};

/**
 * 状态管理逻辑（保持不变）
 */
export let activeScenarioId: ScenarioId = 'oil-gas'; // 默认设为油气分析

export function setActiveScenarioId(id: ScenarioId): void {
  activeScenarioId = id;
}

export function getActiveScenarioData(): ScenarioData | null {
  return mockDataStore[activeScenarioId] || null;
}

/**
 * 知识库数据结构
 */
export interface KnowledgeBase {
  id: string;
  name: string;
  itemCount: number;
  size: string;
  description: string;
  createdAt: string;
}

export interface KnowledgeBaseData {
  appDevelopment: KnowledgeBase[];
  dataGovernance: KnowledgeBase[];
}

/**
 * 知识库 Mock 数据
 */
export const knowledgeBaseData: KnowledgeBaseData = {
  appDevelopment: [
    {
      id: 'kb-eng-1',
      name: '工程文件管理知识库',
      itemCount: 25,
      size: '92.3 KB',
      description: '包含各类工程文件模板、规范文档、技术标准等，涵盖建筑、电力、化工等多个行业的工程文件管理知识。',
      createdAt: '2025-04-10 10:06:45',
    },
    {
      id: 'kb-eng-2',
      name: '工程项目可行性研究报告库',
      itemCount: 18,
      size: '156.8 KB',
      description: '汇集了多个行业的可行性研究报告案例，包括项目背景分析、市场调研、技术方案、投资估算等完整内容。',
      createdAt: '2025-04-09 14:23:12',
    },
    {
      id: 'kb-ai-1',
      name: 'AI技术文档知识库',
      itemCount: 32,
      size: '245.6 KB',
      description: '涵盖大模型技术、AI应用开发、机器学习算法等前沿AI技术文档和最佳实践案例。',
      createdAt: '2025-04-08 09:15:30',
    },
    {
      id: 'kb-work-1',
      name: '工作汇报模板知识库',
      itemCount: 15,
      size: '78.5 KB',
      description: '包含年度总结、季度汇报、项目总结等多种工作汇报模板和优秀案例，适用于不同岗位和场景。',
      createdAt: '2025-04-07 16:45:22',
    },
    {
      id: 'kb-oil-1',
      name: '油气价格分析数据知识库',
      itemCount: 28,
      size: '189.2 KB',
      description: '全球油气市场价格数据、分析报告、趋势预测等专业内容，支持深度能源市场分析。',
      createdAt: '2025-04-06 11:30:15',
    },
  ],
  dataGovernance: [
    {
      id: 'kb-dg-eng-1',
      name: '工程数据治理规范库',
      itemCount: 22,
      size: '134.7 KB',
      description: '工程行业数据治理标准、数据质量规范、数据安全管理制度等，适用于大型工程项目数据管理。',
      createdAt: '2025-04-10 08:20:33',
    },
    {
      id: 'kb-dg-research-1',
      name: '可研报告数据标准库',
      itemCount: 19,
      size: '167.4 KB',
      description: '可行性研究报告的数据采集标准、分析方法、数据验证流程等，确保报告数据的准确性和可靠性。',
      createdAt: '2025-04-09 13:12:45',
    },
    {
      id: 'kb-dg-ai-1',
      name: 'AI模型训练数据集',
      itemCount: 45,
      size: '312.8 KB',
      description: '多模态AI模型训练所需的结构化数据集，包括文本、图像、表格等多种数据格式的治理规范。',
      createdAt: '2025-04-08 10:55:20',
    },
    {
      id: 'kb-dg-work-1',
      name: '工作数据统计分析库',
      itemCount: 16,
      size: '98.3 KB',
      description: '工作汇报相关的数据统计标准、KPI指标体系、数据分析方法等，支持科学的工作总结。',
      createdAt: '2025-04-07 15:18:56',
    },
    {
      id: 'kb-dg-oil-1',
      name: '能源市场数据治理库',
      itemCount: 31,
      size: '201.5 KB',
      description: '油气价格分析所需的数据治理规范、数据质量保证、多源数据融合标准等专业内容。',
      createdAt: '2025-04-06 09:42:11',
    },
  ],
};
