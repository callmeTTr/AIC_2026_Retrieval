const CLOUDFLARE_VIDEO_BASE_URL =
  "https://pub-832fe982f0f24242813555397c57a710.r2.dev";

export function getOriginalVideoUrl(
  videoId: string,
): string {
  const normalizedVideoId = videoId
    .trim()
    .replace(/\.mp4$/i, "");

  if (!normalizedVideoId) {
    return "";
  }

  return (
    `${CLOUDFLARE_VIDEO_BASE_URL}/` +
    `${encodeURIComponent(normalizedVideoId)}.mp4`
  );
}