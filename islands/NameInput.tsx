import { useRef } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { names, uniqueNamesGenerator } from "unique-names-generator";

import { $name } from "../lib/state.ts";

export default function NameInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  useSignalEffect(() => {
    if ($name.value) {
      sessionStorage.setItem("name", $name.peek());
    } else {
      $name.value = sessionStorage.getItem("name") ||
        uniqueNamesGenerator({ dictionaries: [names] });
    }
  });

  return (
    <fieldset role="group">
      <input
        type="text"
        name="name"
        id="nameInput"
        autoComplete="name"
        value={$name}
        ref={inputRef}
        onKeyUp={(event) => {
          event.preventDefault();
          if (event.key === "Enter") {
            $name.value = event.currentTarget.value;
          }
        }}
      />
      <input
        type="submit"
        value="Rename"
        onClick={(event) => {
          event.preventDefault();
          if (inputRef.current) {
            $name.value = inputRef.current.value;
          }
        }}
      />
    </fieldset>
  );
}
