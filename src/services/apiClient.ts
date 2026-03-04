const DEFAULT_LOCAL_API_ORIGIN =
  (import.meta.env.VITE_LOCAL_API_ORIGIN as string | undefined)?.trim() ||
  'http://127.0.0.1:3000';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '');
}

function joinUrl(base: string, path: string): string {
  return `${trimTrailingSlash(base)}/${trimLeadingSlash(path)}`;
}

function getConfiguredApiOrigin(): string | null {
  const configured =
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim();

  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return null;
  }

  return trimTrailingSlash(DEFAULT_LOCAL_API_ORIGIN);
}

export function buildApiUrl(path: string): string {
  const origin = getConfiguredApiOrigin();
  if (!origin) {
    return path;
  }

  return joinUrl(origin, path);
}

function getLocalFallbackOrigins(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return [trimTrailingSlash(DEFAULT_LOCAL_API_ORIGIN)];
  }

  if (window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') {
    return [];
  }

  return Array.from(
    new Set(
      [
        `http://${window.location.hostname}:3000`,
        'http://127.0.0.1:3000',
        'http://localhost:3000',
      ]
        .map(trimTrailingSlash)
        .filter((origin) => origin !== trimTrailingSlash(window.location.origin))
    )
  );
}

function getApiCandidates(path: string): string[] {
  const configuredOrigin = getConfiguredApiOrigin();
  if (configuredOrigin) {
    return [joinUrl(configuredOrigin, path)];
  }

  return [path, ...getLocalFallbackOrigins().map((origin) => joinUrl(origin, path))];
}

export async function fetchApi(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const candidates = getApiCandidates(path);
  let lastError: unknown = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const url = candidates[index];

    try {
      const response = await fetch(url, init);
      const isRecoverableNotFound =
        (response.status === 404 || response.status === 405) && index < candidates.length - 1;

      if (isRecoverableNotFound) {
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (index === candidates.length - 1) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) {
    throw new Error(
      `无法连接接口 ${path}。已尝试：${candidates.join(' , ')}。原始错误：${lastError.message}`
    );
  }

  throw new Error(`API 请求失败：${path}`);
}
