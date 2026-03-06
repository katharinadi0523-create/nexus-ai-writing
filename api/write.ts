import { getKnowledgeBaseContext } from './knowledge-base-service.js';

interface QwenChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
      reasoning_content?: string | Array<{ text?: string; type?: string }>;
    };
    delta?: {
      content?: string | Array<{ text?: string; type?: string }>;
      reasoning_content?: string | Array<{ text?: string; type?: string }>;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
  };
}

type WriteAction = 'outline' | 'article' | 'thought';

interface WriteBody {
  action?: WriteAction;
  prompt?: string;
  outline?: string;
  stream?: boolean;
  phase?: 'outline' | 'article' | 'edit';
  knowledgeBaseIds?: string[];
}

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function handleCors(req: any, res: any): boolean {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen-plus';
const DEFAULT_QWEN_TIMEOUT_MS = 180000;
const OUTLINE_KB_TOTAL_TOP_K = 3;
const OUTLINE_KB_MAX_CONTEXT_CHARS = 3000;
const OUTLINE_KB_MAX_CHUNK_CHARS = 700;

function extractContent(data: QwenChatResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('').trim();
  }
  return '';
}

function extractDelta(data: QwenChatResponse): string {
  const content = data.choices?.[0]?.delta?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('');
  }
  return '';
}

function extractReasoningDelta(data: QwenChatResponse): string {
  const content = data.choices?.[0]?.delta?.reasoning_content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('');
  }
  return '';
}

function getBody(rawBody: unknown): WriteBody {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as WriteBody;
    } catch {
      return {};
    }
  }
  return rawBody as WriteBody;
}

function stripCodeFence(text: string): string {
  return text
    .replace(/```(?:markdown|md)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function buildFallbackOutline(prompt: string): string {
  const title = prompt.trim().slice(0, 30) || '未命名主题';
  return [
    `# ${title}`,
    '## 一、写作背景',
    '### 1.1 核心问题界定',
    '### 1.2 写作目标说明',
    '## 二、主体分析',
    '### 2.1 关键观点展开',
    '### 2.2 论据与案例支撑',
    '## 三、结论与建议',
    '### 3.1 结论总结',
    '### 3.2 后续行动建议',
  ].join('\n');
}

function sanitizeOutline(raw: string, prompt: string): string {
  const cleaned = stripCodeFence(raw);
  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const headingLines = lines
    .map((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (!match) return null;

      const level = Math.min(match[1].length, 3);
      const title = match[2].trim().replace(/\s+/g, ' ');
      if (!title) return null;
      return `${'#'.repeat(level)} ${title}`;
    })
    .filter((line): line is string => Boolean(line));

  if (headingLines.length === 0) {
    return buildFallbackOutline(prompt);
  }

  const normalized: string[] = [];
  let hasH1 = false;

  for (const line of headingLines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const title = match[2].trim();

    if (!hasH1) {
      normalized.push(`# ${title}`);
      hasH1 = true;
      continue;
    }

    if (level === 1) {
      continue;
    }

    normalized.push(`${'#'.repeat(level)} ${title}`);
  }

  if (!hasH1) {
    return buildFallbackOutline(prompt);
  }

  const hasH2 = normalized.some((line) => line.startsWith('## '));
  if (!hasH2) {
    return buildFallbackOutline(prompt);
  }

  return normalized.join('\n');
}

