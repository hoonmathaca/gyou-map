/**
 * 사진을 업로드 전에 줄인다 — 휴대폰 원본(수 MB)을 그대로 올리지 않도록
 * 긴 변 1200px, JPEG 품질 0.82 로 다시 그린다.
 */
export async function shrinkImage(file: File, maxSize = 1200, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있어요.')
  }
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('사진을 처리하지 못했어요.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('사진을 처리하지 못했어요.')
  return blob
}

function loadBitmap(file: File): Promise<ImageBitmap> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file).catch(() => loadWithImg(file))
  }
  return loadWithImg(file)
}

function loadWithImg(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      // ImageBitmap 과 같은 방식으로 쓰려고 canvas 없이도 그릴 수 있는 객체를 흉내 낸다
      resolve(img as unknown as ImageBitmap)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('사진을 읽지 못했어요. 다른 사진을 골라 주세요.'))
    }
    img.src = url
  })
}
