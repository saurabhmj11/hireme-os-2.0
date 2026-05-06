export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startSchedulerWorker } = await import('./lib/scheduler-worker');
    startSchedulerWorker();
  }
}
