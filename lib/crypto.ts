import { decodeBase64, encodeBase64 } from "$std/encoding/base64.ts";

export const generateRsaKey = () =>
  crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"],
  );

export const exportPublicKey = (key: CryptoKey) =>
  crypto.subtle.exportKey("spki", key)
    .then((v) => encodeBase64(v));

export const importPublicKey = (text: string) =>
  crypto.subtle.importKey(
    "spki",
    decodeBase64(text),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["wrapKey"],
  );

export const generateAesKey = () =>
  crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

export const wrapSharedKey = (key: CryptoKey, wrappingKey: CryptoKey) =>
  crypto.subtle.wrapKey("raw", key, wrappingKey, { name: "RSA-OAEP" })
    .then(encodeBase64);

export const unwrapSharedKey = (
  encoded: string,
  unwrappingKey: CryptoKey,
) =>
  crypto.subtle.unwrapKey(
    "raw",
    decodeBase64(encoded),
    unwrappingKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

export const encrypt = async (key: CryptoKey, plaintext: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return [iv, encrypted].map(encodeBase64).join(".");
};

export const decrypt = async (key: CryptoKey, ciphertext: string) => {
  const [iv, encrypted] = ciphertext.split(".").map(decodeBase64);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  );
  return new TextDecoder().decode(decrypted);
};
