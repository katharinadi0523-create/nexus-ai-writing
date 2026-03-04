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

type CopilotIntent =
  | 'edit'
  | 'qa'
  | 'chat'
  | 'restart'
  | 'agent_write_related'
  | 'agent_write_unrelated';
type CopilotEditStatus = 'ready' | 'needs_clarification';

interface CopilotEditPayload {
  status: CopilotEditStatus;
  sectionTitle?: string;
  targetText?: string;
  replacementText?: string;
}

interface CopilotResponse {
  intent: CopilotIntent;
  reply: string;
  edit?: CopilotEditPayload;
  topic?: string;
}

interface RouteDecision {
  intent: CopilotIntent;
  reply: string;
  topic?: string;
}

interface CopilotBody {
  message?: string;
  document?: string;
  outline?: string;
  title?: string;
  knowledgeBaseIds?: string[];
  mode?: 'general' | 'agent';
  agentContext?: {
    agentName?: string;
    agentDescription?: string;
  };
  history?: Array<{
    role?: 'user' | 'ai';
    content?: string;
  }>;
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

interface DocumentSection {
  title: string;
  path: string;
  text: string;
}

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_EXECUTION_MODEL = 'qwen-plus';
const DEFAULT_ROUTE_MODEL = 'qwen-turbo';
const DEFAULT_ROUTE_REPLY = '我先判断一下你的意图。';
const DEFAULT_RESTART_REPLY = '可以，我会按这个新主题重新开始生成。';
const DEFAULT_AGENT_RELATED_REPLY = '我将使用当前智能体继续生成这个主题。';

function getKnowledgeBaseBudgetByIntent(intent: CopilotIntent): {
  totalTopK: number;
  maxContextChars: number;
  maxChunkChars: number;
} {
  if (intent === 'edit') {
    return {
      totalTopK: 2,
      maxContextChars: 2200,
      maxChunkChars: 760,
    };
  }

  if (intent === 'qa') {
    return {
      totalTopK: 3,
      maxContextChars: 3000,
      maxChunkChars: 900,
    };
  }

  return {
    totalTopK: 2,
    maxContextChars: 2200,
    maxChunkChars: 760,
  };
}

function getBody(rawBody: unknown): CopilotBody {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as CopilotBody;
    } catch {
      return {};
    }
  }
  return rawBody as CopilotBody;
}

function extractContent(data: QwenChatResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('').trim();
  }
  return '';
}

