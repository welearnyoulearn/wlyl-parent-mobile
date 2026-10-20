import { Directory, File, Paths } from 'expo-file-system'
import { Asset } from 'expo-asset'
import { API_ORIGIN } from '@/lib/api'

// Downloaded textbooks live in <documents>/library/<material_id>.pdf, next to
// the bundled PDF.js reader (viewer.html) that opens them offline (#9).
const dir = () => new Directory(Paths.document, 'library')

export const bookFile = (id: number) => new File(dir(), `${id}.pdf`)

export const isDownloaded = (id: number) => bookFile(id).exists

/** Library file_url is either a path on the school server or an absolute Cloudinary/R2 URL. */
export function resolveBookUrl(fileUrl: string): string | null {
  const url = fileUrl.startsWith('/') ? `${API_ORIGIN}${fileUrl}` : fileUrl
  return /^https?:\/\//.test(url) ? url : null
}

export async function downloadBook(
  id: number,
  fileUrl: string,
  onProgress: (fraction: number | null) => void,
  signal: AbortSignal,
): Promise<void> {
  const url = resolveBookUrl(fileUrl)
  if (!url) throw new Error('This book has no valid download link.')
  dir().create({ idempotent: true, intermediates: true })
  // Download to .part and rename, so a cancelled or failed download never looks finished.
  const part = new File(dir(), `${id}.pdf.part`)
  await File.downloadFileAsync(url, part, {
    idempotent: true,
    signal,
    onProgress: ({ bytesWritten, totalBytes }) => onProgress(totalBytes > 0 ? bytesWritten / totalBytes : null),
  })
  part.move(bookFile(id), { overwrite: true })
}

export function deleteBook(id: number): void {
  const file = bookFile(id)
  if (file.exists) file.delete()
}

/** Removes every downloaded book — called on sign-out so the next parent on this phone starts clean. */
export function clearBooks(): void {
  const d = dir()
  if (d.exists) d.delete()
}

/** file:// URI of the reader for one downloaded book. Re-copied each time so an app update ships a new reader. */
export async function readerUri(id: number): Promise<string> {
  const [asset] = await Asset.loadAsync(require('../../assets/pdf-viewer.html'))
  if (!asset.localUri) throw new Error('Reader failed to load.')
  const viewer = new File(dir(), 'viewer.html')
  new File(asset.localUri).copy(viewer, { overwrite: true })
  return `${viewer.uri}#${id}.pdf`
}

export const libraryDirUri = () => dir().uri
