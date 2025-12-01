import client from 'prom-client';

// collect default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ timeout: 5000 });

// HTTP request histogram
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5, 10]
});

// express middleware to observe requests
export function metricsMiddleware(req, res, next) {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    const route = req.route && req.route.path ? req.route.path : req.path;
    end({ method: req.method, route, code: res.statusCode });
  });
  next();
}

// metrics endpoint handler
export async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).send(err.message || 'failed to collect metrics');
  }
}

export default client;
