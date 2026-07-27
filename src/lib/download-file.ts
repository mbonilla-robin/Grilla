/** Force-download a remote file (works for cross-origin videos/images). */
export async function downloadFile(url: string, fileName: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo descargar ${fileName || "archivo"}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
