import { batch, useComputed, useSignal } from "@preact/signals";
import { filesize } from "filesize";

import { $files, $peers } from "../lib/state.ts";

export default function SendFile() {
  const $open = useSignal(false);
  const $count = useComputed(() =>
    Object.values($peers.value)
      .filter((p) => p.selected.value).length
  );

  return (
    <>
      <input
        type="button"
        onClick={(event) => {
          event.preventDefault();
          $open.value = true;
        }}
        disabled={!$count.value}
        value={$count.value
          ? `Send to ${$count.value} peer(s)`
          : `No peer selected`}
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
                    batch(() => {
                      $files.value = [];
                      $open.value = false;
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    batch(() => {
                      Object.values($peers.value)
                        .forEach((p) => {
                          if (p.selected.peek()) {
                            $files.peek().forEach((file) =>
                              p.createTransfer(file)
                            );
                            p.selected.value = false;
                          }
                        });
                      $files.value = [];
                      $open.value = false;
                    });
                  }}
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
