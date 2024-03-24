import { $transfers } from "../lib/state.ts";

export default function TransferList() {
  const transfers = Object.entries($transfers.value);
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">File</th>
          <th scope="col">Peer</th>
          <th scope="col">Progress</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {transfers.map(([id, t], index) => (
          <tr key={id}>
            <th scope="row">{index + 1}</th>
            <td>{t.fileName}</td>
            <td>{t.peerName}</td>
            <td>{t.progress / t.size}</td>
            <td></td>
          </tr>
        ))}
        {!transfers.length && (
          <tr>
            <td colSpan={5}>
              <h6 className="text-center">
                <strong>No transfers available.</strong>
              </h6>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
