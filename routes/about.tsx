import { defineRoute } from "$fresh/server.ts";

export default defineRoute(() => {
  return (
    <>
      <h2>About</h2>
      <section>
        <h3>What is SendMe?</h3>
        <p>
          SendMe is a tool that let you send or receive file directly between
          devices using peer-to-peer (P2P) utilizing WebRTC technology. Files
          are encrypted using key that generated on web browser.
        </p>
        <p>
          It tooks inspiration from the{" "}
          <a
            href="https://sendfiles.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            sendfiles.dev
          </a>{" "}
          that using Amazon Web Service (AWS) architecture. Instead it uses Deno
          Deploy architecture.
        </p>
      </section>
    </>
  );
});
