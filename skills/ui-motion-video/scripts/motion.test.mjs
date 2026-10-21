import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const helper = fileURLToPath(new URL('./motion.mjs', import.meta.url));
const stub = "console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));process.exitCode=process.argv.includes('--fail')?7:0;";
function fixture(t, legacy = false) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'motion-skill-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const tool = path.join(root, legacy ? 'vision-2027/experiments/sculpture/film/tools/motion.mjs' : 'tools/motion.mjs');
  fs.mkdirSync(path.dirname(tool), { recursive: true });
  fs.writeFileSync(tool, stub);
  const project = path.join(legacy ? path.dirname(path.dirname(tool)) : root, 'projects', 'demo with spaces');
  fs.mkdirSync(path.join(project, 'source'), { recursive: true });
  fs.writeFileSync(path.join(project, 'motion.project.json'), '{}');
  return { root, project, tool };
}
function run(cwd, ...args) {
  return spawnSync(process.execPath, [helper, ...args], { cwd, encoding: 'utf8' });
}

test('relative project resolves against invocation cwd; unrelated arguments retain their meaning', t => {
  const { root, project } = fixture(t);
  const cwd = path.join(root, 'caller'); fs.mkdirSync(cwd);
  const result = run(cwd, 'inspect', '--project', path.relative(cwd, project), '--config', 'local config.json');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { cwd, args: ['inspect', '--project', project, '--config', 'local config.json'] });
});
test('manifest paths containing spaces are passed as one absolute argument', t => {
  const { root, project } = fixture(t);
  const manifest = path.join(project, 'motion.project.json');
  const result = run(root, 'inspect', '--project', manifest);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).args, ['inspect', '--project', manifest]);
});
test('nested scene cwd chooses its own manifest rather than the engine default scene', t => {
  const { project } = fixture(t), cwd = path.join(project, 'source');
  const result = run(cwd, 'check', '--draft');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { cwd, args: ['check', '--draft', '--project', project] });
});
test('checkout cwd keeps the owning tool defaults when there is no scene manifest', t => {
  const { root } = fixture(t);
  const result = run(root, 'inspect');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).args, ['inspect']);
});
test('legacy Agent News engine is discovered without copying it', t => {
  const { root, project } = fixture(t, true);
  const result = run(root, 'inspect', '--project', project);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).args, ['inspect', '--project', project]);
});
test('invalid input and missing engine fail before running another tool', t => {
  const { root } = fixture(t);
  assert.match(run(root, 'inspect', '--project').stderr, /requires a directory or manifest/);
  assert.equal(run(root, 'inspect', '--project', '--draft').status, 1);
  assert.match(run(root, 'inspect', '--project=scene').stderr, /Use --project followed/);
  assert.match(run(root, 'inspect', '--project', 'missing').stderr, /does not exist/);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-no-engine-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  assert.match(run(outside, 'inspect').stderr, /No motion tool found/);
});
test('child command failure is propagated instead of reporting success', t => {
  const { root } = fixture(t);
  assert.equal(run(root, 'inspect', '--fail').status, 7);
});
