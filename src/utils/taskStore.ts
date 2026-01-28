/**
 * 任务存储服务
 * 用于管理历史任务（最近任务）的创建、保存和恢复
 */

import { Mode, WritingState } from '../types/writing';
import { ScenarioId } from '../constants/mockData';

/**
 * 任务数据结构
 */
export interface Task {
  /** 任务 ID */
  id: string;
  /** 任务名称（用户输入的 query） */
  name: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 写作模式 */
  mode: Mode;
  /** 当前状态 */
  writingState: WritingState;
  /** 用户输入 */
  input: string;
  /** 智能体 ID（如果有） */
  scenarioId?: ScenarioId;
  /** 文档内容 */
  content: string;
  /** 文档名称 */
  documentName: string;
  /** 大纲内容 */
  outline: string;
  /** 记忆配置 */
  memoryConfig: Record<string, any>;
  /** 参数配置 */
  paramsConfig: Record<string, any>;
  /** 对话消息历史 */
  messages: Array<{ role: 'user' | 'ai'; content: string | JSX.Element }>;
}

const STORAGE_KEY = 'nexus_writing_tasks';
const MAX_TASKS = 50; // 最多保存50个任务

/**
 * 获取所有任务
 */
export function getAllTasks(): Task[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const tasks: Task[] = JSON.parse(stored);
    // 按更新时间倒序排列
    return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return [];
  }
}

/**
 * 保存任务
 */
export function saveTask(task: Task): void {
  try {
    const tasks = getAllTasks();
    // 查找是否已存在相同 ID 的任务
    const existingIndex = tasks.findIndex((t) => t.id === task.id);
    
    if (existingIndex >= 0) {
      // 更新现有任务
      tasks[existingIndex] = task;
    } else {
      // 添加新任务
      tasks.push(task);
      // 如果超过最大数量，删除最旧的任务
      if (tasks.length > MAX_TASKS) {
        tasks.sort((a, b) => b.updatedAt - a.updatedAt);
        tasks.splice(MAX_TASKS);
      }
    }
    
    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save task:', error);
  }
}

/**
 * 获取指定任务
 */
export function getTask(taskId: string): Task | null {
  const tasks = getAllTasks();
  return tasks.find((t) => t.id === taskId) || null;
}

/**
 * 删除任务
 */
export function deleteTask(taskId: string): void {
  try {
    const tasks = getAllTasks();
    const filtered = tasks.filter((t) => t.id !== taskId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete task:', error);
  }
}

/**
 * 创建新任务
 */
export function createTask(
  name: string,
  input: string,
  mode: Mode,
  scenarioId?: ScenarioId
): Task {
  const now = Date.now();
  const task: Task = {
    id: `task_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    createdAt: now,
    updatedAt: now,
    mode,
    writingState: WritingState.THINKING,
    input,
    scenarioId,
    content: '',
    documentName: '新文档_1',
    outline: '',
    memoryConfig: {},
    paramsConfig: {},
    messages: [{ role: 'user', content: input }],
  };
  
  saveTask(task);
  return task;
}

/**
 * 更新任务状态
 */
export function updateTask(taskId: string, updates: Partial<Task>): void {
  const task = getTask(taskId);
  if (!task) return;
  
  const updatedTask: Task = {
    ...task,
    ...updates,
    updatedAt: Date.now(),
  };
  
  saveTask(updatedTask);
}
