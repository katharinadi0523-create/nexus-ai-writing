/**
 * 全局写作状态管理
 * 用于存储记忆变量和参数配置的值
 */

import { ScenarioId } from '../constants/mockData';

/**
 * 记忆变量值存储
 * 结构：{ [scenarioId]: { [key]: value } }
 */
let memoryValuesStore: Record<ScenarioId, Record<string, any>> = {};

/**
 * 参数配置值存储
 * 结构：{ [scenarioId]: { [key]: value } }
 */
let paramValuesStore: Record<ScenarioId, Record<string, any>> = {};

/**
 * 获取指定场景的记忆变量值
 */
export function getMemoryValues(scenarioId: ScenarioId): Record<string, any> {
  return memoryValuesStore[scenarioId] || {};
}

/**
 * 设置指定场景的记忆变量值
 */
export function setMemoryValues(scenarioId: ScenarioId, values: Record<string, any>): void {
  memoryValuesStore[scenarioId] = { ...memoryValuesStore[scenarioId], ...values };
}

/**
 * 更新单个记忆变量值
 */
export function updateMemoryValue(scenarioId: ScenarioId, key: string, value: any): void {
  if (!memoryValuesStore[scenarioId]) {
    memoryValuesStore[scenarioId] = {};
  }
  memoryValuesStore[scenarioId][key] = value;
}

/**
 * 重置指定场景的记忆变量值
 */
export function resetMemoryValues(scenarioId: ScenarioId): void {
  memoryValuesStore[scenarioId] = {};
}

/**
 * 获取指定场景的参数配置值
 */
export function getParamValues(scenarioId: ScenarioId): Record<string, any> {
  return paramValuesStore[scenarioId] || {};
}

/**
 * 设置指定场景的参数配置值
 */
export function setParamValues(scenarioId: ScenarioId, values: Record<string, any>): void {
  paramValuesStore[scenarioId] = { ...paramValuesStore[scenarioId], ...values };
}

/**
 * 更新单个参数配置值
 */
export function updateParamValue(scenarioId: ScenarioId, key: string, value: any): void {
  if (!paramValuesStore[scenarioId]) {
    paramValuesStore[scenarioId] = {};
  }
  paramValuesStore[scenarioId][key] = value;
}

/**
 * 重置指定场景的参数配置值
 */
export function resetParamValues(scenarioId: ScenarioId): void {
  paramValuesStore[scenarioId] = {};
}
