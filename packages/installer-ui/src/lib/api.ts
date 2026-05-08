export interface ProviderInfo {
  id: string;
  label: string;
  description: string;
  baseUrl?: string;
  type: 'openai-compatible' | 'native';
  defaultModel: string;
  modelsEndpoint?: string;
  isDefault?: boolean;
  docsUrl: string;
}

export interface InstallerState {
  platform: 'darwin' | 'linux' | 'windows';
  goVersion: string;
  configPath: string;
  mode: 'install' | 'settings';
  existingConfig: unknown;
}

function token(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('t') ?? '';
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-OC-Token': token(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const Api = {
  state: () => api<InstallerState>('/api/state'),
  providers: () => api<{ providers: ProviderInfo[] }>('/api/providers'),
  testKey: (provider: string, apiKey: string) =>
    api<{ ok: boolean; verified?: boolean; status?: number; error?: string; reason?: string }>(
      '/api/providers/test-key',
      { method: 'POST', body: JSON.stringify({ provider, apiKey }) },
    ),
};

export interface PipelineEvent {
  type: 'step' | 'log' | 'done';
  step?: string;
  status?: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  level?: 'info' | 'warn' | 'error';
  message?: string;
  ok?: boolean;
  summary?: Record<string, unknown>;
  timestamp?: number;
}

export async function streamInstall(
  body: unknown,
  onEvent: (e: PipelineEvent) => void,
): Promise<void> {
  const res = await fetch('/api/install', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OC-Token': token(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`install start failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as PipelineEvent);
      } catch {
        // ignore partial frame
      }
    }
  }
}
