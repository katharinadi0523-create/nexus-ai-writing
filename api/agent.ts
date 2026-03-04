interface AgentBody {
  scenarioId?: string;
  query?: string;
  stream?: boolean;
  inputs?: Record<string, unknown>;
}

type CorsHandler = (req: any, res: any) => boolean;
let corsHandlerPromise: Promise<CorsHandler> | null = null;

async function loadCorsHandler(): Promise<CorsHandler> {
  if (!corsHandlerPromise) {
    corsHandlerPromise = import(new URL('./cors.js', import.meta.url).href)
      .then((module) => module.handleCors as CorsHandler);
  }

  return corsHandlerPromise;
}

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
  return '';
}

function getRecordValue(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function extractNodeOutputs(data: Record<string, unknown> | undefined): Record<string, unknown> {
  return getRecordValue(data?.outputs) || {};
}

function extractPreferredOutput(
  outputs: Record<string, unknown> | undefined,
  preferredKeys: string[]
): string {
  if (!outputs) {
    return '';
  }

  for (const key of preferredKeys) {
    const value = getStringValue(outputs[key]);
    if (value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(outputs)) {
    const text = getStringValue(value);
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

    if (eventName === 'node_finished') {
      const nodeType = getStringValue(data?.node_type);

      if (nodeType === 'msg-output') {
        emitWorkflowMessage(data);
        return;
      }

      if (nodeType === 'end') {
        const outputs = extractNodeOutputs(data);
        cacheFinalResult(extractPreferredOutput(outputs, FINAL_OUTPUT_KEYS));
      }
      return;
    }

    if (eventName === 'workflow_finished') {
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
  let handleCors: CorsHandler;
  try {
    handleCors = await loadCorsHandler();
  } catch {
    res.status(500).json({ error: '服务初始化失败（CORS 模块加载失败）' });
    return;
  }

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

      res.statusCode = response.status;
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      writeSseEvent(res, 'error', { error: errorMessage });
      res.end();
      return;
    }

    await streamWorkflowAgentResponse({ res, response });
  } catch (error) {
    const message = error instanceof Error ? error.message : '真实智能体调用失败';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    writeSseEvent(res, 'error', { error: message });
    res.end();
  }
}
