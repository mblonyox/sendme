import { names, uniqueNamesGenerator } from "unique-names-generator";
import { signal } from "@preact/signals";

import { PeerInfo } from "./peer.ts";

export const $name = signal(uniqueNamesGenerator({ dictionaries: [names] }));
export const $peers = signal<Record<string, PeerInfo>>({});