function sanitizeArticle(raw: string, outline: string): string {
  const cleaned = stripCodeFence(raw);
  if (!cleaned) {
    return '';
  }

  const outlineTitleMatch = outline.match(/^#\s+(.+)$/m);
  if (!outlineTitleMatch) {
    return cleaned;
  }

  const title = outlineTitleMatch[1].trim();
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasTitle = new RegExp(`^#\\s+${escapedTitle}$`, 'm').test(cleaned);
  if (hasTitle) {
    return cleaned;
  }

  return `# ${title}\n\n${cleaned}`.trim();
}

function sanitizeThought(raw: string): string {
  return stripCodeFence(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function buildKnowledgeBasePromptBlock(contextText: string): string {
  if (!contextText.trim()) {
    return '当前未挂载知识库，或本次检索未命中有效外挂知识片段。';
  }

  return [
    '当前外挂知识库召回片段如下：',
    contextText,
    '',
    '使用要求：',
    '1) 优先参考这些片段中的事实、术语与案例。',
    '2) 如果片段不足以支撑结论，不要臆造具体事实。',
    '3) 不要原样堆砌片段，要结合用户需求重新组织表达。',
  ].join('\n');
}

function getMessages(
  action: WriteAction,
  prompt: string,
  outline?: string,
  phase: 'outline' | 'article' | 'edit' = 'outline',
  knowledgeBaseContext = ''
) {
  const knowledgeBasePromptBlock = buildKnowledgeBasePromptBlock(knowledgeBaseContext);

  if (action === 'outline') {
    return [
      {
        role: 'system',
        content:
          '你是专业中文写作策划助手。你只能输出 Markdown 大纲，且必须严格使用标题层级格式：第一行是 # 标题，后续只允许使用 ## 和 ###。不要输出正文、说明、前后缀、代码块、项目符号或表格。若提供了外挂知识库片段，请在结构设计时优先吸收其中的关键事实与术语。',
      },
      {
        role: 'user',
        content: `请根据以下写作需求生成一份可直接渲染的大纲。\n\n写作需求：\n${prompt}\n\n${knowledgeBasePromptBlock}\n\n硬性要求：\n1) 只输出 Markdown 大纲\n2) 第一行必须是 # 标题\n3) 后续章节只允许使用 ## 和 ###\n4) 结构完整，适合后续据此生成全文\n5) 不要添加“引言如下”“以下是大纲”等说明\n\n请直接输出最终大纲。`,
      },
    ];
  }

  if (action === 'thought') {
    const stageInstruction =
      phase === 'outline'
        ? '你正在为用户规划一份写作大纲。'
        : phase === 'article'
          ? '你正在基于用户确认后的大纲准备生成正文。'
          : '你正在根据用户对当前文档的修改要求定位原文，并准备生成修改建议。';

    return [
      {
        role: 'system',
        content:
          '你是中文写作助手中“可展示的思考摘要”模块。你只能输出给用户可见的简明过程说明，不要暴露模型内部推理细节，不要输出最终答案，不要使用代码块。若已提供外挂知识库片段，可以在摘要中说明你会结合这些资料，但不要逐条复述片段内容。',
      },
      {
        role: 'user',
        content: `${stageInstruction}\n\n用户需求：\n${prompt}\n\n${
          outline ? `已确认大纲：\n${outline}\n\n` : ''
        }${knowledgeBasePromptBlock}\n\n输出要求：\n1) 只输出 4 到 8 行中文思考摘要\n2) 每行一句，描述你将如何理解需求、组织结构、控制重点\n3) 可以使用“我会”“我将”“接下来会”等表达\n4) 不要输出大纲正文、文章正文、标题列表或解释说明\n5) 内容要适合直接展示给终端用户\n6) 如果当前阶段是改写，请重点描述“定位原文、判断改写范围、生成待确认版本”这些动作\n\n请直接开始输出。`,
      },
    ];
  }

  return [
    {
      role: 'system',
      content:
        '你是专业中文写作助手。你必须严格依据用户确认后的大纲生成完整 Markdown 文章，保留并复用原有标题层级。不要输出解释、前后缀或代码块。若提供了外挂知识库片段，请优先吸收其中的事实、术语和案例，但不要机械拼接原文。',
    },
    {
      role: 'user',
      content: `请根据以下写作需求与确认大纲生成完整文章。\n\n写作需求：\n${prompt}\n\n确认大纲：\n${outline}\n\n${knowledgeBasePromptBlock}\n\n硬性要求：\n1) 输出完整 Markdown 正文\n2) 保留大纲中的 #、##、### 标题结构\n3) 每个章节都应有对应内容，不能只重复标题\n4) 内容要紧扣写作需求，避免空话\n5) 不要输出任何额外说明\n\n请直接输出最终文章。`,
    },
  ];
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as QwenChatResponse;
    return data.error?.message || `Qwen API 请求失败（${response.status}）`;
  } catch {
    return `Qwen API 请求失败（${response.status}）`;
  }
}

function parseTimeoutMs(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function requestQwenChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  action,
  shouldStream,
  timeoutMs,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  action: WriteAction;
  shouldStream: boolean;
  timeoutMs: number;
}): Promise<Response> {
  return fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: action === 'outline' ? 0.5 : action === 'thought' ? 0.6 : 0.7,
        stream: shouldStream,
        ...(action === 'article'
          ? {
              enable_thinking: true,
            }
          : {}),
      }),
    },
    timeoutMs
  );
}

