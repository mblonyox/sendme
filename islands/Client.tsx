import { names, uniqueNamesGenerator } from "npm:unique-names-generator";
import { WebSocket as ReconnectingWebSocket } from "npm:partysocket";
import { signal, useSignalEffect } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

import { registerClientSocketHandler } from "../lib/socket.ts";
import { generateKey } from "../lib/crypto.ts";
import { PeerInfo } from "../lib/peer.ts";
import { createPeerConnection } from "../lib/peer.ts";
import { createSignaler } from "../lib/socket.ts";

const $name = signal(uniqueNamesGenerator({ dictionaries: [names] }));
const $peers = signal<Record<string, PeerInfo>>({});

const { privateKey, publicKey } = await generateKey();
const peerConnections = new Map<string, WeakRef<RTCPeerConnection>>();

export default function Client() {
  const socketRef = useRef<WebSocket>();
  useEffect(() => {
    const socket = new ReconnectingWebSocket(
      document.URL.replace("http", "ws"),
    ) as WebSocket;
    registerClientSocketHandler(socket as WebSocket, publicKey, $name, $peers);
    socketRef.current = socket;
    return () => socket.close();
  }, []);
  useSignalEffect(() => {
    const socket = socketRef.current!;
    Object.entries($peers.value).forEach(
      async ([id, peer]) => {
        if (!peerConnections.has(id)) {
          const { publicKey, initiator } = peer;
          const signaler = await createSignaler(
            socket,
            privateKey,
            id,
            publicKey,
          );
          const pc = createPeerConnection(signaler, initiator);
          peerConnections.set(id, new WeakRef(pc));
          const channel = pc.createDataChannel("status", {
            negotiated: true,
            id: 0,
          });
          channel.onmessage = (event) => {
            if (event.data === "ping") channel.send("pong");
            $peers.value = {
              ...$peers.peek(),
              [id]: { ...peer, status: "online" },
            };
          };
          setInterval(() => {
            channel.send("ping");
          }, 1000);
        }
      },
    );
  });

  return (
    <div className="grid">
      <div>
        <h2>Name</h2>
        <article>
          <fieldset role="group">
            <input
              type="text"
              name="name"
              id="nameInput"
              autoComplete="name"
              onChange={(event) => $name.value = event.currentTarget.value}
              value={$name}
            />
            <input type="submit" value="Rename" />
          </fieldset>
        </article>
      </div>
      <div>
        <h2>Peers</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.values($peers.value).map(({ name, status }, index) => (
              <tr>
                <th scope="row">{index + 1}</th>
                <td>{name}</td>
                <td>{status}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
