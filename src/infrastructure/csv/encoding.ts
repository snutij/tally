export function decodeFileContent(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  // If UTF-8 decoding produces replacement characters, fall back to Latin-1
  if (utf8.includes("\uFFFD")) {
    return buffer.toString("latin1");
  }
  return utf8;
}
