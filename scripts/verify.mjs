import {
  composeUp,
  initializeDatabases,
  loadLocalEnv,
  npmCommand,
  requireTools,
  runCommand,
  waitForDatabases,
} from './lib/infra.mjs';

async function main() {
  loadLocalEnv();
  requireTools();
  composeUp();
  await waitForDatabases();
  initializeDatabases({ seed: false });

  console.log('\nRunning backend integration tests (separate test database/keyspace)...');
  runCommand(npmCommand, ['--prefix', 'backend', 'run', 'test']);

  console.log('\nBuilding the frontend production bundle...');
  runCommand(npmCommand, ['--prefix', 'frontend', 'run', 'build']);

  console.log('\nVerification completed successfully.');
  console.log('Tests used MONGODB_DB_NAME=quickbite_test and CASSANDRA_KEYSPACE=quickbite_test.');
}

main().catch((error) => {
  console.error(`\nVerification failed: ${error.message}`);
  process.exit(1);
});
