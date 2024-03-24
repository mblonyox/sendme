import { $peers } from "../lib/state.ts";

export default function PeerList() {
  const peers = Object.entries($peers.value);
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Name</th>
          <th scope="col">Status</th>
          <th scope="col">
            <input
              type="checkbox"
              checked={peers.every(([_, p]) => p.checked) &&
                peers.some(([_, p]) => p.checked)}
              indeterminate={!peers.every(([_, p]) => p.checked) &&
                peers.some(([_, p]) => p.checked)}
              onClick={() => {
                const value = peers.every(([_, p]) => p.checked);
                $peers.value = Object.fromEntries(
                  peers.map((
                    [id, peer],
                  ) => [id, { ...peer, checked: !value }]),
                );
              }}
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {peers.map((
          [id, peer],
          index,
        ) => (
          <tr key={id}>
            <th scope="row">{index + 1}</th>
            <td>{peer.name}</td>
            <td>{peer.status}</td>
            <td>
              <input
                type="checkbox"
                checked={peer.checked}
                onClick={() => {
                  $peers.value = {
                    ...$peers.peek(),
                    [id]: { ...peer, checked: !peer.checked },
                  };
                }}
              />
            </td>
          </tr>
        ))}
        {!peers.length && (
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
