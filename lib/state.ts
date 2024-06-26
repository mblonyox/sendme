import { signal } from "@preact/signals";

import { Peer } from "./peer.ts";

export const $name = signal("");
export const $peers = signal<Record<string, Peer>>({});
export const $files = signal<File[]>([]);
