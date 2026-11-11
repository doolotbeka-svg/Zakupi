import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Vercel runs files in api/ as ES modules in Node, which needs file extensions in relative
 * imports ("./x.js"). The test bundler adds them silently, so check the source directly.
 */
const apiDir = join(__dirname, '../../../api');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.ts$/.test(name) ? [path] : [];
  });

describe('серверные функции Vercel', () => {
  it('относительные импорты в api/ указаны с расширением .js', () => {
    const offenders = files(apiDir).flatMap(file =>
      [...readFileSync(file, 'utf8').matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)]
        .map(match => match[1])
        .filter(path => !path.endsWith('.js'))
        .map(path => `${file}: ${path}`)
    );
    expect(offenders).toEqual([]);
  });
});
