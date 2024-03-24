import { nanoid } from "nanoid";
import { z } from "zod";

import {
  decrypt,
  encrypt,
  exportKey,
  importPublicKey,
  privateKey,
  publicKey,
} from "./crypto.ts";
import { Peer } from "./peer.ts";
import { $name, $peers } from "./state.ts";

const jwkSchema = z.record(z.any());

const clientMessageSchema = z.union([
  z.object({
    type: z.literal("HI"),
    name: z.string(),
    publicKey: jwkSchema,
  }),
  z.object({
    type: z.literal("HELLO"),
    to: z.string(),
    name: z.string(),
    publicKey: jwkSchema,
  }),
  z.object({
    type: z.literal("SIGNAL"),
    to: z.string(),
    description: z.string().optional().nullable(),
    candidate: z.string().optional().nullable(),
  }),
]);

const serverMessageSchema = z.union([
  z.object({
    type: z.literal("HI"),
    from: z.string(),
    name: z.string(),
    publicKey: jwkSchema,
  }),
  z.object({
    type: z.literal("HELLO"),
    from: z.string(),
    name: z.string(),
    publicKey: jwkSchema,
  }),
  z.object({
    type: z.literal("SIGNAL"),
    from: z.string(),
    description: z.string().optional().nullable(),
    candidate: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal("BYE"),
    from: z.string(),
  }),
]);

type ClientMessage = z.infer<typeof clientMessageSchema>;
type ServerMessage = z.infer<typeof serverMessageSchema>;
type Data = {
  description?: RTCSessionDescription | null;
  candidate?: RTCIceCandidate | null;
};

export const createSignaler = (
  socket: WebSocket,
  id: string,
  jwk: JsonWebKey,
) => {
  const publicKey = importPublicKey(jwk);
  const send = async (data: Data) => {
    const candidate = data.candidate &&
      await encrypt(await publicKey, JSON.stringify(data.candidate));
    const description = data.description &&
      await encrypt(await publicKey, JSON.stringify(data.description));
    const message: ClientMessage = {
      type: "SIGNAL",
      to: id,
      candidate,
      description,
    };
    socket.send(JSON.stringify(message));
  };
  let callback = (_: Data): void | Promise<void> => {};
  const onmessage = async (event: MessageEvent) => {
    const result = serverMessageSchema.safeParse(JSON.parse(event.data));
    if (!result.success) return;
    const data = result.data;
    if (data.type !== "SIGNAL" || data.from !== id) return;
    const candidate = data.candidate &&
      await decrypt(privateKey, data.candidate)
        .then((text) => JSON.parse(text));
    const description = data.description &&
      await decrypt(privateKey, data.description)
        .then((text) => JSON.parse(text));
    await callback({ description, candidate });
  };
  const onclose = () => {
    socket.removeEventListener("message", onmessage);
    socket.removeEventListener("close", onclose);
  };
  socket.addEventListener("message", onmessage);
  socket.addEventListener("close", onclose);
  const onData = (cb: (_: Data) => void | Promise<void>) => callback = cb;
  const destroy = onclose;
  return {
    send,
    onData,
    destroy,
  };
};

export const registerClientSocketHandler = async (socket: WebSocket) => {
  const jwk = await exportKey(publicKey);
  socket.onopen = () => {
    const message: ClientMessage = {
      type: "HI",
      name: $name.peek(),
      publicKey: jwk,
    };
    socket.send(JSON.stringify(message));
  };
  socket.onmessage = (event: MessageEvent) => {
    const result = serverMessageSchema.safeParse(JSON.parse(event.data));
    if (!result.success) return;
    const data = result.data;
    if (data.type === "HI") {
      const { name, publicKey, from } = data;
      const signaler = createSignaler(socket, from, publicKey);
      const peer = new Peer(from, name, signaler, true);
      $peers.value = { ...$peers.peek(), [from]: peer };
      const message: ClientMessage = {
        type: "HELLO",
        to: from,
        name: $name.peek(),
        publicKey: jwk,
      };
      socket.send(JSON.stringify(message));
    }
    if (data.type === "HELLO") {
      const { name, publicKey, from } = data;
      if ($peers.value[from]) {
        $peers.value[from].name.value = name;
      } else {
        const signaler = createSignaler(socket, from, publicKey);
        const peer = new Peer(from, name, signaler);
        $peers.value = { ...$peers.peek(), [from]: peer };
      }
    }
    if (data.type === "BYE") {
      const temp = $peers.peek();
      temp[data.from].close();
      delete temp[data.from];
      $peers.value = { ...temp };
    }
  };
};

export const registerServerSocketHandler = (socket: WebSocket) => {
  const id = nanoid();
  const globalChannel = new BroadcastChannel("global");
  const clientChannel = new BroadcastChannel(`client:${id}`);
  socket.onopen = () => {
    globalChannel.onmessage = (event) =>
      socket.send(JSON.stringify(event.data));
    clientChannel.onmessage = (event) =>
      socket.send(JSON.stringify(event.data));
  };
  socket.onmessage = (event) => {
    const result = clientMessageSchema.safeParse(JSON.parse(event.data));
    if (!result.success) return;
    const data = result.data;
    switch (data.type) {
      case "HI": {
        const message: ServerMessage = { ...data, from: id };
        globalChannel.postMessage(message);
        break;
      }
      case "HELLO": {
        const { to, ...hello } = data;
        const channel = new BroadcastChannel(`client:${to}`);
        const message: ServerMessage = { ...hello, from: id };
        channel.postMessage(message);
        break;
      }
      case "SIGNAL": {
        const { to, ...signal } = data;
        const channel = new BroadcastChannel(`client:${to}`);
        const message: ServerMessage = { ...signal, from: id };
        channel.postMessage(message);
        channel.close();
        break;
      }
      default:
        break;
    }
  };
  socket.onclose = () => {
    const message: ServerMessage = { type: "BYE", from: id };
    try {
      globalChannel.postMessage(message);
    } catch (error) {
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        const channel = new BroadcastChannel("global");
        channel.postMessage(message);
        channel.close();
      }
    }
    globalChannel.close();
    clientChannel.close();
  };
};

export type Signaler = Awaited<ReturnType<typeof createSignaler>>;
