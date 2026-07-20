import { useState } from 'react'

type ContentImageProps = {
  src?: string | null
  alt: string
  className?: string
}

function isSecureImageUrl(src?: string | null) {
  if (!src) return false
  try {
    return new URL(src).protocol === 'https:'
  } catch {
    return false
  }
}

export function ContentImage({ src, alt, className = '' }: ContentImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const showImage = isSecureImageUrl(src) && failedSource !== src

  return <div className={`content-image ${className}`.trim()}>
    {showImage
      ? <img src={src!} alt={alt} onError={() => setFailedSource(src!)} />
      : <div className="content-image__fallback" role="img" aria-label={`${alt} image unavailable`}><span aria-hidden="true">C</span><strong>{alt}</strong></div>}
  </div>
}
