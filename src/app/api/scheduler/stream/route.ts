import { getProgress, isSchedulerRunning } from '@/lib/scheduler-worker';

/**
 * Server-Sent Events (SSE) endpoint for real-time scheduler progress
 *
 * The frontend subscribes to this endpoint to get live phase updates
 * instead of using fake client-side timers.
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial state immediately
      sendEvent(getProgress());

      // Poll progress every 2 seconds
      const intervalId = setInterval(() => {
        try {
          const progress = getProgress();
          sendEvent({
            ...progress,
            isRunning: isSchedulerRunning(),
          });
        } catch {
          clearInterval(intervalId);
          controller.close();
        }
      }, 2000);

      // 5 minute max connection, then client reconnects
      setTimeout(() => {
        clearInterval(intervalId);
        controller.close();
      }, 300000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
