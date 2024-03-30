import { defineRoute } from "$fresh/server.ts";
import Client from "../islands/Client.tsx";

export default defineRoute(() => {
  return (
    <>
      <section>
        <Client />
      </section>
    </>
  );
});
