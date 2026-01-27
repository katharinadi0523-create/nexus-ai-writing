/**
 * 写作工作台核心状态机定义
 */

/**
 * 写作模式
 */
export enum Mode {
  /** 通用模式：需要经过大纲确认步骤 */
  GENERAL = 'GENERAL',
  /** 智能体模式：跳过大纲，直接生成 */
  AGENT = 'AGENT',
}

/**
 * 写作状态
 */
export enum WritingState {
  /** 输入阶段：用户输入内容 */
  INPUT = 'INPUT',
  /** 思考阶段：AI 正在思考/分析 */
  THINKING = 'THINKING',
  /** 大纲确认阶段：展示大纲，等待用户确认 */
  OUTLINE_CONFIRM = 'OUTLINE_CONFIRM',
  /** 生成阶段：正在生成内容 */
  GENERATING = 'GENERATING',
  /** 完成阶段：内容生成完成 */
  FINISHED = 'FINISHED',
}

/**
 * 状态流配置
 * 定义不同模式下的状态流转规则
 */
export interface StateFlow {
  /** 当前模式 */
  mode: Mode;
  /** 状态流转序列 */
  states: WritingState[];
}

/**
 * GENERAL 模式状态流
 * 输入 -> THINKING -> OUTLINE_CONFIRM -> GENERATING -> FINISHED
 */
export const GENERAL_FLOW: StateFlow = {
  mode: Mode.GENERAL,
  states: [
    WritingState.INPUT,
    WritingState.THINKING,
    WritingState.OUTLINE_CONFIRM,
    WritingState.GENERATING,
    WritingState.FINISHED,
  ],
};

/**
 * AGENT 模式状态流
 * 输入 @ 选择智能体 -> 配置记忆/参数表单 -> GENERATING -> FINISHED
 * 注意：AGENT 模式跳过了 THINKING 和 OUTLINE_CONFIRM 步骤
 */
export const AGENT_FLOW: StateFlow = {
  mode: Mode.AGENT,
  states: [
    WritingState.INPUT,
    WritingState.GENERATING,
    WritingState.FINISHED,
  ],
};

/**
 * 写作任务上下文
 */
export interface WritingContext {
  /** 当前模式 */
  mode: Mode;
  /** 当前状态 */
  currentState: WritingState;
  /** 用户输入内容 */
  input: string;
  /** 选中的智能体 ID（AGENT 模式） */
  agentId?: string;
  /** 记忆配置（AGENT 模式） */
  memoryConfig?: Record<string, any>;
  /** 参数配置（AGENT 模式） */
  paramsConfig?: Record<string, any>;
  /** 大纲内容（GENERAL 模式，OUTLINE_CONFIRM 阶段） */
  outline?: string;
  /** 生成的内容 */
  content?: string;
  /** 任务 ID */
  taskId?: string;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}

/**
 * 状态转换函数类型
 */
export type StateTransition = (
  context: WritingContext,
  nextState: WritingState
) => WritingContext | null;

/**
 * 验证状态转换是否合法
 */
export function isValidTransition(
  mode: Mode,
  currentState: WritingState,
  nextState: WritingState
): boolean {
  const flow = mode === Mode.GENERAL ? GENERAL_FLOW : AGENT_FLOW;
  const currentIndex = flow.states.indexOf(currentState);
  const nextIndex = flow.states.indexOf(nextState);

  // 状态必须在流程中存在
  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }

  // 只能前进到下一个状态，不能回退
  return nextIndex === currentIndex + 1;
}

/**
 * 获取下一个状态
 */
export function getNextState(
  mode: Mode,
  currentState: WritingState
): WritingState | null {
  const flow = mode === Mode.GENERAL ? GENERAL_FLOW : AGENT_FLOW;
  const currentIndex = flow.states.indexOf(currentState);

  if (currentIndex === -1 || currentIndex === flow.states.length - 1) {
    return null;
  }

  return flow.states[currentIndex + 1];
}
