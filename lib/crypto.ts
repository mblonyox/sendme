import { decodeBase64, encodeBase64 } from "$std/encoding/base64.ts";

const ALGORITHM = "RSA-OAEP";
const HASH = "SHA-256";

export const generateKey = () =>
  crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: HASH,
    },
    true,
    ["encrypt", "decrypt"],
  );

export const exportKey = (key: CryptoKey) =>
  crypto.subtle.exportKey("jwk", key);

export const importPublicKey = (jsonPublicKey: JsonWebKey) =>
  crypto.subtle.importKey(
    "jwk",
    jsonPublicKey,
    { name: ALGORITHM, hash: HASH },
    true,
    ["encrypt"],
  );

export const encrypt = (publicKey: CryptoKey, payload: string) =>
  crypto.subtle.encrypt(
    { name: ALGORITHM },
    publicKey,
    new TextEncoder().encode(payload),
  ).then((buffer) => encodeBase64(buffer));

export const decrypt = (privateKey: CryptoKey, cipher: string) =>
  crypto.subtle.decrypt(
    { name: ALGORITHM },
    privateKey,
    decodeBase64(cipher),
  ).then((buffer) => new TextDecoder().decode(buffer));
