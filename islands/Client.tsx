import { WebSocket as ReconnectingWebSocket } from "npm:partysocket";
import { useSignalEffect } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

import { registerClientSocketHandler } from "../lib/socket.ts";
import { createPeerConnection } from "../lib/peer.ts";
import { $name, $peers } from "../lib/state.ts";

export default function Client() {
  const socketRef = useRef<WebSocket>();
  const pcMapRef = useRef(new Map<string, WeakRef<RTCPeerConnection>>());
  useEffect(() => {
    const socket = new ReconnectingWebSocket(
      document.URL.replace("http", "ws"),
    ) as WebSocket;
    registerClientSocketHandler(socket as WebSocket);
    socketRef.current = socket;
    return () => socket.close();
  }, []);
  useSignalEffect(() => {
    const socket = socketRef.current!;
    const peerIds = Object.keys($peers.value);
    peerIds.forEach(
      (id) => {
        if (!pcMapRef.current.has(id)) {
          const pc = createPeerConnection(socket, id);
          pcMapRef.current.set(id, new WeakRef(pc));
        }
      },
    );
    for (const [id, ref] of pcMapRef.current.entries()) {
      if (!peerIds.includes(id)) ref.deref()?.close();
    }
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
