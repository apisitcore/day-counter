import { loadEnv } from "./env";
import "./preload";
import { createServer } from "./server";
import { Logs } from "./utils/log";

const env = loadEnv();
const server = createServer(env);

Logs.log(`Running in ${env.NODE_ENV} on http://${env.HOST}:${env.PORT}`);

const shutdown = () => {
  server.stop(true);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
