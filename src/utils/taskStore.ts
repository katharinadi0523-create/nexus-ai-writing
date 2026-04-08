/**
 * 任务存储服务
 * 用于管理历史任务（最近任务）的创建、保存和恢复
 */

import type React from 'react';
import { GeneralContentSource, Mode, WritingState } from '../types/writing';
import { ScenarioId } from '../constants/scenarioData';
import type { AgentConfigSnapshot, AgentWriteConfirmation, ChatMessageVariant } from '../types/chat';
import type { WritingDocument } from '../types/document';
import type { LocalWorkspaceSelection } from '../types/localWorkspace';
import type { QuarterlyReportDemoState } from '../types/quarterlyReportDemo';

/** 可序列化的消息格式（content 仅允许 string，便于 JSON 持久化） */
export interface SerializableMessage {
  role: 'user' | 'ai';
  content: string;
  variant?: ChatMessageVariant;
  title?: string;
  configSnapshot?: AgentConfigSnapshot;
  writeConfirmation?: AgentWriteConfirmation;
  documentId?: string;
}

/**
 * 将消息转为可存储格式（JSX 转为占位符字符串）
 */
function serializeMessages(
  messages: Array<{
    role: 'user' | 'ai';
    content: string | React.ReactNode;
    variant?: ChatMessageVariant;
    title?: string;
    configSnapshot?: AgentConfigSnapshot;
    writeConfirmation?: AgentWriteConfirmation;
    documentId?: string;
  }>
): SerializableMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : '[已保存的会话内容]',
    variant: m.variant,
    title: m.title,
    configSnapshot: m.configSnapshot,
    writeConfirmation: m.writeConfirmation,
    documentId: m.documentId,
  }));
}

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
  /** 当前任务关联的模板 ID（若有） */
  selectedTemplateId?: string;
  /** 当前任务关联的本地工作空间（若有） */
  selectedLocalWorkspace?: LocalWorkspaceSelection;
  /** 通用模式下的内容来源 */
  generalContentSource?: GeneralContentSource;
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
  /** 当前任务下的全部文档 */
  documents: WritingDocument[];
  /** 当前打开的文档 ID */
  activeDocumentId: string | null;
  /** 对话消息历史（存储时 content 仅为 string） */
  messages: SerializableMessage[];
  /** 固定季度汇报 mock 流程状态 */
  quarterlyReportDemoState?: QuarterlyReportDemoState;
}

const STORAGE_KEY = 'nexus_writing_tasks';
const MAX_TASKS = 10; // 最多保存10个任务

/**
 * 获取所有任务
 */
export function getAllTasks(): Task[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const tasks: Task[] = JSON.parse(stored);
    // 按更新时间倒序排列，并保证只保留最近 MAX_TASKS 条
    const sortedTasks = tasks.sort((a, b) => b.updatedAt - a.updatedAt);
    const trimmedTasks = sortedTasks.slice(0, MAX_TASKS);
    if (trimmedTasks.length !== tasks.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedTasks));
    }
    return trimmedTasks;
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
    }

    // 每次保存都按更新时间排序并裁剪，确保历史任务最多保留 MAX_TASKS 条
    tasks.sort((a, b) => b.updatedAt - a.updatedAt);
    if (tasks.length > MAX_TASKS) {
      tasks.splice(MAX_TASKS);
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
  scenarioId?: ScenarioId,
  selectedTemplateId?: string,
  selectedLocalWorkspace?: LocalWorkspaceSelection
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
    selectedTemplateId,
    selectedLocalWorkspace,
    content: '',
    documentName: '新文档_1',
    outline: '',
    memoryConfig: {},
    paramsConfig: {},
    documents: [],
    activeDocumentId: null,
    messages: [{ role: 'user', content: input }],
  };
  
  saveTask(task);
  return task;
}

/**
 * 更新任务状态
 * 传入的 messages 若含 JSX，会自动转为可序列化格式
 */
export function updateTask(
  taskId: string,
  updates: Partial<
    Omit<Task, 'messages'> & {
      messages?: Array<{
        role: 'user' | 'ai';
        content: string | React.ReactNode;
        variant?: ChatMessageVariant;
        title?: string;
        configSnapshot?: AgentConfigSnapshot;
        writeConfirmation?: AgentWriteConfirmation;
        documentId?: string;
      }>;
    }
  >
): void {
  const task = getTask(taskId);
  if (!task) return;

  const { messages: rawMessages, ...rest } = updates;
  const updatesToApply: Partial<Task> = { ...rest, updatedAt: Date.now() };
  if (rawMessages !== undefined) {
    updatesToApply.messages = serializeMessages(rawMessages);
  }

  const updatedTask: Task = {
    ...task,
    ...updatesToApply,
  };

  saveTask(updatedTask);
}
