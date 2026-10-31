import {
  composeUp,
  initializeDatabases,
  loadLocalEnv,
  requireTools,
  spawnNpm,
  stopChildTree,
  waitForDatabases,
} from './lib/infra.mjs';

let backend;
let frontend;
let stopping = false;

function printSummary() {
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const port = process.env.PORT || '4000';
  console.log('\n============================================================');
  console.log('  QuickBite is starting');
  console.log(`  Frontend: ${frontendOrigin}`);
  console.log(`  API:      http://localhost:${port}`);
  console.log(`  Health:   http://localhost:${port}/health`);
  console.log(`  Ready:    http://localhost:${port}/ready`);
  console.log('');
  console.log('  Demo login (LOCAL DEVELOPMENT ONLY)');
  console.log(`    Email:    ${process.env.DEMO_CUSTOMER_EMAIL || 'demo@quickbite.local'}`);
  console.log(`    Password: ${process.env.DEMO_CUSTOMER_PASSWORD || 'Demo@123'}`);
  console.log('');
  console.log('  Stop app: Ctrl+C (database containers and volumes stay intact)');
  console.log('  Stop DB:  npm run db:down');
  console.log('============================================================\n');
}

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\nStopping frontend and backend...');
  stopChildTree(frontend);
  stopChildTree(backend);
  console.log('Application stopped. MongoDB/Cassandra containers are still running.');
  setTimeout(() => process.exit(exitCode), 500);
}

async function main() {
  loadLocalEnv();
  requireTools();
  composeUp();
  await waitForDatabases();

  const autoSeed = String(process.env.AUTO_SEED || 'true').toLowerCase() === 'true';
  initializeDatabases({ seed: autoSeed });
  printSummary();

  backend = spawnNpm(['--prefix', 'backend', 'run', 'dev']);
  frontend = spawnNpm(['--prefix', 'frontend', 'run', 'dev']);

  backend.on('exit', (code) => {
    if (!stopping) {
      console.error(`Backend exited unexpectedly (code ${code}).`);
      shutdown(code || 1);
    }
  });
  frontend.on('exit', (code) => {
    if (!stopping) {
      console.error(`Frontend exited unexpectedly (code ${code}).`);
      shutdown(code || 1);
    }
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main().catch((error) => {
  console.error(`\nStartup failed: ${error.message}`);
  process.exit(1);
});
