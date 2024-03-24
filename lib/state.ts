import { names, uniqueNamesGenerator } from "unique-names-generator";
import { signal } from "@preact/signals";

import { Peer } from "./peer.ts";
import { TransferInfo } from "./transfer.ts";

export const $name = signal(uniqueNamesGenerator({ dictionaries: [names] }));
export const $peers = signal<Record<string, Peer>>({});
export const $transfers = signal<Record<string, TransferInfo>>({});
export const $files = signal<File[]>([]);
