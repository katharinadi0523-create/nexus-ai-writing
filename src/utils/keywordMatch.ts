/**
 * 根据用户输入的关键词匹配已接入的真实智能体场景
 */

import { ScenarioId } from '../constants/mockData';

/** 关键词组与场景的映射配置 */
const KEYWORD_SCENARIO_MAP: Array<{
  keywords: string[];
  scenarioId: ScenarioId;
}> = [
  {
    keywords: ['十月', '石油', '价格分析', '油气', '价格'],
    scenarioId: 'oil-gas',
  },
  {
    keywords: ['空军', '协同作战', '报告整编', '整编'],
    scenarioId: 'report-compile',
  },
];

/**
 * 根据用户输入匹配对应的场景
 * @param input 用户输入的题目/内容
 * @returns 匹配到的场景 ID，未命中则返回 null
 */
export function matchInputToScenario(input: string): ScenarioId | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalizedInput = trimmed.toLowerCase();

  for (const { keywords, scenarioId } of KEYWORD_SCENARIO_MAP) {
    const hasMatch = keywords.some((kw) => normalizedInput.includes(kw.toLowerCase()));
    if (hasMatch) {
      return scenarioId;
    }
  }

  return null;
}
