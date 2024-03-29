import { WebSocket } from "partysocket";
import { useEffect } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

import { registerClientSocketHandler } from "../lib/socket.ts";

import NameInput from "./NameInput.tsx";
import PeerList from "./PeerList.tsx";
import SendFile from "./SendFile.tsx";
import TransferList from "./TransferList.tsx";

export default function Client() {
  useEffect(() => {
    if (!IS_BROWSER) return;
    const socketUrl = document.URL.replace("http", "ws");
    const socket = new WebSocket(socketUrl);
    registerClientSocketHandler(socket);
    return () => socket.close();
  }, []);

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
