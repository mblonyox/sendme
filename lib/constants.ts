// const username = Deno.env.get("TURN_USERNAME");
// const credential = Deno.env.get("TURN_CREDENTIAL");

export const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "stun:stun.relay.metered.ca:80",
  },
  // {
  //   urls: "turn:global.relay.metered.ca:80",
  //   username,
  //   credential,
  // },
  // {
  //   urls: "turn:global.relay.metered.ca:80?transport=tcp",
  //   username,
  //   credential,
  // },
  // {
  //   urls: "turn:global.relay.metered.ca:443",
  //   username,
  //   credential,
  // },
  // {
  //   urls: "turns:global.relay.metered.ca:443?transport=tcp",
  //   username,
  //   credential,
  // },
];
