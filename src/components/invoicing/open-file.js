import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

import { api } from "../../services/api";

// ======================================================
// Opening a document
// ======================================================
//
// Downloads a PDF or CSV of the business into the cache
// and opens the share sheet. On iOS that shows a preview
// with print, mail, save to Files and AirDrop.
// ======================================================

const TYPES = {
  pdf: { mimeType: "application/pdf", UTI: "com.adobe.pdf" },
  csv: { mimeType: "text/csv", UTI: "public.comma-separated-values-text" },
};

// Writes bytes or text to the cache and opens the share sheet.
export async function shareFile(filename, content) {
  const file = new File(Paths.cache, filename);

  if (file.exists) {
    file.delete();
  }

  file.create();
  file.write(content);

  const extension = filename.split(".").pop();

  await Sharing.shareAsync(file.uri, TYPES[extension] ?? {});
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
