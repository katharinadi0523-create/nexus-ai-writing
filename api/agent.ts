interface AgentBody {
  scenarioId?: string;
  query?: string;
  stream?: boolean;
  inputs?: Record<string, unknown>;
}

type CorsHandler = (req: any, res: any) => boolean;
function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const handleCors: CorsHandler = (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
};

interface AppforgeEventEnvelope {
  event?: string;
  data?: Record<string, unknown>;
}

type AgentType = 'workflow';

interface AgentDefinition {
  appId: string;
  token: string;
  agentType: AgentType;
}

interface QwenChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

const APPFORGE_BASE_URL =
  process.env.APPFORGE_BASE_URL || 'http://110.154.34.22:37755/appforge/openapi/v1';

const APPFORGE_DEFAULT_TOKEN = '6b9dbe0086d15f7da69c34573af37de1';

const AGENT_REGISTRY: Record<string, AgentDefinition> = {
  'report-compile': {
    appId: process.env.APPFORGE_REPORT_COMPILE_APP_ID || 'app-6p23bh2c',
    token: process.env.APPFORGE_REPORT_COMPILE_TOKEN || APPFORGE_DEFAULT_TOKEN,
    agentType: 'workflow',
  },
  'oil-gas': {
    appId: process.env.APPFORGE_OIL_GAS_APP_ID || 'app-c8kfj18j',
    token: process.env.APPFORGE_OIL_GAS_TOKEN || APPFORGE_DEFAULT_TOKEN,
    agentType: 'workflow',
  },
};

const MESSAGE_OUTPUT_KEYS = ['message', 'msg-output', 'msg_output', 'msgOutput', 'reply'];
const MESSAGE_NODE_TYPES = new Set([
  'msg-output',
  'msg_output',
  'msgoutput',
  'message',
  'message-output',
  'message_output',
  'messageoutput',
]);
const FINAL_OUTPUT_KEYS = [
  'report',
  'result',
  'content',
  'answer',
  'article',
  'markdown',
  'fullText',
  'full_text',
  'text',
];

const DEFAULT_QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_QWEN_MODEL = 'qwen-plus';

function getBody(rawBody: unknown): AgentBody {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as AgentBody;
    } catch {
      return {};
    }
  }
  return rawBody as AgentBody;
}

function getInputs(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => {
    if (typeof item === 'string') {
      return item.trim().length > 0;
    }
    return item !== undefined && item !== null;
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function extractQwenContent(data: QwenChatResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('').trim();
  }
  return '';
}

function getScenarioLabel(scenarioId: string): string {
  if (scenarioId === 'oil-gas') {
    return '油气价格分析';
  }
  if (scenarioId === 'report-compile') {
    return '报告整编';
  }
  return '指定智能体';
}

async function generateFallbackAgentResult({
  scenarioId,
  query,
  inputs,
}: {
  scenarioId: string;
  query: string;
  inputs?: Record<string, unknown>;
}): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY?.trim();
  if (!apiKey) {
    return '';
  }

  const baseUrl = process.env.QWEN_BASE_URL || DEFAULT_QWEN_BASE_URL;
  const model = process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL;
  const inputSummary = inputs
    ? Object.entries(inputs)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join('\n')
    : '';

  const messages = [
    {
      role: 'system',
      content:
        '你是企业写作智能体。请根据用户需求直接输出中文 Markdown 正文，不要输出解释、前后缀或代码块。',
    },
    {
      role: 'user',
      content: `当前模式：${getScenarioLabel(scenarioId)}\n用户需求：${query}${
        inputSummary ? `\n附加参数：\n${inputSummary}` : ''
      }\n\n请直接输出最终正文。`,
    },
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as QwenChatResponse;
    return extractQwenContent(data);
  } catch {
    return '';
  }
}

