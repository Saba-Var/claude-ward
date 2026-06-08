export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO'

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  INFO: 0,
}

export interface McpServerEntry {
  scope: 'global' | 'project'
  project?: string
  name: string
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
}

export interface HookEntry {
  source: 'claude.json' | 'settings' | 'settings.local'
  event: string
  matcher?: string
  command: string
  index: number
}

export interface PermissionEntry {
  list: 'allow' | 'deny' | 'ask'
  entry: string
}

export interface EnvEntry {
  key: string
  value: string
}

export interface CredentialMeta {
  present: boolean
  hash?: string
  mode?: number
  size?: number
  // Owner of the file. A changed uid/gid (the file now belongs to another
  // account) is a tamper signal worth flagging, unlike a content-only change.
  // Optional so baselines written before this field still load.
  uid?: number
  gid?: number
  // The file exists but could not be read (e.g. permissions dropped to 000).
  // Distinct from absent, so a tamper does not read as a normal logout.
  unreadable?: boolean
}

export interface TrackedState {
  mcpServers: McpServerEntry[]
  hooks: HookEntry[]
  plugins: string[]
  marketplaces: string[]
  permissions: PermissionEntry[]
  env: EnvEntry[]
  credentials: CredentialMeta
}

export type ChangeCategory =
  | 'mcpServer'
  | 'hook'
  | 'plugin'
  | 'marketplace'
  | 'permission'
  | 'env'
  | 'credentials'

export type ChangeKind = 'added' | 'removed' | 'modified'

// A change to one tracked entity. Discriminated on `category` so a rule that
// narrows the category gets the concrete payload type for `before`/`after`
// with no cast. `before` is present for `removed`/`modified`, `after` for
// `added`/`modified`; the union keeps both optional and rules guard on `kind`.
interface ChangeOf<C extends ChangeCategory, V> {
  kind: ChangeKind
  category: C
  // Human-readable location, shown in reports.
  path: string
  // Collision-free identity, set by diff(); rules seed the stable finding id
  // from it so two distinct entities can never share an id. Falls back to
  // `path` when a change is built by hand (tests).
  key?: string
  before?: V
  after?: V
}

export type McpServerChange = ChangeOf<'mcpServer', McpServerEntry>
export type HookChange = ChangeOf<'hook', HookEntry>
export type PluginChange = ChangeOf<'plugin', string>
export type MarketplaceChange = ChangeOf<'marketplace', string>
export type PermissionChange = ChangeOf<'permission', PermissionEntry>
export type EnvChange = ChangeOf<'env', EnvEntry>
export type CredentialsChange = ChangeOf<'credentials', CredentialMeta>

export type Change =
  | McpServerChange
  | HookChange
  | PluginChange
  | MarketplaceChange
  | PermissionChange
  | EnvChange
  | CredentialsChange

// Compile-time exhaustiveness guard. Reaching this at runtime means a new
// union member was added without a matching case; the call site fails to type.
export function assertNever(value: never): never {
  throw new Error(`unhandled case: ${JSON.stringify(value)}`)
}

export interface Finding {
  id: string
  ruleId: string
  severity: Severity
  title: string
  detail: string
  change: Change
}

export interface WardConfig {
  allowedHosts: string[]
  knownMarketplaces: string[]
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
  }
}
