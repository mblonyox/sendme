import { Signal, signal } from "@preact/signals";

import { iceServers } from "./constants.ts";
import { Signaler } from "./socket.ts";
import { FileTransfer } from "./file-transfer.ts";

export class Peer {
  private pc: RTCPeerConnection;
  name: Signal<string>;
  selected: Signal<boolean>;
  state: Signal<RTCPeerConnectionState>;
  fileTransfers: Signal<FileTransfer[]>;

  constructor(
    name: string,
    signaler: Signaler,
    initiator?: boolean,
  ) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.pc.createDataChannel("system");
    this.name = signal(name);
    this.state = signal(this.pc.connectionState);
    this.selected = signal(false);
    this.fileTransfers = signal([]);
    this.handleNegotiation(signaler, initiator);
    this.handleStateUpdate();
    this.handleReceiveFile();
    this.pingCheck();
  }

  private handleNegotiation(signaler: Signaler, initiator?: boolean) {
    let makingOffer = false;
    let ignoreOffer = false;
    const onicecandidate = async ({ candidate }: RTCPeerConnectionIceEvent) => {
      if (candidate) {
        await signaler.send({ candidate });
      }
    };
    const onnegotiationneeded = async () => {
      try {
        makingOffer = true;
        await this.pc.setLocalDescription();
        await signaler.send({ description: this.pc.localDescription });
      } catch (err) {
        console.error(err);
      } finally {
        makingOffer = false;
      }
    };
    const oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === "failed") {
        this.pc.restartIce();
      }
    };
    signaler.onData(async ({ description, candidate }) => {
      try {
        if (description) {
          const offerCollision = description.type === "offer" &&
            (makingOffer || this.pc.signalingState !== "stable");
          ignoreOffer = !initiator && offerCollision;
          if (ignoreOffer) return;
          await this.pc.setRemoteDescription(description);
          if (description.type === "offer") {
            await this.pc.setLocalDescription();
            signaler.send({ description: this.pc.localDescription });
          }
        } else if (candidate) {
          try {
            await this.pc.addIceCandidate(candidate);
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
    const onclose = () => {
      if (this.pc.connectionState === "closed") {
        signaler.destroy();
        this.pc.removeEventListener("icecandidate", onicecandidate);
        this.pc.removeEventListener("negotiationneeded", onnegotiationneeded);
        this.pc.removeEventListener(
          "iceconnectionstatechange",
          oniceconnectionstatechange,
        );
        this.pc.removeEventListener("connectionstatechange", onclose);
      }
    };
    this.pc.addEventListener("icecandidate", onicecandidate);
    this.pc.addEventListener("negotiationneeded", onnegotiationneeded);
    this.pc.addEventListener(
      "iceconnectionstatechange",
      oniceconnectionstatechange,
    );
    this.pc.addEventListener("connectionstatechange", onclose);
  }

  private handleStateUpdate() {
    const handler = () => {
      this.state.value = this.pc.connectionState;
      if (this.pc.connectionState === "closed") {
        this.pc.removeEventListener("connectionstatechange", handler);
      }
    };
    this.pc.addEventListener("connectionstatechange", handler);
  }

  private handleReceiveFile() {
    const ondatachannel = ({ channel }: RTCDataChannelEvent) => {
      if (channel.label.startsWith("file//")) {
        const [, name, type, lastModified, size] = channel.label.split("//");
        const ft = new FileTransfer(channel, {
          name,
          type,
          lastModified: parseInt(lastModified),
          size: parseInt(size),
        });
        this.fileTransfers.value = [...this.fileTransfers.peek(), ft];
      }
    };
    const onclose = () => {
      if (this.pc.connectionState === "closed") {
        this.pc.removeEventListener("datachannel", ondatachannel);
        this.pc.removeEventListener("connectionstatechange", onclose);
      }
    };
    this.pc.addEventListener("datachannel", ondatachannel);
    this.pc.addEventListener("connectionstatechange", onclose);
  }

  private pingCheck() {
    let timerId: number;
    const pingChannel = this.pc.createDataChannel("ping", {
      negotiated: true,
      id: 0,
    });
    pingChannel.onopen = () => {
      timerId = setInterval(() => pingChannel.send("ping"), 5000);
    };
    pingChannel.onmessage = (event) => {
      if (event.data === "ping") pingChannel.send("pong");
    };
    pingChannel.onclose = () => clearInterval(timerId);
    const onclose = () => {
      if (this.pc.connectionState === "closed") {
        pingChannel.close();
        this.pc.removeEventListener("connectionstatechange", onclose);
      }
    };
    this.pc.addEventListener("connectionstatechange", onclose);
  }

  removeTransfer(ft: FileTransfer) {
    this.fileTransfers.value = this.fileTransfers
      .peek()
      .filter((v) => v !== ft);
  }

  createTransfer(file: File) {
    const label = ["file", file.name, file.type, file.lastModified, file.size]
      .join("//");
    const channel = this.pc.createDataChannel(label);
    const ft = new FileTransfer(channel, file);
    this.fileTransfers.value = [...this.fileTransfers.peek(), ft];
    ft.send();
  }

  close() {
    this.pc.close();
  }
}
