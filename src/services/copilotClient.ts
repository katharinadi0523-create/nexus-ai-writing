import type { CopilotResponse } from '../types/copilot';
import { fetchApi } from './apiClient';

interface SerializableMessage {
  role: 'user' | 'ai';
  content: string;
}

interface AgentCopilotContext {
  agentName: string;
  agentDescription: string;
}

interface CopilotRequest {
  message: string;
  document?: string;
  outline?: string;
  title?: string;
  history?: SerializableMessage[];
  mode?: 'general' | 'agent';
  agentContext?: AgentCopilotContext;
  knowledgeBaseIds?: string[];
  lightweightChat?: boolean;
}

async function parseApiResponse(response: Response): Promise<{
  intent?: string;
  reply?: string;
  edit?: CopilotResponse['edit'];
  topic?: string;
  error?: string;
}> {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawText) as {
      intent?: string;
      reply?: string;
      edit?: CopilotResponse['edit'];
      topic?: string;
      error?: string;
    };
  } catch {
    return { error: rawText.trim() };
  }
}

export async function queryCopilotWithQwen({
  message,
  document,
  outline,
  title,
  history,
  mode,
  agentContext,
  knowledgeBaseIds,
  lightweightChat,
}: CopilotRequest): Promise<CopilotResponse> {
  const response = await fetchApi('/api/copilot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      document,
      outline,
      title,
      history,
      mode,
      agentContext,
      knowledgeBaseIds,
      lightweightChat,
    }),
  });

  const data = await parseApiResponse(response);
  if (!response.ok) {
    throw new Error(data.error || `Copilot 请求失败（${response.status}）`);
  }

  if (
    (data.intent !== 'edit' &&
      data.intent !== 'qa' &&
      data.intent !== 'chat' &&
      data.intent !== 'restart' &&
      data.intent !== 'agent_write_related' &&
      data.intent !== 'agent_write_unrelated') ||
    typeof data.reply !== 'string'
  ) {
    throw new Error('Copilot 返回格式异常，请稍后重试。');
  }

  return {
    intent: data.intent,
    reply: data.reply,
    edit: data.edit,
    topic: typeof data.topic === 'string' ? data.topic : undefined,
  };
}
