import type { RewriteType } from '../components/RewriteWindow';
import { fetchApi } from './apiClient';

interface RewriteRequest {
  selectedText: string;
  type: RewriteType;
  customPrompt?: string;
}

async function parseApiResponse(response: Response): Promise<{ result?: string; error?: string }> {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawText) as { result?: string; error?: string };
  } catch {
    return { error: rawText.trim() };
  }
}

export async function rewriteWithQwen({
  selectedText,
  type,
  customPrompt,
}: RewriteRequest): Promise<string> {
  const response = await fetchApi('/api/rewrite', {
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

  const data = await parseApiResponse(response);
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
