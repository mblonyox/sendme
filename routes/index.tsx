import { defineRoute } from "$fresh/server.ts";

export default defineRoute(() => {
  return (
    <>
      <section>
        <h2>What is SendMe?</h2>
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
      <section>
        <h2>How to use?</h2>
        <p>Choose between receiving or sending the files.</p>
        <div className="grid">
          <a className="contrast" role="button" href="/receive">Receive</a>
          <a role="button" href="/send">Send</a>
        </div>
      </section>
    </>
  );
});
