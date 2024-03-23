import { ICE_SERVERS } from "./constants.ts";
import { createSignaler, Signaler } from "./socket.ts";

import { $peers } from "./state.ts";

export type PeerInfo = {
  name: string;
  publicKey: JsonWebKey;
  initiator?: boolean;
  status?: string;
};

const handleNegotiation = (
  pc: RTCPeerConnection,
  signaler: Signaler,
  initiator?: boolean,
) => {
  let makingOffer = false;
  let ignoreOffer = false;
  pc.onicecandidate = async ({ candidate }) => {
    if (candidate && pc.canTrickleIceCandidates) {
      await signaler.send({ candidate });
    }
  };
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      await signaler.send({ description: pc.localDescription });
    } catch (err) {
      console.error(err);
    } finally {
      makingOffer = false;
    }
  };
  signaler.onData(async ({ description, candidate }) => {
    try {
      if (description) {
        const offerCollision = description.type === "offer" &&
          (makingOffer || pc.signalingState !== "stable");

        ignoreOffer = !initiator && offerCollision;
        if (ignoreOffer) return;

        await pc.setRemoteDescription(description);
        if (description.type === "offer") {
          await pc.setLocalDescription().catch(() => {});
          signaler.send({ description: pc.localDescription });
        }
      } else if (candidate) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) {
            throw err;
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed") {
      pc.restartIce();
    }
  };
  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "closed") signaler.destroy();
  }, { once: true });
};

const pingCheck = (pc: RTCPeerConnection) => {
  let timerId: number;
  const pingChannel = pc.createDataChannel("ping", { negotiated: true, id: 0 });
  pingChannel.onopen = () => {
    timerId = setInterval(() => {
      pingChannel.send("ping");
    }, 1000);
  };
  pingChannel.onmessage = (event) => {
    if (event.data === "ping") pingChannel.send("pong");
  };
  pingChannel.onclose = () => {
    clearInterval(timerId);
  };
  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "closed") pingChannel.close();
  }, { once: true });
};

export const createPeerConnection = (socket: WebSocket, id: string) => {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const { initiator } = $peers.peek()[id];
  const signaler = createSignaler(socket, id);
  handleNegotiation(pc, signaler, initiator);
  pingCheck(pc);
  pc.addEventListener("connectionstatechange", () => {
    const peers = $peers.peek();
    if (peers[id]) {
      $peers.value = {
        ...peers,
        [id]: { ...peers[id], status: pc.connectionState },
      };
    }
  });
  return pc;
};
