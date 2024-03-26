import { Signal, signal } from "@preact/signals";

type State =
  | "pending"
  | "denied"
  | "waiting"
  | "transferring"
  | "error"
  | "completed";
const chunkSize = 16384;

export class FileTransfer {
  private abortController?: AbortController;

  progress: Signal<number>;
  state: Signal<State>;
  downloadLink: Signal<string | null>;

  constructor(
    private channel: RTCDataChannel,
    public file: File | Pick<File, "lastModified" | "name" | "size" | "type">,
  ) {
    this.channel.binaryType = "arraybuffer";
    this.progress = signal(0);
    this.state = signal("pending");
    this.downloadLink = signal(null);
  }

  send() {
    try {
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      const onabort = () => this.channel.close();
      signal.addEventListener("abort", onabort, { once: true });
      this.state.value = "waiting";
      const onmessage = async ({ data }: MessageEvent) => {
        const bytes = await (this.file as File).arrayBuffer();
        let offset: number | null = null;
        const control = new TextDecoder().decode(data);
        if (control === "NO") {
          this.state.value = "denied";
          this.channel.close();
        }
        if (control === "OK") offset = 0;
        else if (control.startsWith("OFFSET:")) {
          offset = parseInt(control.substring(7));
        }
        if (offset !== null) {
          if (offset < bytes.byteLength) {
            this.state.value = "transferring";
            const sliced = bytes.slice(offset, offset + chunkSize);
            this.channel.binaryType = "arraybuffer";
            this.channel.send(sliced);
            this.progress.value = offset + sliced.byteLength;
          } else {
            this.channel.send(new TextEncoder().encode("COMPLETED"));
            this.channel.close();
            this.state.value = "completed";
          }
        }
      };
      const onerror = () => this.state.value = "error";
      const onclose = () => {
        this.channel.removeEventListener("message", onmessage);
        this.channel.removeEventListener("error", onerror);
        this.channel.removeEventListener("close", onclose);
        signal.removeEventListener("abort", onabort);
      };
      this.channel.addEventListener("message", onmessage);
      this.channel.addEventListener("error", onerror);
      this.channel.addEventListener("close", onclose);
    } catch (error) {
      console.error(error);
      this.state.value = "error";
    }
  }

  async receive(file: FileSystemFileHandle) {
    try {
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      const onabort = () => this.channel.close();
      signal.addEventListener("abort", onabort, { once: true });
      const writer = await file.createWritable();
      this.state.value = "waiting";
      const onmessage = async ({ data }: MessageEvent) => {
        this.state.value = "transferring";
        const control = new TextDecoder().decode(data);
        if (control === "COMPLETED") {
          await writer.close();
          this.downloadLink.value = URL.createObjectURL(await file.getFile());
          this.channel.close();
          this.state.value = "completed";
        } else {
          await writer.write(data);
          this.progress.value += data.byteLength;
          this.channel.send(
            new TextEncoder()
              .encode(`OFFSET:${this.progress.peek()}`),
          );
        }
      };
      const onerror = () => this.state.value = "error";
      const onclose = () => {
        this.channel.removeEventListener("message", onmessage);
        this.channel.removeEventListener("error", onerror);
        this.channel.removeEventListener("close", onclose);
        signal.removeEventListener("abort", onabort);
      };
      this.channel.addEventListener("message", onmessage);
      this.channel.addEventListener("error", onerror);
      this.channel.addEventListener("close", onclose);
    } catch (error) {
      console.error(error);
      this.state.value = "error";
    }
  }

  async accept() {
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle(
      this.file.name,
      { create: true },
    );
    this.channel.send(new TextEncoder().encode("OK"));
    this.receive(fileHandle);
  }

  deny() {
    this.channel.send(new TextEncoder().encode("NO"));
    this.channel.close();
    this.state.value = "denied";
  }

  cancel() {
    this.abortController?.abort();
  }
}