function writeSseEvent(res: any, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
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

async function streamArticleResponse({
  res,
  response,
  outline,
}: {
  res: any;
  response: Response;
  outline: string;
}) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('模型流式响应不可读');
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
  let accumulated = '';
  let streamError = '';

  const consumeEvent = (rawEvent: string) => {
    const trimmed = rawEvent.trim();
    if (!trimmed) {
      return;
    }

    const dataLines = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());

    if (dataLines.length === 0) {
      return;
    }

    const payload = dataLines.join('\n');
    if (payload === '[DONE]') {
      return;
    }

    try {
      const parsed = JSON.parse(payload) as QwenChatResponse;
      if (parsed.error?.message) {
        streamError = parsed.error.message;
        return;
      }

      const reasoningDelta = extractReasoningDelta(parsed);
      if (reasoningDelta) {
        writeSseEvent(res, 'thought', { delta: reasoningDelta });
      }

      const delta = extractDelta(parsed);
      if (!delta) {
        return;
      }

      accumulated += delta;
      writeSseEvent(res, 'chunk', { delta });
    } catch {
      // 忽略无法解析的非数据帧
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = findSseBoundary(buffer);
    while (boundaryIndex !== -1) {
      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + getBoundaryLength(buffer, boundaryIndex));
      consumeEvent(rawEvent);
      boundaryIndex = findSseBoundary(buffer);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    consumeEvent(buffer);
  }

  if (streamError) {
    writeSseEvent(res, 'error', { error: streamError });
    res.end();
    return;
  }

  const result = sanitizeArticle(accumulated, outline);
  if (!result) {
    writeSseEvent(res, 'error', { error: '模型未返回有效结果' });
    res.end();
    return;
  }

  writeSseEvent(res, 'done', { result });
  res.end();
}

