import { Config } from "./preload";
import { createServer } from "./server";
import { Logs } from "./utils/log";

const server = createServer();

Logs.log(
  `Running in ${Config.NODE_ENV} on http://${Config.HOST}:${Config.PORT}`,
);

const shutdown = () => {
  server.stop(true);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
