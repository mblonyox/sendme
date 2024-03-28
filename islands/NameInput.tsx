import { useRef } from "preact/hooks";

import { $name } from "../lib/state.ts";

export default function NameInput() {
  const inputRef = useRef<HTMLInputElement>(null);

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
