export const DEFAULT_MODEL_BASE_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3';
export const DEFAULT_MODEL_NAME = 'glm-5.1';
export const DEFAULT_ROUTE_MODEL_NAME = DEFAULT_MODEL_NAME;
export const MODEL_PROVIDER_NAME = '火山方舟';

const API_KEY_ENV_NAMES = ['ARK_API_KEY', 'VOLCENGINE_API_KEY', 'QWEN_API_KEY'];
const BASE_URL_ENV_NAMES = ['ARK_BASE_URL', 'VOLCENGINE_BASE_URL'];
const MODEL_ENV_NAMES = ['ARK_MODEL', 'VOLCENGINE_MODEL'];
const ROUTE_MODEL_ENV_NAMES = ['COPILOT_ROUTE_MODEL', 'ARK_ROUTE_MODEL', 'VOLCENGINE_ROUTE_MODEL'];
const THINKING_TYPE_ENV_NAMES = ['ARK_THINKING_TYPE', 'VOLCENGINE_THINKING_TYPE'];

function getFirstEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getModelApiKey(): string {
  return getFirstEnv(API_KEY_ENV_NAMES);
}

export function getModelBaseUrl(): string {
  return trimTrailingSlash(getFirstEnv(BASE_URL_ENV_NAMES) || DEFAULT_MODEL_BASE_URL);
}

export function getExecutionModelName(): string {
  return getFirstEnv(MODEL_ENV_NAMES) || DEFAULT_MODEL_NAME;
}

export function getRouteModelName(): string {
  return getFirstEnv(ROUTE_MODEL_ENV_NAMES) || DEFAULT_ROUTE_MODEL_NAME;
}

export function getChatCompletionExtraBody(): Record<string, unknown> {
  const thinkingType = getFirstEnv(THINKING_TYPE_ENV_NAMES) || 'disabled';
  if (!thinkingType || thinkingType === 'default') {
    return {};
  }

  return {
    thinking: {
      type: thinkingType,
    },
  };
}

export function getMissingApiKeyMessage(): string {
  return '服务端未配置 ARK_API_KEY（兼容 VOLCENGINE_API_KEY 或 QWEN_API_KEY）';
}

export function getModelRequestErrorMessage(status: number): string {
  return `${MODEL_PROVIDER_NAME} API 请求失败（${status}）`;
}
