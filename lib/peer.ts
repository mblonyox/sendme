import { ICE_SERVERS } from "./constants.ts";
import { Signaler } from "./socket.ts";

export type PeerInfo = {
  name: string;
  publicKey: JsonWebKey;
  initiator?: boolean;
  status?: string;
};

export const createPeerConnection = (signaler: Signaler, initiator = false) => {
  let makingOffer = false;
  let ignoreOffer = false;
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  pc.onicecandidate = ({ candidate }) =>
    candidate && pc.canTrickleIceCandidates && signaler.send({ candidate });
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
  return pc;
};
