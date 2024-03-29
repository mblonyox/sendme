import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import {
  decrypt,
  encrypt,
  exportPublicKey,
  generateAesKey,
  generateRsaKey,
  importPublicKey,
  unwrapSharedKey,
  wrapSharedKey,
} from "./crypto.ts";

Deno.test("crypto", async (t) => {
  const re = new RegExp("^[-A-Za-z0-9+/]*={0,3}$");
  await t.step("generateRsaKey", async () => {
    const key = await generateRsaKey();
    assertEquals(key.privateKey.algorithm.name, "RSA-OAEP");
    assertEquals(key.privateKey.type, "private");
    assertEquals(key.publicKey.algorithm.name, "RSA-OAEP");
    assertEquals(key.publicKey.type, "public");
  });
  const { privateKey, publicKey } = await generateRsaKey();
  await t.step("exportPublicKey", async () => {
    const key = await exportPublicKey(publicKey);
    assert(re.test(key));
  });
  const exportedKey = await exportPublicKey(publicKey);
  await t.step("importPublicKey", async () => {
    const key = await importPublicKey(exportedKey);
    assertEquals(publicKey.algorithm, key.algorithm);
    assertEquals(publicKey.type, key.type);
    assertEquals(publicKey.usages, key.usages);
    assertEquals(publicKey.extractable, key.extractable);
  });
  await t.step("generateAesKey", async () => {
    const key = await generateAesKey();
    assertEquals(key.algorithm.name, "AES-GCM");
    assertEquals(key.extractable, true);
    assertEquals(key.type, "secret");
    assertEquals(key.usages, ["encrypt", "decrypt"]);
  });
  const sharedKey = await generateAesKey();
  await t.step("wrapSharedKey", async () => {
    const key = await wrapSharedKey(sharedKey, publicKey);
    assert(re.test(key));
  });
  const wrappedKey = await wrapSharedKey(sharedKey, publicKey);
  await t.step("unwrapSharedKey", async () => {
    const key = await unwrapSharedKey(wrappedKey, privateKey);
    assertEquals(key.algorithm.name, "AES-GCM");
    assertEquals(key.extractable, true);
    assertEquals(key.type, "secret");
    assertEquals(key.usages, ["encrypt", "decrypt"]);
  });
  const unwrappedKey = await unwrapSharedKey(wrappedKey, privateKey);
  const plaintext = crypto.randomUUID();
  await t.step("encrypt", async () => {
    const text = await encrypt(unwrappedKey, plaintext);
    assert(text.includes("."));
    assert(text.split(".").every((t) => re.test(t)));
  });
  const ciphertext = await encrypt(sharedKey, plaintext);
  await t.step("decrypt", async () => {
    const text = await decrypt(sharedKey, ciphertext);
    assertEquals(plaintext, text);
  });
});
