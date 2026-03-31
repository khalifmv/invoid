import type { ProductMediaDraft } from '../types'

export const MAX_PRODUCT_IMAGES = 5
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
export const PRODUCT_IMAGE_INPUT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

const MAX_IMAGE_DIMENSION = 1800
const THUMBNAIL_SIZE = 240

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to encode image.'))
        return
      }

      resolve(blob)
    }, type, quality)
  })
}

const loadImageElement = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to read image file.'))
    }

    image.src = objectUrl
  })
}

const buildMainImageBlob = async (file: File, quality: number): Promise<Blob> => {
  const image = await loadImageElement(file)
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = longestEdge > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestEdge : 1

  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to process image on this browser.')
  }

  context.drawImage(image, 0, 0, width, height)

  return canvasToBlob(canvas, 'image/webp', quality)
}

const buildThumbnailDataUrl = async (blob: Blob): Promise<string> => {
  const image = await loadImageElement(blob)
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_SIZE
  canvas.height = THUMBNAIL_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create image preview.')
  }

  const scale = Math.max(THUMBNAIL_SIZE / image.naturalWidth, THUMBNAIL_SIZE / image.naturalHeight)
  const sourceWidth = THUMBNAIL_SIZE / scale
  const sourceHeight = THUMBNAIL_SIZE / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    THUMBNAIL_SIZE,
    THUMBNAIL_SIZE,
  )

  return canvas.toDataURL('image/webp', 0.78)
}

export const validateProductImageFile = (file: File): string | null => {
  if (!file.type.startsWith('image/')) {
    return 'Only image files are supported.'
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    return 'Each image must be 2MB or smaller.'
  }

  return null
}

export const processProductImageFile = async (file: File): Promise<Omit<ProductMediaDraft, 'sortOrder' | 'isCover'>> => {
  const validationError = validateProductImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const qualityLevels = [0.85, 0.74, 0.62]
  let processedBlob: Blob | null = null

  for (const quality of qualityLevels) {
    const candidate = await buildMainImageBlob(file, quality)
    if (candidate.size <= MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      processedBlob = candidate
      break
    }
  }

  if (!processedBlob) {
    throw new Error('Image is still too large after compression. Please pick a smaller image.')
  }

  const thumbnailDataUrl = await buildThumbnailDataUrl(processedBlob)

  return {
    fileName: file.name,
    mimeType: processedBlob.type || 'image/webp',
    sizeBytes: processedBlob.size,
    originalBlob: processedBlob,
    thumbnailDataUrl,
  }
}
