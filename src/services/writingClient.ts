import { fetchApi } from './apiClient';

interface GenerateOutlineRequest {
  prompt: string;
  knowledgeBaseIds?: string[];
  signal?: AbortSignal;
}

interface GenerateArticleRequest {
  prompt: string;
  outline: string;
  knowledgeBaseIds?: string[];
  signal?: AbortSignal;
}

interface StreamArticleRequest extends GenerateArticleRequest {
  onChunk?: (delta: string, accumulated: string) => void;
  onThoughtChunk?: (delta: string, accumulated: string) => void;
}

interface StreamThoughtRequest {
  prompt: string;
  outline?: string;
  phase: 'outline' | 'article' | 'edit';
  knowledgeBaseIds?: string[];
  onChunk?: (delta: string, accumulated: string) => void;
  signal?: AbortSignal;
}

type WriteAction = 'outline' | 'article';

interface WriteApiResponse {
  result?: string;
  error?: string;
}

interface StreamDonePayload {
  result?: string;
}

interface StreamErrorPayload {
  error?: string;
}

async function parseApiResponse(response: Response): Promise<WriteApiResponse> {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawText) as WriteApiResponse;
  } catch {
    return { error: rawText.trim() };
  }
}

async function requestWriteApi(
  action: WriteAction,
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetchApi('/api/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      action,
      ...payload,
    }),
  });

  const data = await parseApiResponse(response);
  if (!response.ok) {
    throw new Error(data.error || `写作请求失败（${response.status}）`);
  }

  const output = data.result?.trim() || '';
  if (!output) {
    throw new Error('模型未返回有效内容，请重试。');
  }

  return output;
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

export function generateOutlineWithQwen({
  prompt,
  knowledgeBaseIds,
  signal,
}: GenerateOutlineRequest): Promise<string> {
  return requestWriteApi('outline', { prompt, knowledgeBaseIds }, signal);
}

export async function streamArticleWithQwen({
  prompt,
  outline,
  knowledgeBaseIds,
  onChunk,
  onThoughtChunk,
  signal,
}: StreamArticleRequest): Promise<string> {
  const response = await fetchApi('/api/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      action: 'article',
      prompt,
      outline,
      knowledgeBaseIds,
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = await parseApiResponse(response);
    throw new Error(data.error || `写作请求失败（${response.status}）`);
  }

  if (!response.body) {
    throw new Error('浏览器不支持流式响应读取。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedThought = '';
  let accumulated = '';
  let finalResult = '';

  const consumeFrame = (frame: string) => {
    const parsed = parseSseFrame(frame);
    if (!parsed) {
      return;
    }

    try {
      if (parsed.event === 'thought') {
        const payload = JSON.parse(parsed.data) as { delta?: string };
        const delta = payload.delta || '';
        if (!delta) {
          return;
        }
        accumulatedThought += delta;
        onThoughtChunk?.(delta, accumulatedThought);
        return;
      }

      if (parsed.event === 'chunk') {
        const payload = JSON.parse(parsed.data) as { delta?: string };
        const delta = payload.delta || '';
        if (!delta) {
          return;
        }
        accumulated += delta;
        onChunk?.(delta, accumulated);
        return;
      }

      if (parsed.event === 'done') {
        const payload = JSON.parse(parsed.data) as StreamDonePayload;
        finalResult = payload.result?.trim() || '';
        return;
      }

      if (parsed.event === 'error') {
        const payload = JSON.parse(parsed.data) as StreamErrorPayload;
        throw new Error(payload.error || '流式写作失败');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('流式响应解析失败');
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

  const result = finalResult || accumulated.trim();
  if (!result) {
    throw new Error('模型未返回有效内容，请重试。');
  }

  return result;
}

export async function streamThoughtWithQwen({
  prompt,
  outline,
  phase,
  knowledgeBaseIds,
  onChunk,
  signal,
}: StreamThoughtRequest): Promise<string> {
  const response = await fetchApi('/api/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      action: 'thought',
      prompt,
      outline,
      phase,
      knowledgeBaseIds,
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = await parseApiResponse(response);
    throw new Error(data.error || `思考过程请求失败（${response.status}）`);
  }

  if (!response.body) {
    throw new Error('浏览器不支持流式响应读取。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let finalResult = '';

  const consumeFrame = (frame: string) => {
    const parsed = parseSseFrame(frame);
    if (!parsed) {
      return;
    }

    try {
      if (parsed.event === 'chunk') {
        const payload = JSON.parse(parsed.data) as { delta?: string };
        const delta = payload.delta || '';
        if (!delta) {
          return;
        }
        accumulated += delta;
        onChunk?.(delta, accumulated);
        return;
      }

      if (parsed.event === 'done') {
        const payload = JSON.parse(parsed.data) as StreamDonePayload;
        finalResult = payload.result?.trim() || '';
        return;
      }

      if (parsed.event === 'error') {
        const payload = JSON.parse(parsed.data) as StreamErrorPayload;
        throw new Error(payload.error || '思考过程生成失败');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('思考过程流式响应解析失败');
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

  const result = finalResult || accumulated.trim();
  if (!result) {
    throw new Error('模型未返回有效思考过程，请重试。');
  }

  return result;
}

export function generateArticleWithQwen({
  prompt,
  outline,
  signal,
}: GenerateArticleRequest): Promise<string> {
  return requestWriteApi('article', { prompt, outline }, signal);
}
