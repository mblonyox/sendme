import { batch, useComputed } from "@preact/signals";
import { $peers } from "../lib/state.ts";

export default function PeerList() {
  const $allCheckboxProps = useComputed(() => {
    const peers = Object.values($peers.value);
    const checked = peers.every((p) => p.selected.value) &&
      peers.some((p) => p.selected.value);
    const indeterminate = !peers.every((p) => p.selected.value) &&
      peers.some((p) => p.selected.value);
    const onClick = () =>
      batch(() => {
        peers.forEach((peer) => peer.selected.value = !checked);
      });
    return { checked, indeterminate, onClick };
  });

  return (
    <table>
      <thead>
        <tr>
          <th scope="col">
            <input
              type="checkbox"
              {...$allCheckboxProps.value}
            />
          </th>
          <th scope="col">Name</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries($peers.value).map(([id, peer]) => (
          <tr key={id}>
            <td>
              <input
                type="checkbox"
                checked={peer.selected}
                onClick={() => peer.selected.value = !peer.selected.peek()}
              />
            </td>
            <td>{peer.name}</td>
            <td>{peer.state}</td>
          </tr>
        ))}
        {!Object.values($peers.value).length && (
          <tr>
            <td colSpan={4}>
              <h6 className="text-center">
                <strong>No peers available.</strong>
              </h6>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
