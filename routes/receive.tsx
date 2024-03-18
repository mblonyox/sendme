import { defineRoute } from "$fresh/server.ts";

export default defineRoute(() => {
  return (
    <>
      <h2>Receive</h2>
      <p>Keep this window while receiving the file is in progress.</p>
    </>
  );
});
