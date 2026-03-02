import { HeaderConstants } from "./constants/headers";
import { ResConstants } from "./constants/res";
import { NodeEnv, type Env } from "./env";
import { dayCounter } from "./services/day-counter";

export const createServer = (env: Env) => {
  return Bun.serve({
    port: env.PORT,
    hostname: env.HOST,
    development: env.NODE_ENV !== NodeEnv.production,
    reusePort: true,

    fetch: async (req: Request): Promise<Response> => {
      const url = new URL(req.url);
      const path = url.pathname;

      if (path === "/") {
        return new Response(ResConstants.ROOT_PAYLOAD, {
          status: 200,
          headers: HeaderConstants.JSON_HEADERS,
        });
      }

      if (path === "/health") {
        return new Response("ok");
      }

      if (path === "/day-counter") {
        return dayCounter(env, url.searchParams);
      }

      return new Response(ResConstants.NOT_FOUND, { status: 404 });
    },

    error: () => {
      return new Response("Internal Server Error", { status: 500 });
    },
  });
};
