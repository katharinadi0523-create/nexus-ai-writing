type RewriteType = 'continue' | 'polish' | 'expand' | 'custom';

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

interface RewriteBody {
  selectedText?: string;
  type?: RewriteType;
  customPrompt?: string;
}

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen-plus';

function isHeadingLine(text: string): boolean {
  const line = text.trim();
  return /^#{1,6}\s+/.test(line) || /^\d+(\.\d+)+[\s\u3000]+/.test(line);
}

function getRewriteInstruction(type: RewriteType, customPrompt?: string): string {
  switch (type) {
    case 'continue':
      return '在保留原文开头和风格的前提下自然续写，并输出完整续写结果（包含原文）。';
    case 'polish':
      return '在不改变核心信息的前提下润色表达，提升流畅度和可读性。';
    case 'expand':
      return '在保留原意的前提下扩写，补充细节、论据或描写，让内容更饱满。';
    case 'custom':
      return customPrompt?.trim() || '请按用户要求改写。';
    default:
      return '请改写文本。';
  }
}

function extractContent(data: QwenChatResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('').trim();
  }
  return '';
}

function sanitizeRewriteOutput(selectedText: string, output: string): string {
  let cleaned = output.trim();
  if (!cleaned) return cleaned;

  const selectedStartsWithHeading = isHeadingLine(selectedText);
  if (!selectedStartsWithHeading) {
    cleaned = cleaned
      .split('\n')
      .filter((line, index) => (index === 0 ? true : !isHeadingLine(line)))
      .join('\n')
      .trim();

    if (isHeadingLine(cleaned.split('\n')[0] || '')) {
      cleaned = cleaned.split('\n').slice(1).join('\n').trim();
    }
  }

  return cleaned;
}

function getBody(rawBody: unknown): RewriteBody {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as RewriteBody;
    } catch {
      return {};
    }
  }
  return rawBody as RewriteBody;
}

export default async function handler(req: any, res: any) {
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
  const selectedText = body.selectedText?.trim() || '';
  const type = body.type || 'polish';
  const customPrompt = body.customPrompt;

  if (!selectedText) {
    res.status(400).json({ error: 'selectedText 不能为空' });
    return;
  }

  const instruction = getRewriteInstruction(type, customPrompt);
  const messages = [
    {
      role: 'system',
      content:
        '你是专业中文写作编辑。你只能改写用户给出的选中文本，不得新增小节标题、编号、章节名或未选中的事实信息。只输出最终改写文本，不要解释，不要加前后缀，不要使用 markdown 代码块。',
    },
    {
      role: 'user',
      content: `改写要求：${instruction}\n\n硬性约束：\n1) 只改写待改写文本本身\n2) 不得补写标题/编号（如“2.3 ...”）\n3) 不得引入待改写文本之外的新段落主题\n\n待改写文本：\n${selectedText}\n\n请直接输出最终文本。`,
    },
  ];

  const baseUrl = process.env.QWEN_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.QWEN_MODEL || DEFAULT_MODEL;

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
        temperature: 0.7,
      }),
    });

    const data = (await response.json()) as QwenChatResponse;
    if (!response.ok) {
      const message = data.error?.message || `Qwen API 请求失败（${response.status}）`;
      res.status(response.status).json({ error: message });
      return;
    }

    const output = extractContent(data);
    const cleaned = sanitizeRewriteOutput(selectedText, output);
    if (!cleaned) {
      res.status(502).json({ error: '模型未返回有效改写结果' });
      return;
    }

    res.status(200).json({ result: cleaned });
  } catch (error) {
    const message = error instanceof Error ? error.message : '改写服务调用失败';
    res.status(500).json({ error: message });
  }
}
