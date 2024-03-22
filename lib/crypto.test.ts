import { assertEquals } from "$std/assert/assert_equals.ts";
import { exportKey } from "./crypto.ts";
import { importPublicKey } from "./crypto.ts";
import { decrypt } from "./crypto.ts";
import { encrypt } from "./crypto.ts";
import { generateKey } from "./crypto.ts";

Deno.test("crypto", async () => {
  const { privateKey, publicKey } = await generateKey();
  const exportedKey = await exportKey(publicKey);
  console.log({ exportedKey, json: JSON.stringify(exportedKey) });
  const importedKey = await importPublicKey(exportedKey);
  const encrypted = JSON.stringify(
    await encrypt(importedKey, JSON.stringify(exportedKey)),
  );
  console.log({ encrypted });
  const decrypted = JSON.parse(
    await decrypt(privateKey, JSON.parse(encrypted)),
  );
  console.log({ decrypted });
  assertEquals(exportedKey, decrypted);
});
