import { defineRoute } from "$fresh/server.ts";

export default defineRoute(() => {
  return (
    <>
      <h2>Send</h2>
      <p>Keep this window open while sending the files is in progress.</p>
    </>
  );
});
