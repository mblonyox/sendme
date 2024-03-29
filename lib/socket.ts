import { effect } from "@preact/signals";
import { WebSocket as ReconnectingWebSocket } from "partysocket";
import { z } from "zod";

import {
  decrypt,
  encrypt,
  exportPublicKey,
  generateAesKey,
  generateRsaKey,
  importPublicKey,
  unwrapSharedKey,
  wrapSharedKey,
} from "./crypto.ts";
import { Peer } from "./peer.ts";
import { $name, $peers } from "./state.ts";

const clientMessageSchema = z.union([
  z.object({
    type: z.literal("HI"),
    name: z.string(),
    key: z.string(),
  }),
  z.object({
    type: z.literal("HELLO"),
    to: z.string(),
    name: z.string(),
    key: z.string(),
  }),
  z.object({
    type: z.literal("RENAME"),
    name: z.string(),
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
    key: z.string(),
  }),
  z.object({
    type: z.literal("HELLO"),
    from: z.string(),
    name: z.string(),
    key: z.string(),
  }),
  z.object({
    type: z.literal("RENAME"),
    from: z.string(),
    name: z.string(),
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
  socket: ReconnectingWebSocket,
  id: string,
  key: CryptoKey,
) => {
  const send = async (data: Data) => {
    const candidate = data.candidate &&
      await encrypt(key, JSON.stringify(data.candidate));
    const description = data.description &&
      await encrypt(key, JSON.stringify(data.description));
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
      await decrypt(key, data.candidate).then(JSON.parse);
    const description = data.description &&
      await decrypt(key, data.description).then(JSON.parse);
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

export const registerClientSocketHandler = (
  socket: ReconnectingWebSocket,
) => {
  const rsaKey = generateRsaKey();
  const exportedKey = rsaKey
    .then(({ publicKey }) => exportPublicKey(publicKey));
  const unsubsribe = effect(() => {
    if ($name.value && socket.readyState === socket.OPEN) {
      const message: ClientMessage = {
        type: "RENAME",
        name: $name.peek(),
      };
      socket.send(JSON.stringify(message));
    }
  });
  socket.onopen = async () => {
    const message: ClientMessage = {
      type: "HI",
      name: $name.peek(),
      key: await exportedKey,
    };
    socket.send(JSON.stringify(message));
  };
  socket.onmessage = async (event: MessageEvent) => {
    const result = serverMessageSchema.safeParse(JSON.parse(event.data));
    if (!result.success) return;
    const data = result.data;
    if (data.type === "HI") {
      const { name, key, from } = data;
      const sharedKey = await generateAesKey();
      const signaler = createSignaler(socket, from, sharedKey);
      const peer = new Peer(name, signaler, true);
      $peers.value = { ...$peers.peek(), [from]: peer };
      // Reply with HELLO message.
      const importedKey = await importPublicKey(key);
      const wrappedKey = await wrapSharedKey(sharedKey, importedKey);
      const message: ClientMessage = {
        type: "HELLO",
        to: from,
        name: $name.peek(),
        key: wrappedKey,
      };
      socket.send(JSON.stringify(message));
    }
    if (data.type === "HELLO") {
      const { name, key, from } = data;
      if (!$peers.peek()[from]) {
        const privateKey = (await rsaKey).privateKey;
        const sharedKey = await unwrapSharedKey(key, privateKey);
        const signaler = createSignaler(socket, from, sharedKey);
        const peer = new Peer(name, signaler);
        $peers.value = { ...$peers.peek(), [from]: peer };
      }
    }
    if (data.type === "RENAME") {
      const { name, from } = data;
      const peer = $peers.peek()[from];
      if (peer) peer.name.value = name;
    }
    if (data.type === "BYE") {
      const { from } = data;
      const peers = $peers.peek();
      if (peers[from]) {
        peers[from].close();
        delete peers[from];
      }
      $peers.value = { ...peers };
    }
  };
  socket.onclose = () => unsubsribe();
};

export const registerServerSocketHandler = (socket: WebSocket) => {
  const id = crypto.randomUUID();
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
      case "HI":
      case "RENAME": {
        const message: ServerMessage = { ...data, from: id };
        globalChannel.postMessage(message);
        break;
      }
      case "HELLO": {
        const { to, ...hello } = data;
        const channel = new BroadcastChannel(`client:${to}`);
        const message: ServerMessage = { ...hello, from: id };
        channel.postMessage(message);
        channel.close();
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
