import { useSignal } from "@preact/signals";
import { filesize } from "filesize";
import { $files, $peers } from "../lib/state.ts";

export default function SendFile() {
  const $open = useSignal(false);
  const peers = Object.values($peers.value);
  const count = peers.filter((p) => p.checked).length;
  return (
    <>
      <input
        type="button"
        onClick={(event) => {
          event.preventDefault();
          $open.value = true;
        }}
        disabled={!count}
        value={count ? `Send to ${count} peer(s)` : `No peer selected`}
      />
      {$open.value &&
        (
          <dialog open>
            <article>
              <header>
                <button
                  aria-label="Close"
                  rel="prev"
                  onClick={(event) => {
                    event.preventDefault();
                    $open.value = false;
                  }}
                >
                </button>
                <p>
                  <strong>📡 Send files to peers!</strong>
                </p>
              </header>
              <input
                type="file"
                multiple
                onInput={(event) => {
                  const files = event.currentTarget.files;
                  if (files) {
                    $files.value = [...$files.peek(), ...Array.from(files)];
                  }
                  event.currentTarget.value = "";
                }}
              />
              <ul style={{ maxHeight: "10rem", overflowY: "auto" }}>
                {$files.value.map((f) => (
                  <li>{f.name} - {filesize(f.size, { standard: "jedec" })}</li>
                ))}
              </ul>
              <footer>
                <button
                  className="secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    $open.value = false;
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={!$files.value.length}
                >
                  Send
                </button>
              </footer>
            </article>
          </dialog>
        )}
    </>
  );
}
