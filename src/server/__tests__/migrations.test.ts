import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Supabase rejects DELETE and UPDATE statements without a WHERE clause in requests from the
 * site (pg-safeupdate), including inside functions. A plain PostgreSQL test database does not,
 * so check the migrations' source.
 */
const dir = join(__dirname, '../../../supabase/migrations');

describe('SQL-миграции', () => {
  it('нет DELETE и UPDATE без WHERE', () => {
    const offenders: string[] = [];
    for (const file of readdirSync(dir).filter(name => name.endsWith('.sql'))) {
      const sql = readFileSync(join(dir, file), 'utf8').replace(/--[^\n]*/g, '');
      for (const match of sql.matchAll(/\b(delete\s+from|update)\s+[^;]*?;/gi)) {
        const statement = match[0];
        const before = sql.slice(Math.max(0, match.index! - 40), match.index);
        // Not a data change: "for update to ..." in a policy, "on conflict ... do update"
        if (/for\s+$/i.test(before) || /do\s+$/i.test(before)) continue;
        if (!/\bwhere\b/i.test(statement)) offenders.push(`${file}: ${statement.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