async function sendAgentFallback({
  res,
  scenarioId,
  query,
  inputs,
  reason,
}: {
  res: any;
  scenarioId: string;
  query: string;
  inputs?: Record<string, unknown>;
  reason: string;
}) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const fallbackResult = await generateFallbackAgentResult({
    scenarioId,
    query,
    inputs,
  });

  if (fallbackResult.trim()) {
    const fallbackNotice = `真实工作流暂不可用，已切换为简化生成（原因：${reason || '上游不可达'}）。当前不会返回节点级 msg-output。`;
    writeSseEvent(res, 'status', {
      status: '真实智能体暂不可用，已自动切换为通用生成',
    });
    writeSseEvent(res, 'workflow_message', {
      id: `workflow-fallback-${Date.now()}`,
      title: '工作流状态',
      content: fallbackNotice.slice(0, 260),
    });
    writeSseEvent(res, 'done', { result: fallbackResult });
  } else {
    writeSseEvent(res, 'error', { error: reason });
  }

  res.end();
}

function parseSseFrame(frame: string): string | null {
  const trimmed = frame.trim();
  if (!trimmed) {
    return null;
  }

  const dataLines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim());

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join('\n');
}

function findSseBoundary(buffer: string): number {
  const lfIndex = buffer.indexOf('\n\n');
  const crlfIndex = buffer.indexOf('\r\n\r\n');

  if (lfIndex === -1) return crlfIndex;
  if (crlfIndex === -1) return lfIndex;
  return Math.min(lfIndex, crlfIndex);
}

function getBoundaryLength(buffer: string, index: number): number {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2;
}

function writeSseEvent(res: any, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function parseErrorMessage(rawText: string, status: number): string {
  if (!rawText.trim()) {
    return `真实智能体请求失败（${status}）`;
  }

  try {
    const parsed = JSON.parse(rawText) as { error?: string; message?: string };
    return parsed.error || parsed.message || `真实智能体请求失败（${status}）`;
  } catch {
    return rawText.trim();
  }
}

function getStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function getRecordValue(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function extractNodeOutputs(data: Record<string, unknown> | undefined): Record<string, unknown> {
  return getRecordValue(data?.outputs) || getRecordValue(data?.output) || {};
}

function normalizeNodeType(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '-');
}

function extractTextFromValue(value: unknown): string {
  const directText = getStringValue(value).trim();
  if (directText) {
    return directText;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractTextFromValue(item);
      if (text) {
        return text;
      }
    }
    return '';
  }

  const record = getRecordValue(value);
  if (!record) {
    return '';
  }

  for (const key of MESSAGE_OUTPUT_KEYS) {
    const text = extractTextFromValue(record[key]);
    if (text) {
      return text;
    }
  }

  for (const key of ['text', 'content', 'value', 'result', 'answer']) {
    const text = extractTextFromValue(record[key]);
    if (text) {
      return text;
    }
  }

  return '';
}

