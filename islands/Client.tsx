import { WebSocket as ReconnectingWebSocket } from "partysocket";
import { useSignalEffect } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

import { registerClientSocketHandler } from "../lib/socket.ts";
import { createPeerConnection } from "../lib/peer.ts";
import { $peers } from "../lib/state.ts";
import NameInput from "./NameInput.tsx";
import PeerList from "./PeerList.tsx";
import SendFile from "./SendFile.tsx";
import TransferList from "./TransferList.tsx";

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
    for (const id of peerIds) {
      if (!pcMapRef.current.has(id)) {
        const pc = createPeerConnection(socket, id);
        pcMapRef.current.set(id, new WeakRef(pc));
      }
    }
    for (const [id, ref] of pcMapRef.current.entries()) {
      if (!peerIds.includes(id)) {
        ref.deref()?.close();
        pcMapRef.current.delete(id);
      }
    }
  });

  return (
    <>
      <section>
        <h2>Peers</h2>
        <div className="grid">
          <NameInput />
          <SendFile />
        </div>
        <PeerList />
      </section>
      <section>
        <h2>Transfers</h2>
        <TransferList />
      </section>
    </>
  );
}
