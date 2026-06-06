import { loadBaseline, loadWardConfig } from '../io/baseline.js';
import { paths } from '../io/paths.js';

export function statusCommand(): void {
  const baseline = loadBaseline();
  if (!baseline) {
    process.stdout.write('No baseline. Run "claude-ward init".\n');
    return;
  }
  const cfg = loadWardConfig();
  const s = baseline.state;
  process.stdout.write(
    [
      `baseline:        ${paths.baseline}`,
      `created:         ${baseline.createdAt}`,
      `updated:         ${baseline.updatedAt}`,
      `mcp servers:     ${s.mcpServers.length}`,
      `hooks:           ${s.hooks.length}`,
      `plugins:         ${s.plugins.length}`,
      `marketplaces:    ${s.marketplaces.length}`,
      `permissions:     ${s.permissions.length}`,
      `env vars:        ${s.env.length}`,
      `credentials:     ${s.credentials.present ? 'tracked (hash only)' : 'absent'}`,
      `allowed hosts:   ${cfg.allowedHosts.join(', ') || '(none)'}`,
    ].join('\n') + '\n',
  );
}
