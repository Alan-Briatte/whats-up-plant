/**
 * Normalizes and returns the image DataURL or URL so it can be stored directly
 * in SQLite (`imagesJson` / `imageUrl`) and rendered immediately by Next.js
 * without static file caching issues.
 */
export async function persistDiagnosisPhoto(
  imageBase64OrUrl: string
): Promise<string> {
  return (imageBase64OrUrl || "").trim();
}

export async function persistDiagnosisPhotos(
  images: string[]
): Promise<string[]> {
  return images.map((img) => (img || "").trim()).filter(Boolean);
}
