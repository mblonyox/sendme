import { decodeBase64, encodeBase64 } from "$std/encoding/base64.ts";

function* chunks(arr: Uint8Array, n: number): Generator<Uint8Array, void> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}

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

export const encrypt = async (publicKey: CryptoKey, payload: string) => {
  const buffer = new TextEncoder().encode(payload);
  const chunked = Array.from(chunks(buffer, 190));
  const encrypteds = await Promise.all(
    chunked.map((chunk) =>
      crypto.subtle.encrypt(
        { name: ALGORITHM },
        publicKey,
        chunk,
      ).then((bytes) => encodeBase64(bytes))
    ),
  );
  return encrypteds.join("\n");
};

export const decrypt = async (privateKey: CryptoKey, cipher: string) => {
  const decrypteds = await Promise.all(
    cipher.split("\n")
      .map((text) => decodeBase64(text))
      .map((bytes) =>
        crypto.subtle.decrypt(
          { name: ALGORITHM },
          privateKey,
          bytes,
        ).then((bytes) => new TextDecoder().decode(bytes))
      ),
  );
  return decrypteds.join("");
};

export const { privateKey, publicKey } = await generateKey();