function extractPreferredOutput(
  outputs: Record<string, unknown> | undefined,
  preferredKeys: string[]
): string {
  if (!outputs) {
    return '';
  }

  for (const key of preferredKeys) {
    const value = extractTextFromValue(outputs[key]);
    if (value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(outputs)) {
    const text = extractTextFromValue(value);
    if (text.trim()) {
      return text;
    }
  }

  return '';
}

async function streamWorkflowAgentResponse({
  res,
  response,
}: {
  res: any;
  response: Response;
}) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('真实智能体流式响应不可读');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = '';
  let hasWorkflowFinished = false;
  const emittedWorkflowMessages = new Set<string>();

  const cacheFinalResult = (nextResult: string) => {
    if (nextResult.trim()) {
      finalResult = nextResult;
    }
  };

  const emitWorkflowMessage = (data: Record<string, unknown> | undefined) => {
    const outputs = extractNodeOutputs(data);
    const content = extractPreferredOutput(outputs, MESSAGE_OUTPUT_KEYS).trim();
    if (!content) {
      return;
    }

    const messageId =
      getStringValue(data?.id) ||
      getStringValue(data?.node_id) ||
      `${getStringValue(data?.title)}:${content}`;

    if (emittedWorkflowMessages.has(messageId)) {
      return;
    }

    emittedWorkflowMessages.add(messageId);
    writeSseEvent(res, 'workflow_message', {
      id: messageId,
      title: getStringValue(data?.title) || '消息节点',
      content,
    });
  };

  const consumeEnvelope = (envelope: AppforgeEventEnvelope) => {
    const eventName = envelope.event || '';
    const data = getRecordValue(envelope.data);

    if (!eventName) {
      return;
    }

    if (eventName === 'node_started') {
      const nodeType = getStringValue(data?.node_type);
      const nodeTitle = getStringValue(data?.title);
      if (nodeTitle && nodeType !== 'msg-output') {
        writeSseEvent(res, 'status', {
          status: `正在执行：${nodeTitle}`,
          nodeTitle,
          nodeType,
        });
      }
      return;
    }

    if (eventName === 'node_finished' || eventName === 'node_completed') {
      const nodeType = normalizeNodeType(getStringValue(data?.node_type));

      if (MESSAGE_NODE_TYPES.has(nodeType)) {
        emitWorkflowMessage(data);
        return;
      }

      if (nodeType === 'end') {
        const outputs = extractNodeOutputs(data);
        cacheFinalResult(extractPreferredOutput(outputs, FINAL_OUTPUT_KEYS));
      }
      return;
    }

    if (eventName === 'workflow_finished' || eventName === 'workflow_completed') {
      hasWorkflowFinished = true;
      const outputs = extractNodeOutputs(data);
      cacheFinalResult(extractPreferredOutput(outputs, FINAL_OUTPUT_KEYS));
      writeSseEvent(res, 'done', {
        result: finalResult,
      });
      res.end();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = findSseBoundary(buffer);
    while (boundaryIndex !== -1) {
      const frame = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + getBoundaryLength(buffer, boundaryIndex));

      const payload = parseSseFrame(frame);
      if (payload) {
        try {
          consumeEnvelope(JSON.parse(payload) as AppforgeEventEnvelope);
        } catch {
          // Ignore invalid upstream frames.
        }
      }

      boundaryIndex = findSseBoundary(buffer);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const payload = parseSseFrame(buffer);
    if (payload) {
      try {
        consumeEnvelope(JSON.parse(payload) as AppforgeEventEnvelope);
      } catch {
        // Ignore invalid upstream frames.
      }
    }
  }

  if (!hasWorkflowFinished) {
    writeSseEvent(res, 'done', {
      result: finalResult,
    });
    res.end();
  }
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = getBody(req.body);
  const scenarioId = body.scenarioId?.trim() || '';
  const query = body.query?.trim() || '';
  const shouldStream = body.stream !== false;
  const inputs = getInputs(body.inputs);

  if (!scenarioId) {
    res.status(400).json({ error: 'scenarioId 不能为空' });
    return;
  }

  if (!query) {
    res.status(400).json({ error: 'query 不能为空' });
    return;
  }

  const agent = AGENT_REGISTRY[scenarioId];
  if (!agent) {
    res.status(400).json({ error: `未配置场景 ${scenarioId} 的真实接口` });
    return;
  }

  if (!shouldStream) {
    res.status(400).json({ error: '当前仅支持流式调用真实智能体' });
    return;
  }

  if (agent.agentType !== 'workflow') {
    res.status(400).json({ error: `暂不支持 ${agent.agentType} 类型真实智能体` });
    return;
  }

  try {
    const response = await fetch(`${APPFORGE_BASE_URL}/InvokeApp/${agent.appId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agent.token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json, */*',
      },
      body: JSON.stringify({
        id: agent.appId,
        query,
        ...(inputs ? { inputs } : {}),
      }),
    });

    if (!response.ok) {
      const rawText = await response.text();
      const errorMessage = parseErrorMessage(rawText, response.status);
      await sendAgentFallback({
        res,
        scenarioId,
        query,
        inputs,
        reason: errorMessage,
      });
      return;
    }

    await streamWorkflowAgentResponse({ res, response });
  } catch (error) {
    const message = error instanceof Error ? error.message : '真实智能体调用失败';
    await sendAgentFallback({
      res,
      scenarioId,
      query,
      inputs,
      reason: message,
    });
  }
}
