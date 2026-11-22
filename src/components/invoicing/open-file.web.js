import { api } from "../../services/api";

// ======================================================
// Opening a document (web)
// ======================================================
//
// In the browser a PDF opens in a new tab, other files
// (CSV) are downloaded.
// ======================================================

const TYPES = {
  pdf: "application/pdf",
  csv: "text/csv",
};

export async function shareFile(filename, content) {
  const extension = filename.split(".").pop();
  const blob = new Blob([content], { type: TYPES[extension] ?? "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  if (extension === "pdf" && window.open(url, "_blank")) {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function openBusinessFile(businessId, path, filename, accessToken) {
  const bytes = await api.downloadBusinessFile(businessId, path, accessToken);

  await shareFile(filename, bytes);
}

export function openDocumentPdf(businessId, document, accessToken) {
  return openBusinessFile(
    businessId,
    `/documents/${document.id}/pdf`,
    `${document.number}.pdf`,
    accessToken
  );
}
