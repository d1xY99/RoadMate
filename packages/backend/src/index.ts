import { env } from './env';
import { app } from './server';

app.listen(env.port, () => {
  console.log(`🚗 RoadMate backend listening on :${env.port}`);
  console.log(`   Swagger UI at http://localhost:${env.port}/docs`);
});
