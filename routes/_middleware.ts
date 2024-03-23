import { MiddlewareHandler } from "$fresh/server.ts";
import { registerServerSocketHandler } from "../lib/socket.ts";

export const handler: MiddlewareHandler[] = [(req, ctx) => {
  if (
    ctx.destination === "route" &&
    req.headers.get("Upgrade") === "websocket"
  ) {
    const { socket, response } = Deno.upgradeWebSocket(req, { idleTimeout: 5 });
    registerServerSocketHandler(socket);
    return response;
  }
  return ctx.next();
}];
