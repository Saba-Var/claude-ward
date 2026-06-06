export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  INFO: 0,
};

export interface McpServerEntry {
  scope: 'global' | 'project';
  project?: string;
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface HookEntry {
  source: 'claude.json' | 'settings' | 'settings.local';
  event: string;
  matcher?: string;
  command: string;
  index: number;
}

export interface PermissionEntry {
  list: 'allow' | 'deny' | 'ask';
  entry: string;
}

export interface EnvEntry {
  key: string;
  value: string;
}

export interface CredentialMeta {
  present: boolean;
  hash?: string;
  mode?: number;
  size?: number;
}

export interface TrackedState {
  mcpServers: McpServerEntry[];
  hooks: HookEntry[];
  plugins: string[];
  marketplaces: string[];
  permissions: PermissionEntry[];
  env: EnvEntry[];
  credentials: CredentialMeta;
}

export type ChangeCategory =
  | 'mcpServer'
  | 'hook'
  | 'plugin'
  | 'marketplace'
  | 'permission'
  | 'env'
  | 'credentials';

export type ChangeKind = 'added' | 'removed' | 'modified';

export interface Change {
  kind: ChangeKind;
  category: ChangeCategory;
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  title: string;
  detail: string;
  change: Change;
}

export interface WardConfig {
  allowedHosts: string[];
  knownMarketplaces: string[];
}

export function emptyState(): TrackedState {
  return {
    mcpServers: [],
    hooks: [],
    plugins: [],
    marketplaces: [],
    permissions: [],
    env: [],
    credentials: { present: false },
  };
}
