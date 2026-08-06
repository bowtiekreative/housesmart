/**
 * Long-running wrapper for containerized deploys (Dokploy service):
 * runs the RSS processor immediately, then every RSS_INTERVAL_MINUTES.
 */
import { run } from './rss-processor';

const intervalMs = Number(process.env.RSS_INTERVAL_MINUTES || 360) * 60_000;

async function tick(): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.error('RSS run failed:', err instanceof Error ? err.message : err);
  }
  console.log(`Next run in ${intervalMs / 60_000} minutes.`);
  setTimeout(tick, intervalMs);
}

tick();
