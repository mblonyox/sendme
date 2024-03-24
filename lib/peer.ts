import { Signal, signal } from "@preact/signals";
import { iceServers } from "./constants.ts";
import { Signaler } from "./socket.ts";

const handleNegotiation = (
  pc: RTCPeerConnection,
  signaler: Signaler,
  initiator?: boolean,
) => {
  let makingOffer = false;
  let ignoreOffer = false;
  pc.onicecandidate = async ({ candidate }) => {
    if (candidate) {
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
          await pc.setLocalDescription();
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
  const onclose = () => {
    if (pc.connectionState === "closed") {
      signaler.destroy();
      pc.removeEventListener("connectionstatechange", onclose);
    }
  };
  pc.addEventListener("connectionstatechange", onclose);
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
  const onclose = () => {
    if (pc.connectionState === "closed") {
      pingChannel.close();
      pc.removeEventListener("connectionstatechange", onclose);
    }
  };
  pc.addEventListener("connectionstatechange", onclose);
};

const handleStateUpdate = (pc: RTCPeerConnection, state: Signal<string>) => {
  const handler = () => {
    state.value = pc.connectionState;
    if (pc.connectionState === "closed") {
      pc.removeEventListener("connectionstatechange", handler);
    }
  };
  pc.addEventListener("connectionstatechange", handler);
};

export class Peer {
  private pc: RTCPeerConnection;
  name: Signal<string>;
  state: Signal<string>;
  selected: Signal<boolean>;

  constructor(
    public id: string,
    name: string,
    signaler: Signaler,
    initiator?: boolean,
  ) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.name = signal(name);
    this.state = signal(this.pc.connectionState);
    this.selected = signal(false);
    handleNegotiation(this.pc, signaler, initiator);
    handleStateUpdate(this.pc, this.state);
    pingCheck(this.pc);
  }

  close() {
    this.pc.close();
  }
}