async function streamThoughtResponse({
  res,
  response,
}: {
  res: any;
  response: Response;
}) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('模型流式响应不可读');
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
  let accumulated = '';
  let streamError = '';

  const consumeEvent = (rawEvent: string) => {
    const trimmed = rawEvent.trim();
    if (!trimmed) {
      return;
    }

    const dataLines = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());

    if (dataLines.length === 0) {
      return;
    }

    const payload = dataLines.join('\n');
    if (payload === '[DONE]') {
      return;
    }

    try {
      const parsed = JSON.parse(payload) as QwenChatResponse;
      if (parsed.error?.message) {
        streamError = parsed.error.message;
        return;
      }

      const delta = extractDelta(parsed);
      if (!delta) {
        return;
      }

      accumulated += delta;
      writeSseEvent(res, 'chunk', { delta });
    } catch {
      // ignore non-data frame
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = findSseBoundary(buffer);
    while (boundaryIndex !== -1) {
      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + getBoundaryLength(buffer, boundaryIndex));
      consumeEvent(rawEvent);
      boundaryIndex = findSseBoundary(buffer);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    consumeEvent(buffer);
  }

  if (streamError) {
    writeSseEvent(res, 'error', { error: streamError });
    res.end();
    return;
  }

  const result = sanitizeThought(accumulated);
  if (!result) {
    writeSseEvent(res, 'error', { error: '模型未返回有效思考过程' });
    res.end();
    return;
  }

  writeSseEvent(res, 'done', { result });
  res.end();
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '服务端未配置 QWEN_API_KEY' });
    return;
  }

  const body = getBody(req.body);
  const action = body.action;
  const prompt = body.prompt?.trim() || '';
  const outline = body.outline?.trim() || '';
  const phase =
    body.phase === 'article'
      ? 'article'
      : body.phase === 'edit'
        ? 'edit'
        : 'outline';
  const shouldStream = Boolean(body.stream) && (action === 'article' || action === 'thought');
  const knowledgeBaseIds = Array.isArray(body.knowledgeBaseIds)
    ? body.knowledgeBaseIds.filter((item): item is string => typeof item === 'string')
    : [];

  if (action !== 'outline' && action !== 'article' && action !== 'thought') {
    res.status(400).json({ error: 'action 仅支持 outline、article 或 thought' });
    return;
  }

  if (!prompt) {
    res.status(400).json({ error: 'prompt 不能为空' });
    return;
  }

  if (action === 'article' && !outline) {
    res.status(400).json({ error: '生成全文时 outline 不能为空' });
    return;
  }

  const baseUrl = process.env.QWEN_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.QWEN_MODEL || DEFAULT_MODEL;
  const timeoutMs = parseTimeoutMs(
    process.env.QWEN_REQUEST_TIMEOUT_MS,
    DEFAULT_QWEN_TIMEOUT_MS
  );

  try {
    let knowledgeBaseContext: {
      mountedKnowledgeBases: Array<{ key: string; name: string }>;
      contextText: string;
    } = {
      mountedKnowledgeBases: knowledgeBaseIds.map((key) => ({ key, name: key })),
      contextText: '',
    };

    if (knowledgeBaseIds.length > 0) {
      try {
        knowledgeBaseContext = await getKnowledgeBaseContext({
          knowledgeBaseKeys: knowledgeBaseIds,
          query: prompt,
          ...(action === 'outline'
            ? {
                totalTopKOverride: OUTLINE_KB_TOTAL_TOP_K,
                maxContextCharsOverride: OUTLINE_KB_MAX_CONTEXT_CHARS,
                maxChunkCharsOverride: OUTLINE_KB_MAX_CHUNK_CHARS,
              }
            : {}),
        });
      } catch (knowledgeBaseError) {
        const message =
          knowledgeBaseError instanceof Error
            ? knowledgeBaseError.message
            : '知识库检索失败';
        console.error('[write] knowledge base retrieval failed:', message);
      }
    }

    const messages = getMessages(
      action,
      prompt,
      outline,
      phase,
      knowledgeBaseContext.contextText
    );

    let response: Response;
    try {
      response = await requestQwenChatCompletion({
        baseUrl,
        apiKey,
        model,
        messages,
        action,
        shouldStream,
        timeoutMs,
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (action === 'outline' && knowledgeBaseContext.contextText.trim()) {
          try {
            console.warn(
              '[write] outline request timed out with knowledge-base context, retrying without context'
            );
            const fallbackMessages = getMessages(action, prompt, outline, phase, '');
            response = await requestQwenChatCompletion({
              baseUrl,
              apiKey,
              model,
              messages: fallbackMessages,
              action,
              shouldStream,
              timeoutMs,
            });
          } catch (fallbackError) {
            if (isAbortError(fallbackError)) {
              res.status(504).json({ error: `上游模型服务超时（>${timeoutMs}ms）` });
              return;
            }
            throw fallbackError;
          }
        } else {
          res.status(504).json({ error: `上游模型服务超时（>${timeoutMs}ms）` });
          return;
        }
      } else {
        throw error;
      }
    }

    if (!response.ok) {
      const message = await parseErrorResponse(response);
      res.status(response.status).json({ error: message });
      return;
    }

    if (shouldStream && action === 'article') {
      await streamArticleResponse({ res, response, outline });
      return;
    }

    if (shouldStream && action === 'thought') {
      await streamThoughtResponse({ res, response });
      return;
    }

    const data = (await response.json()) as QwenChatResponse;
    const output = extractContent(data);
    const result =
      action === 'outline'
        ? sanitizeOutline(output, prompt)
        : action === 'thought'
        ? sanitizeThought(output)
        : sanitizeArticle(output, outline);

    if (!result) {
      res.status(502).json({ error: '模型未返回有效结果' });
      return;
    }

    res.status(200).json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '写作服务调用失败';
    if (shouldStream) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      writeSseEvent(res, 'error', { error: message });
      res.end();
      return;
    }
    res.status(500).json({ error: message });
  }
}
