export type TransferInfo = {
  type: "receive" | "send";
  peerName: string;
  peerId: string;
  channelId: number;
  fileName: string;
  size: number;
  progress: number;
  status: "unapproved" | "started" | "failed" | "completed";
};
