import { supabase } from './supabase'

const BUCKET = 'note-media'

/**
 * Upload a file (Blob/File) to Supabase Storage and return the public URL.
 * Files are stored under the user's ID folder: {userId}/{timestamp}-{name}
 */
export async function uploadMedia(file: Blob, fileName: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('Nicht eingeloggt')

  // Unique file path: userId/timestamp-filename
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin'
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `${userId}/${safeName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '31536000', // 1 year cache
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

/**
 * Convert a Base64 data URL to a Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream'
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}
