#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function ancestors(start) {
  const result = [];
  for (let dir = start; ; dir = path.dirname(dir)) {
    result.push(dir);
    if (path.dirname(dir) === dir) return result;
  }
}

export function resolveInvocation(input, cwd = process.cwd()) {
  const args = [...input];
  if (args.some(arg => arg.startsWith('--project='))) {
    throw new Error('Use --project followed by a directory or manifest path.');
  }
  const at = args.indexOf('--project');
  let project;
  if (at >= 0) {
    if (!args[at + 1] || args[at + 1].startsWith('--')) {
      throw new Error('--project requires a directory or manifest path.');
    }
    project = path.resolve(cwd, args[at + 1]);
    args[at + 1] = project;
  } else {
    const dir = ancestors(path.resolve(cwd)).find(base =>
      fs.existsSync(path.join(base, 'motion.project.json')));
    if (dir) {
      project = dir;
      args.push('--project', project);
    }
  }
  let start = project || path.resolve(cwd);
  if (project) {
    if (!fs.existsSync(project)) throw new Error(`Motion project does not exist: ${project}`);
    if (fs.statSync(project).isFile()) start = path.dirname(project);
  }
  for (const base of ancestors(start)) {
    for (const relative of [
      'tools/motion.mjs',
      'vision-2027/experiments/sculpture/film/tools/motion.mjs',
    ]) {
      const tool = path.join(base, relative);
      if (fs.existsSync(tool) && fs.statSync(tool).isFile()) {
        return { tool, args, cwd };
      }
    }
  }
  throw new Error('No motion tool found. Run from the editor checkout or pass --project /absolute/scene.');
}

function main() {
  let invocation;
  try {
    invocation = resolveInvocation(process.argv.slice(2));
  } catch (error) {
    console.error(`motion: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const child = spawn(process.execPath, [invocation.tool, ...invocation.args], {
    cwd: invocation.cwd,
    stdio: 'inherit',
  });
  child.once('error', error => {
    console.error(`motion: ${error.message}`);
    process.exitCode = 1;
  });
  child.once('close', code => { process.exitCode = code ?? 1; });
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
