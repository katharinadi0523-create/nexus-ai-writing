import type { RewriteType } from '../components/RewriteWindow';

interface RewriteRequest {
  selectedText: string;
  type: RewriteType;
  customPrompt?: string;
}

export async function rewriteWithQwen({
  selectedText,
  type,
  customPrompt,
}: RewriteRequest): Promise<string> {
  const response = await fetch('/api/rewrite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      selectedText,
      type,
      customPrompt,
    }),
  });

  const data = (await response.json()) as { result?: string; error?: string };
  if (!response.ok) {
    const message = data.error || `改写请求失败（${response.status}）`;
    throw new Error(message);
  }

  const output = data.result?.trim() || '';
  if (!output) {
    throw new Error('模型未返回有效改写结果，请重试。');
  }
  return output;
}