function stripCodeFence(text: string): string {
  return text
    .replace(/```(?:json|markdown|md)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function extractJsonObject(raw: string): string {
  const cleaned = stripCodeFence(raw);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return cleaned;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function normalizeIntent(intent: unknown): CopilotIntent | null {
  if (
    intent === 'edit' ||
    intent === 'qa' ||
    intent === 'chat' ||
    intent === 'restart' ||
    intent === 'agent_write_related' ||
    intent === 'agent_write_unrelated'
  ) {
    return intent;
  }
  return null;
}

function normalizeEditPayload(rawEdit: unknown): CopilotEditPayload | undefined {
  if (!rawEdit || typeof rawEdit !== 'object') {
    return undefined;
  }

  const edit = rawEdit as Record<string, unknown>;
  const status =
    edit.status === 'ready' || edit.status === 'needs_clarification'
      ? (edit.status as CopilotEditStatus)
      : undefined;

  if (!status) {
    return undefined;
  }

  return {
    status,
    sectionTitle: typeof edit.sectionTitle === 'string' ? edit.sectionTitle.trim() : undefined,
    targetText: typeof edit.targetText === 'string' ? edit.targetText : undefined,
    replacementText: typeof edit.replacementText === 'string' ? edit.replacementText : undefined,
  };
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。；：！？、“”‘’（）()【】《》,.!?;:'"]/g, '');
}

function extractSectionReferences(text: string): string[] {
  const refs = new Set<string>();

  for (const match of text.match(/\d+(?:\.\d+)+/g) || []) {
    const normalized = match.trim();
    if (!normalized) {
      continue;
    }
    refs.add(normalized);
    refs.add(normalized.replace(/\./g, ''));
  }

  for (const match of text.match(/第\s*\d+\s*[章节部分节篇]/g) || []) {
    const normalized = match.replace(/\s+/g, '');
    if (normalized) {
      refs.add(normalized);
    }
  }

  for (const match of text.match(/[一二三四五六七八九十百千万]+、/g) || []) {
    const normalized = match.trim();
    if (normalized) {
      refs.add(normalized);
    }
  }

  return Array.from(refs);
}

function sanitizeRouteDecision(
  rawText: string,
  mode: 'general' | 'agent',
  agentName: string
): RouteDecision | null {
  try {
    const parsed = JSON.parse(extractJsonObject(rawText)) as Record<string, unknown>;
    const intent = normalizeIntent(parsed.intent);
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    const topic = typeof parsed.topic === 'string' ? parsed.topic.trim() : '';

    if (!intent) {
      return null;
    }

    if (mode === 'general' && (intent === 'agent_write_related' || intent === 'agent_write_unrelated')) {
      return null;
    }

    if ((intent === 'agent_write_related' || intent === 'agent_write_unrelated') && !topic) {
      return {
        intent: 'chat',
        reply: '你想写的主题我还没提取清楚，请直接说要写什么主题。',
      };
    }

    const fallbackReply =
      intent === 'restart'
        ? DEFAULT_RESTART_REPLY
        : intent === 'agent_write_related'
        ? DEFAULT_AGENT_RELATED_REPLY
        : intent === 'agent_write_unrelated'
        ? `这个主题更适合通用智能体；如果你仍想使用当前智能体《${agentName || '当前智能体'}》，我也可以继续生成。`
        : DEFAULT_ROUTE_REPLY;

    return {
      intent,
      reply: reply || fallbackReply,
      topic: topic || undefined,
    };
  } catch {
    return null;
  }
}

function sanitizeCopilotResponse(rawText: string): CopilotResponse | null {
  try {
    const parsed = JSON.parse(extractJsonObject(rawText)) as Record<string, unknown>;
    const intent = normalizeIntent(parsed.intent);
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    const edit = normalizeEditPayload(parsed.edit);
    const topic = typeof parsed.topic === 'string' ? parsed.topic.trim() : '';

    if (!intent || !reply) {
      return null;
    }

    if (intent === 'agent_write_related' || intent === 'agent_write_unrelated') {
      if (!topic) {
        return {
          intent: 'chat',
          reply: '你想写的主题我还没提取清楚，请直接说要写什么主题。',
        };
      }

      return {
        intent,
        reply,
        topic,
      };
    }

    if (intent !== 'edit') {
      return { intent, reply };
    }

    if (!edit) {
      return {
        intent: 'edit',
        reply,
        edit: {
          status: 'needs_clarification',
        },
      };
    }

    if (
      edit.status === 'ready' &&
      (!edit.targetText?.trim() || typeof edit.replacementText !== 'string')
    ) {
      return {
        intent: 'edit',
        reply: '我还不能稳定定位到唯一修改位置，请你再说具体段落或贴出原句。',
        edit: {
          status: 'needs_clarification',
        },
      };
    }

    return {
      intent: 'edit',
      reply,
      edit,
    };
  } catch {
    return null;
  }
}

function validateEditResponseAgainstDocument(
  result: CopilotResponse,
  document: string
): CopilotResponse {
  if (result.intent !== 'edit' || result.edit?.status !== 'ready') {
    return result;
  }

  const targetText = result.edit.targetText?.trim() || '';
  if (!targetText || !document.includes(targetText)) {
    return {
      intent: 'edit',
      reply: '我还不能稳定定位到唯一修改位置，请再说具体章节名，或者直接贴出要修改的原句。',
      edit: {
        status: 'needs_clarification',
      },
    };
  }

  return result;
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as QwenChatResponse;
    return data.error?.message || `Qwen API 请求失败（${response.status}）`;
  } catch {
    return `Qwen API 请求失败（${response.status}）`;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function buildHistoryText(history: CopilotBody['history']): string {
  if (!history?.length) {
    return '（无）';
  }

  const normalized = history
    .filter((item) => typeof item?.content === 'string' && item.content.trim())
    .slice(-4)
    .map((item) => `${item?.role === 'ai' ? '助手' : '用户'}：${item?.content?.trim()}`);

  return normalized.length > 0 ? normalized.join('\n') : '（无）';
}

function buildStructureSummary(outline: string, document: string): string {
  const source = outline.trim() || document;
  const headings = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 16);

  const intro = document
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line))
    .slice(0, 2)
    .join(' ');

  if (headings.length === 0 && !intro) {
    return '（无）';
  }

  const parts: string[] = [];
  if (headings.length > 0) {
    parts.push(headings.map((heading, index) => `${index + 1}. ${heading}`).join('\n'));
  }
  if (intro) {
    parts.push(`文档开头：${truncateText(intro, 180)}`);
  }

  return parts.join('\n');
}

function splitDocumentIntoSections(document: string): DocumentSection[] {
  const lines = document.split(/\r?\n/);
  const sections: DocumentSection[] = [];
  const headingStack: string[] = [];
  let currentTitle = '文档开头';
  let currentPath = '文档开头';
  let buffer: string[] = [];
  let seenHeading = false;

  const flushBuffer = () => {
    const text = buffer.join('\n').trim();
    if (!text) {
      buffer = [];
      return;
    }

    sections.push({
      title: currentTitle,
      path: currentPath,
      text,
    });
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushBuffer();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      headingStack.splice(level - 1);
      headingStack[level - 1] = title;
      currentTitle = title;
      currentPath = headingStack.filter(Boolean).join(' > ');
      buffer.push(line);
      seenHeading = true;
      continue;
    }

    if (!seenHeading) {
      currentTitle = '文档开头';
      currentPath = '文档开头';
    }
    buffer.push(line);
  }

  flushBuffer();

  if (sections.length > 0) {
    return sections;
  }

  const paragraphs = document
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph, index) => ({
    title: `文档片段 ${index + 1}`,
    path: `文档片段 ${index + 1}`,
    text: paragraph,
  }));
}

function extractSearchTokens(text: string): string[] {
  const tokenSet = new Set<string>();

  for (const ref of extractSectionReferences(text)) {
    const normalized = ref.toLowerCase().trim();
    if (normalized.length >= 2) {
      tokenSet.add(normalized);
    }
  }

  const matches = text.match(/[A-Za-z0-9]+|[\u4e00-\u9fff]+/g) || [];

  for (const match of matches) {
    const normalized = match.toLowerCase().trim();
    if (!normalized) {
      continue;
    }

    if (/^[a-z0-9]+$/.test(normalized)) {
      if (normalized.length >= 2) {
        tokenSet.add(normalized);
      }
      continue;
    }

    if (normalized.length <= 2) {
      tokenSet.add(normalized);
      continue;
    }

    for (let index = 0; index < normalized.length - 1; index += 1) {
      tokenSet.add(normalized.slice(index, index + 2));
    }
  }

  return Array.from(tokenSet).slice(0, 24);
}

function countOccurrences(text: string, token: string): number {
  if (!token) {
    return 0;
  }

  let count = 0;
  let fromIndex = 0;
  while (fromIndex <= text.length - token.length) {
    const foundIndex = text.indexOf(token, fromIndex);
    if (foundIndex === -1) {
      break;
    }
    count += 1;
    fromIndex = foundIndex + token.length;
  }
  return count;
}

function selectRelevantContext(
  document: string,
  query: string,
  maxSections = 4,
  maxChars = 4200,
  truncateSectionChars = 1600
): string {
  if (!document.trim()) {
    return '（无文档内容）';
  }

  if (document.length <= maxChars) {
    return `【全文】\n${document.trim()}`;
  }

  const sections = splitDocumentIntoSections(document);
  const tokens = extractSearchTokens(query);
  const scoredSections = sections
    .map((section, index) => {
      const haystack = `${section.path}\n${section.text}`.toLowerCase();
      let score = 0;

      for (const token of tokens) {
        const occurrences = countOccurrences(haystack, token);
        if (occurrences === 0) {
          continue;
        }

        const pathOccurrences = countOccurrences(section.path.toLowerCase(), token);
        score += occurrences + pathOccurrences * 2;
      }

      return {
        index,
        section,
        score,
      };
    })
    .sort((left, right) => {
      if (right.score === left.score) {
        return left.index - right.index;
      }
      return right.score - left.score;
    });

  const chosenSections: DocumentSection[] = [];
  let totalChars = 0;

  for (const item of scoredSections) {
    if (chosenSections.length >= maxSections) {
      break;
    }

    const sectionText = item.section.text.trim();
    if (!sectionText) {
      continue;
    }

    if (totalChars > 0 && totalChars + sectionText.length > maxChars) {
      continue;
    }

    chosenSections.push(item.section);
    totalChars += sectionText.length;
  }

  if (chosenSections.length === 0) {
    chosenSections.push(...sections.slice(0, Math.min(maxSections, sections.length)));
  }

  return chosenSections
    .map(
      (section, index) =>
        `【候选片段 ${index + 1}】\n章节：${section.path}\n${
          truncateSectionChars > 0
            ? truncateText(section.text.trim(), truncateSectionChars)
            : section.text.trim()
        }`
    )
    .join('\n\n');
}

function stripEditInstructionText(text: string): string {
  return text
    .replace(/请/g, '')
    .replace(/帮我/g, '')
    .replace(/帮忙/g, '')
    .replace(/把/g, '')
    .replace(/将/g, '')
    .replace(/对/g, '')
    .replace(/这个段落/g, '')
    .replace(/这一段/g, '')
    .replace(/这段/g, '')
    .replace(/这个章节/g, '')
    .replace(/这部分/g, '')
    .replace(/段落/g, '')
    .replace(/章节/g, '')
    .replace(/内容/g, '')
    .replace(/扩写一下/g, '')
    .replace(/扩写/g, '')
    .replace(/改写一下/g, '')
    .replace(/改写/g, '')
    .replace(/润色一下/g, '')
    .replace(/润色/g, '')
    .replace(/精简一下/g, '')
    .replace(/精简/g, '')
    .replace(/补充一下/g, '')
    .replace(/补充/g, '')
    .replace(/优化一下/g, '')
    .replace(/优化/g, '')
    .replace(/重写一下/g, '')
    .replace(/重写/g, '')
    .replace(/一下/g, '')
    .replace(/一下子/g, '')
    .replace(/一下吧/g, '')
    .replace(/一下哦/g, '')
    .replace(/\s+/g, '');
}

function scoreSectionTitleMatch(query: string, section: DocumentSection): number {
  const strippedQuery = stripEditInstructionText(query);
  const normalizedQuery = normalizeForCompare(strippedQuery);
  const normalizedTitle = normalizeForCompare(section.title);
  const normalizedPath = normalizeForCompare(section.path);
  const queryRefs = extractSectionReferences(strippedQuery);
  const titleRefs = new Set(extractSectionReferences(section.title));
  const pathRefs = new Set(extractSectionReferences(section.path));

  if (!normalizedQuery || !normalizedTitle) {
    return 0;
  }

  for (const ref of queryRefs) {
    if (titleRefs.has(ref)) {
      return 2000 + ref.length;
    }
    if (pathRefs.has(ref)) {
      return 1800 + ref.length;
    }
  }

  if (normalizedQuery.includes(normalizedTitle)) {
    return 1000 + normalizedTitle.length;
  }

  if (normalizedTitle.includes(normalizedQuery) && normalizedQuery.length >= 4) {
    return 900 + normalizedQuery.length;
  }

  let score = 0;
  for (let index = 0; index < normalizedQuery.length - 1; index += 1) {
    const token = normalizedQuery.slice(index, index + 2);
    if (!token) {
      continue;
    }
    if (normalizedTitle.includes(token)) {
      score += 3;
    }
    if (normalizedPath.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function findExplicitSectionMatch(document: string, query: string): DocumentSection | null {
  const sections = splitDocumentIntoSections(document);
  if (sections.length === 0) {
    return null;
  }

  const scored = sections
    .map((section) => ({
      section,
      score: scoreSectionTitleMatch(query, section),
    }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best || best.score < 8) {
    return null;
  }

  return best.section;
}

function buildGeneralRouteMessages({
  message,
  title,
  structureSummary,
  history,
}: {
  message: string;
  title: string;
  structureSummary: string;
  history: string;
}) {
  return [
    {
      role: 'system',
      content:
        '你是中文写作工作台里的轻量级意图路由器。你只能输出一个合法 JSON 对象，不要输出 JSON 之外的任何文字。' +
        '返回格式必须是：' +
        '{"intent":"edit|qa|chat|restart","reply":"一句简短中文回复","topic":"仅 intent=restart 时必填"}。' +
        '规则：' +
        '1) 你只根据用户新消息、文档标题、结构摘要和最近对话进行快速判断，不要尝试阅读全文细节；' +
        '2) restart 只在用户明确要重新写一篇、换主题、重来、另写新文章时使用；' +
        '3) edit 用于修改当前文档；qa 用于询问当前文档内容；chat 用于闲聊、致谢、确认、寒暄；' +
        '4) topic 仅在 restart 时填写提炼后的新写作主题，不要保留“帮我写、再写一篇”等措辞；' +
        '5) reply 必须简短自然。对 edit/qa 只需一句简短说明，对 restart/chat 给用户一句可直接展示的话。',
    },
    {
      role: 'user',
      content: `用户新消息：\n${message}\n\n当前文档标题：\n${title || '（无标题）'}\n\n当前文档结构摘要：\n${
        structureSummary || '（无）'
      }\n\n最近对话：\n${history}\n\n请严格输出 JSON。`,
    },
  ];
}

function buildAgentRouteMessages({
  message,
  title,
  structureSummary,
  history,
  agentName,
  agentDescription,
}: {
  message: string;
  title: string;
  structureSummary: string;
  history: string;
  agentName: string;
  agentDescription: string;
}) {
  return [
    {
      role: 'system',
      content:
        '你是中文写作工作台里的轻量级智能体意图路由器。你只能输出一个合法 JSON 对象，不要输出 JSON 之外的任何文字。' +
        '返回格式必须是：' +
        '{"intent":"agent_write_related|agent_write_unrelated|edit|qa|chat","reply":"一句简短中文回复","topic":"当 intent 为 agent_write_related 或 agent_write_unrelated 时必填"}。' +
        '规则：' +
        `1) 当前智能体名称是《${agentName}》，能力描述是：${agentDescription || '（无）'}；` +
        '2) 你只根据用户新消息、智能体描述、当前文档标题、结构摘要和最近对话做快速判断，不要尝试阅读全文细节；' +
        '3) 如果用户想基于当前智能体再写一篇新文档，且主题仍属于该智能体能力范围，用 agent_write_related；' +
        '4) 如果用户想写的新主题明显不属于该智能体能力范围，用 agent_write_unrelated；' +
        '5) 如果用户是在修改当前文档，用 edit；如果是在询问当前文档内容，用 qa；如果只是闲聊、感谢、确认，用 chat；' +
        '6) topic 仅在写作相关 intent 时填写提炼后的写作主题；' +
        '7) reply 必须简短自然。对于 agent_write_unrelated，需要明确提示这个主题更适合通用智能体。',
    },
    {
      role: 'user',
      content: `用户新消息：\n${message}\n\n当前智能体：\n${agentName}\n\n智能体描述：\n${
        agentDescription || '（无）'
      }\n\n当前文档标题：\n${title || '（无标题）'}\n\n当前文档结构摘要：\n${
        structureSummary || '（无）'
      }\n\n最近对话：\n${history}\n\n请严格输出 JSON。`,
    },
  ];
}

function buildKnowledgeBasePromptBlock(contextText: string): string {
  if (!contextText.trim()) {
    return '当前未挂载知识库，或本次外挂知识库检索未命中有效片段。';
  }

  return [
    '当前外挂知识库召回片段：',
    contextText,
    '',
    '使用要求：',
    '1) 优先依据这些片段回答事实性问题或补充背景。',
    '2) 若片段不足，不要虚构细节。',
    '3) 修改当前文档时，定位与替换对象仍必须来自当前文档本身。',
  ].join('\n');
}

function buildQaExecutionMessages({
  message,
  title,
  structureSummary,
  context,
  knowledgeBaseContext,
}: {
  message: string;
  title: string;
  structureSummary: string;
  context: string;
  knowledgeBaseContext: string;
}) {
  return [
    {
      role: 'system',
      content:
        '你是中文写作工作台里的文档问答助手。你可以结合当前文档片段和外挂知识库片段回答问题；如果两者都不足以支撑答案，必须明确说明当前信息不足。不要编造，不要输出代码块。',
    },
    {
      role: 'user',
      content: `用户问题：\n${message}\n\n当前文档标题：\n${title || '（无标题）'}\n\n文档结构摘要：\n${
        structureSummary || '（无）'
      }\n\n相关文档片段：\n${context}\n\n${buildKnowledgeBasePromptBlock(
        knowledgeBaseContext
      )}\n\n请直接回答用户问题。`,
    },
  ];
}

function buildEditExecutionMessages({
  message,
  title,
  structureSummary,
  context,
  knowledgeBaseContext,
}: {
  message: string;
  title: string;
  structureSummary: string;
  context: string;
  knowledgeBaseContext: string;
}) {
  return [
    {
      role: 'system',
      content:
        '你是中文写作工作台里的文档编辑助手。你只能根据提供的候选文档片段定位和改写内容。你只能输出一个合法 JSON 对象，不要输出 JSON 之外的任何文字。' +
        '返回格式必须是：' +
        '{"intent":"edit","reply":"给用户显示的话","edit":{"status":"ready|needs_clarification","sectionTitle":"可选","targetText":"ready 时必填","replacementText":"ready 时必填"}}。' +
        '规则：' +
        '1) targetText 必须逐字逐句拷贝自候选文档片段，且必须是一个连续片段；' +
        '2) replacementText 只输出替换后的新片段，不要输出整篇文章；' +
        '3) 如果不能稳定定位唯一位置，edit.status 必须是 needs_clarification，reply 里只问一个简短澄清问题；' +
        '4) 可以参考外挂知识库片段补充术语或事实，但不得把外挂知识库片段当作 targetText；' +
        '5) 不得引入候选片段之外的章节标题或额外说明。',
    },
    {
      role: 'user',
      content: `用户修改请求：\n${message}\n\n当前文档标题：\n${title || '（无标题）'}\n\n文档结构摘要：\n${
        structureSummary || '（无）'
      }\n\n候选文档片段：\n${context}\n\n${buildKnowledgeBasePromptBlock(
        knowledgeBaseContext
      )}\n\n请严格输出 JSON。`,
    },
  ];
}

function buildLockedEditRewriteMessages({
  message,
  title,
  section,
  knowledgeBaseContext,
}: {
  message: string;
  title: string;
  section: DocumentSection;
  knowledgeBaseContext: string;
}) {
  return [
    {
      role: 'system',
      content:
        '你是中文写作工作台里的文档改写助手。用户已经明确指定了要修改的章节，你不需要再做定位。' +
        '你只能基于给定原文片段进行改写或扩写。只输出改写后的最终文本，不要输出 JSON，不要解释，不要加前后缀，不要使用代码块。' +
        '如果原文片段第一行是 Markdown 标题，请保留这行标题并只改写标题下的正文内容。' +
        '若外挂知识库片段提供了更准确的术语或事实，可以吸收，但不要照搬外挂知识库原文。',
    },
    {
      role: 'user',
      content: `用户修改请求：\n${message}\n\n当前文档标题：\n${title || '（无标题）'}\n\n已锁定章节：\n${
        section.path
      }\n\n原文片段：\n${section.text}\n\n${buildKnowledgeBasePromptBlock(
        knowledgeBaseContext
      )}\n\n请直接输出改写后的最终片段。`,
    },
  ];
}

function buildChatExecutionMessages({
  message,
  title,
  structureSummary,
  context,
  knowledgeBaseContext,
}: {
  message: string;
  title: string;
  structureSummary: string;
  context: string;
  knowledgeBaseContext: string;
}) {
  return [
    {
      role: 'system',
      content:
        '你是中文写作工作台里的通用助手。你可以结合当前文档片段和外挂知识库片段回复用户。若用户只是确认、感谢或闲聊，回复保持简短自然；若涉及事实或写作建议，优先依据给定片段回答。不要编造，不要输出代码块。',
    },
    {
      role: 'user',
      content: `用户消息：\n${message}\n\n当前文档标题：\n${title || '（无标题）'}\n\n文档结构摘要：\n${
        structureSummary || '（无）'
      }\n\n相关文档片段：\n${context}\n\n${buildKnowledgeBasePromptBlock(
        knowledgeBaseContext
      )}\n\n请直接回复用户。`,
    },
  ];
}

async function requestModelOutput({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
}): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response);
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as QwenChatResponse;
  const output = extractContent(data);
  if (!output) {
    throw new Error('模型未返回有效结果');
  }

  return output;
}

async function requestRouteDecision({
  baseUrl,
  apiKey,
  routeModel,
  fallbackModel,
  messages,
  mode,
  agentName,
}: {
  baseUrl: string;
  apiKey: string;
  routeModel: string;
  fallbackModel: string;
  messages: Array<{ role: string; content: string }>;
  mode: 'general' | 'agent';
  agentName: string;
}): Promise<RouteDecision> {
  try {
    const output = await requestModelOutput({
      baseUrl,
      apiKey,
      model: routeModel,
      messages,
      temperature: 0,
    });
    const result = sanitizeRouteDecision(output, mode, agentName);
    if (!result) {
      throw new Error('轻量路由返回格式异常');
    }
    return result;
  } catch (error) {
    if (routeModel === fallbackModel) {
      throw error;
    }

    const output = await requestModelOutput({
      baseUrl,
      apiKey,
      model: fallbackModel,
      messages,
      temperature: 0,
    });
    const result = sanitizeRouteDecision(output, mode, agentName);
    if (!result) {
      throw new Error('轻量路由返回格式异常');
    }
    return result;
  }
}

function sanitizePlainReply(text: string): string {
  return stripCodeFence(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function sanitizeRewriteSection(text: string): string {
  return stripCodeFence(text).trim();
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
  const message = body.message?.trim() || '';
  const document = body.document?.trim() || '';
  const outline = body.outline?.trim() || '';
  const title = body.title?.trim() || '';
  const knowledgeBaseIds = Array.isArray(body.knowledgeBaseIds)
    ? body.knowledgeBaseIds.filter((item): item is string => typeof item === 'string')
    : [];
  const mode = body.mode === 'agent' ? 'agent' : 'general';
  const agentName = body.agentContext?.agentName?.trim() || '当前智能体';
  const agentDescription = body.agentContext?.agentDescription?.trim() || '';
  const history = buildHistoryText(body.history);

  if (!message) {
    res.status(400).json({ error: 'message 不能为空' });
    return;
  }

  if (!document) {
    res.status(400).json({ error: 'document 不能为空' });
    return;
  }

  const baseUrl = process.env.QWEN_BASE_URL || DEFAULT_BASE_URL;
  const executionModel = process.env.QWEN_MODEL || DEFAULT_EXECUTION_MODEL;
  const routeModel =
    process.env.COPILOT_ROUTE_MODEL || process.env.QWEN_ROUTE_MODEL || DEFAULT_ROUTE_MODEL;
  const structureSummary = buildStructureSummary(outline, document);
  const routeMessages =
    mode === 'agent'
      ? buildAgentRouteMessages({
          message,
          title,
          structureSummary,
          history,
          agentName,
          agentDescription,
        })
      : buildGeneralRouteMessages({
          message,
          title,
          structureSummary,
          history,
        });

  try {
    const routeDecision = await requestRouteDecision({
      baseUrl,
      apiKey,
      routeModel,
      fallbackModel: executionModel,
      messages: routeMessages,
      mode,
      agentName,
    });

    if (
      routeDecision.intent === 'restart' ||
      routeDecision.intent === 'agent_write_related' ||
      routeDecision.intent === 'agent_write_unrelated'
    ) {
      res.status(200).json(routeDecision);
      return;
    }

    const knowledgeBaseContext =
      mode === 'general'
        ? await (() => {
            const knowledgeBaseBudget = getKnowledgeBaseBudgetByIntent(routeDecision.intent);
            return Promise.resolve({
              mountedKnowledgeBases: knowledgeBaseIds.map((key) => ({ key, name: key })),
              contextText: '',
              budget: knowledgeBaseBudget,
            });
          })()
        : {
            mountedKnowledgeBases: [],
            contextText: '',
          };

    if (routeDecision.intent === 'chat') {
      if (mode !== 'general' || knowledgeBaseIds.length === 0) {
        res.status(200).json(routeDecision);
        return;
      }

      const chatContext = selectRelevantContext(
        document,
        `${message}\n${title}\n${outline}`,
        3,
        3200,
        1200
      );
      const chatOutput = await requestModelOutput({
        baseUrl,
        apiKey,
        model: executionModel,
        messages: buildChatExecutionMessages({
          message,
          title,
          structureSummary,
          context: chatContext,
          knowledgeBaseContext: knowledgeBaseContext.contextText,
        }),
        temperature: 0.4,
      });

      res.status(200).json({
        intent: 'chat',
        reply: sanitizePlainReply(chatOutput) || routeDecision.reply,
      });
      return;
    }

    if (routeDecision.intent === 'edit') {
      const lockedSection = findExplicitSectionMatch(document, message);

      if (lockedSection) {
        const rewrittenOutput = await requestModelOutput({
          baseUrl,
          apiKey,
          model: executionModel,
          messages: buildLockedEditRewriteMessages({
            message,
            title,
            section: lockedSection,
            knowledgeBaseContext: knowledgeBaseContext.contextText,
          }),
          temperature: 0.4,
        });

        const replacementText = sanitizeRewriteSection(rewrittenOutput);
        if (!replacementText) {
          res.status(502).json({ error: '编辑执行阶段未返回有效改写结果' });
          return;
        }

        res.status(200).json({
          intent: 'edit',
          reply: '我已定位到对应段落，请确认是否接受这次修改。',
          edit: {
            status: 'ready',
            sectionTitle: lockedSection.title,
            targetText: lockedSection.text,
            replacementText,
          },
        });
        return;
      }
    }

    const relevantContext = selectRelevantContext(
      document,
      `${message}\n${title}\n${outline}`,
      routeDecision.intent === 'edit' ? 3 : 4,
      routeDecision.intent === 'edit' ? 3600 : 4200,
      routeDecision.intent === 'edit' ? 1400 : 1600
    );

    if (routeDecision.intent === 'qa') {
      const qaOutput = await requestModelOutput({
        baseUrl,
        apiKey,
        model: executionModel,
        messages: buildQaExecutionMessages({
          message,
          title,
          structureSummary,
          context: relevantContext,
          knowledgeBaseContext: knowledgeBaseContext.contextText,
        }),
        temperature: 0.3,
      });

      const reply = sanitizePlainReply(qaOutput);
      if (!reply) {
        res.status(502).json({ error: '问答执行阶段未返回有效结果' });
        return;
      }

      res.status(200).json({
        intent: 'qa',
        reply,
      });
      return;
    }

    const editOutput = await requestModelOutput({
      baseUrl,
      apiKey,
      model: executionModel,
      messages: buildEditExecutionMessages({
        message,
        title,
        structureSummary,
        context: relevantContext,
        knowledgeBaseContext: knowledgeBaseContext.contextText,
      }),
      temperature: 0.2,
    });

    const editResult = sanitizeCopilotResponse(editOutput);
    if (!editResult || editResult.intent !== 'edit') {
      res.status(502).json({ error: '编辑执行阶段返回格式异常' });
      return;
    }

    res.status(200).json(validateEditResponseAgainstDocument(editResult, document));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Copilot 服务调用失败';
    res.status(500).json({ error: messageText });
  }
}
