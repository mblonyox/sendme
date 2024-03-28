import { filesize } from "filesize";

import { $peers } from "../lib/state.ts";

export default function TransferList() {
  const fileTransfers = Object.values($peers.value)
    .flatMap((peer) =>
      Object.values(peer.fileTransfers.value)
        .map((fileTransfer) => ({
          peer,
          fileTransfer,
        }))
    );

  return (
    <table>
      <thead>
        <tr>
          <th scope="col">File</th>
          <th scope="col">Peer</th>
          <th scope="col">Status / Progress</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {fileTransfers.map(({ fileTransfer, peer }) => (
          <tr>
            <td>
              {fileTransfer.file.name} -{" "}
              {filesize(fileTransfer.file.size, { standard: "jedec" })}
            </td>
            <td>{peer.name}</td>
            <td>
              {fileTransfer.state.value}&nbsp; ({Math.ceil(
                fileTransfer.progress.value * 100 / fileTransfer.file.size,
              )}%)
            </td>
            <td>
              <div className="grid">
                {!!fileTransfer.downloadLink.value && (
                  <a
                    role="button"
                    className="outline"
                    href={fileTransfer.downloadLink.value}
                    download={fileTransfer.file.name}
                    target="_blank"
                  >
                    💾
                  </a>
                )}
                {fileTransfer.state.value === "pending" && (
                  <>
                    <div
                      role="button"
                      className="outline"
                      onClick={(event) => {
                        event.preventDefault();
                        fileTransfer.accept();
                      }}
                    >
                      ✅
                    </div>
                    <div
                      role="button"
                      className="outline"
                      onClick={(event) => {
                        event.preventDefault();
                        fileTransfer.deny();
                      }}
                    >
                      ❌
                    </div>
                  </>
                )}
                <div
                  role="button"
                  className="outline secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    fileTransfer.cancel();
                    peer.removeTransfer(fileTransfer);
                  }}
                >
                  🗑️
                </div>
              </div>
            </td>
          </tr>
        ))}
        {!fileTransfers.length && (
          <tr>
            <td colSpan={4}>
              <h6 className="text-center">
                <strong>No file transfers data.</strong>
              </h6>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
