import { loadEnv } from "./env";
import "./font";
import { createServer } from "./server";

const env = loadEnv();
const server = createServer(env);

console.log(`Running in ${env.NODE_ENV} on http://${env.HOST}:${env.PORT}`);

const shutdown = () => {
  server.stop(true);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
