import { prerenderPrerenderedRoutes } from './prerender';

prerenderPrerenderedRoutes().catch((err) => {
  console.error('Prerender error:', err);
  process.exit(1);
});
