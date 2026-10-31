import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export function loadLocalEnv({ createIfMissing = true } = {}) {
  process.chdir(projectRoot);
  const envPath = path.join(projectRoot, '.env');
  const examplePath = path.join(projectRoot, '.env.example');

  if (!fs.existsSync(envPath)) {
    if (createIfMissing && fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log('Created .env from .env.example (local-development values).');
    } else {
      throw new Error('Missing .env. Copy .env.example to .env and configure it.');
    }
  }

  try {
    process.loadEnvFile(envPath);
  } catch {
    throw new Error(`Could not load ${envPath}.`);
  }
}

export function requireTools() {
  const checks = [
    ['node', ['--version']],
    ['npm', ['--version']],
    ['docker', ['--version']],
    ['docker', ['compose', 'version']],
  ];

  for (const [command, args] of checks) {
    const result = spawnSync(command, args, { encoding: 'utf8', shell: process.platform === 'win32' });
    if (result.status !== 0) {
      throw new Error(
        `Required tool unavailable: ${command} ${args.join(' ')}. Install it and reopen the terminal.`,
      );
    }
  }
}

export function runCommand(command, args, { allowFailure = false, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
  return result;
}

export function runQuiet(command, args) {
  // Do not use a shell here. With shell:true on Windows, Node rebuilds the
  // command line without preserving argument quoting, so values such as
  // "SELECT release_version FROM system.local" are split into separate args.
  return spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

export function composeUp() {
  console.log('Starting MongoDB and Cassandra containers...');
  runCommand('docker', ['compose', 'up', '-d']);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForMongo({ attempts = 60 } = {}) {
  const username = process.env.MONGO_ROOT_USERNAME || 'quickbite';
  const password = process.env.MONGO_ROOT_PASSWORD || 'quickbite_dev_password';
  const args = [
    'compose',
    'exec',
    '-T',
    'mongo',
    'mongosh',
    '--quiet',
    '--username',
    username,
    '--password',
    password,
    '--authenticationDatabase',
    'admin',
    '--eval',
    "db.adminCommand('ping').ok",
  ];

  process.stdout.write('Waiting for MongoDB');
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = runQuiet('docker', args);
    if (result.status === 0 && result.stdout.includes('1')) {
      process.stdout.write(' ready\n');
      return;
    }
    process.stdout.write('.');
    await sleep(2000);
  }
  process.stdout.write('\n');
  throw new Error('MongoDB did not become ready. Run: docker compose logs mongo');
}

export async function waitForCassandra({ attempts = 150 } = {}) {
  process.stdout.write('Waiting for Cassandra (first startup can take a minute)');
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = runQuiet('docker', [
      'compose',
      'exec',
      '-T',
      'cassandra',
      'cqlsh',
      '-e',
      'SELECT release_version FROM system.local',
    ]);
    if (result.status === 0 && result.stdout.includes('release_version')) {
      process.stdout.write(' ready\n');
      return;
    }
    process.stdout.write('.');
    await sleep(3000);
  }
  process.stdout.write('\n');
  throw new Error('Cassandra did not become ready. Run: docker compose logs cassandra');
}

export async function waitForDatabases() {
  await waitForMongo();
  await waitForCassandra();
}

export function initializeDatabases({ seed = false } = {}) {
  console.log('Ensuring MongoDB indexes and Cassandra schema...');
  runCommand(npmCommand, ['--prefix', 'backend', 'run', 'db:init']);
  if (seed) {
    console.log('Seeding demo catalogue and demo customer...');
    runCommand(npmCommand, ['--prefix', 'backend', 'run', 'seed']);
  }
}

export function spawnNpm(args, { cwd = projectRoot } = {}) {
  return spawn(npmCommand, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
}

export function stopChildTree(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 5000).unref();
  }
}
