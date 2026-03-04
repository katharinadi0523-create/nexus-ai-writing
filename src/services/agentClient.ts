import { fetchApi } from './apiClient';

interface StreamAgentRequest {
  scenarioId: string;
  query: string;
  inputs?: Record<string, unknown>;
  onStatus?: (status: string) => void;
  onWorkflowMessage?: (payload: WorkflowMessagePayload) => void;
  onResult?: (markdown: string) => void;
}

interface StreamDonePayload {
  result?: string;
}

interface StreamErrorPayload {
  error?: string;
}

interface StreamStatusPayload {
  status?: string;
}

interface WorkflowMessagePayload {
  id?: string;
  title?: string;
  content?: string;
}

interface ErrorResponse {
  error?: string;
}

function parseSseFrame(frame: string): { event: string; data: string } | null {
  const trimmed = frame.trim();
  if (!trimmed) {
    return null;
  }

  const lines = trimmed.split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    event,
    data: dataLines.join('\n'),
  };
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

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ErrorResponse;
    return data.error || `真实智能体请求失败（${response.status}）`;
  } catch {
    return `真实智能体请求失败（${response.status}）`;
  }
}

function normalizeInputs(inputs?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!inputs) {
    return undefined;
  }

  const entries = Object.entries(inputs).filter(([, value]) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== undefined && value !== null;
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export async function streamAgent({
  scenarioId,
  query,
  inputs,
  onStatus,
  onWorkflowMessage,
  onResult,
}: StreamAgentRequest): Promise<{ result: string }> {
  const normalizedInputs = normalizeInputs(inputs);
  const response = await fetchApi('/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scenarioId,
      query,
      stream: true,
      ...(normalizedInputs ? { inputs: normalizedInputs } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  if (!response.body) {
    throw new Error('浏览器不支持流式响应读取。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';

  const consumeFrame = (frame: string) => {
    const parsed = parseSseFrame(frame);
    if (!parsed) {
      return;
    }

    try {
      if (parsed.event === 'status') {
        const payload = JSON.parse(parsed.data) as StreamStatusPayload;
        if (payload.status) {
          onStatus?.(payload.status);
        }
        return;
      }

      if (parsed.event === 'workflow_message') {
        const payload = JSON.parse(parsed.data) as WorkflowMessagePayload;
        if (payload.content) {
          onWorkflowMessage?.(payload);
        }
        return;
      }

      if (parsed.event === 'done') {
        const payload = JSON.parse(parsed.data) as StreamDonePayload;
        result = payload.result || result;
        if (result) {
          onResult?.(result);
        }
        return;
      }

      if (parsed.event === 'error') {
        const payload = JSON.parse(parsed.data) as StreamErrorPayload;
        throw new Error(payload.error || '真实智能体调用失败');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('真实智能体流式响应解析失败');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = findSseBoundary(buffer);
    while (boundaryIndex !== -1) {
      const frame = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + getBoundaryLength(buffer, boundaryIndex));
      consumeFrame(frame);
      boundaryIndex = findSseBoundary(buffer);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    consumeFrame(buffer);
  }

  return { result };
}
