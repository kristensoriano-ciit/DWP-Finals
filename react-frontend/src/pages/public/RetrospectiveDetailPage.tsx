import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { getPublishedRetrospective } from '../../api/retrospectivesApi'
import type { PublishedRetrospective } from '../../api/types'
import { LoadingState, PageError } from '../../components/feedback/Feedback'
import { ContentImage } from '../../components/layout/ContentImage'
import { Rating } from '../../components/retrospectives/Rating'
import { errorMessage } from './query'

export function RetrospectiveDetailPage() {
  const { retrospectiveId = '' } = useParams()
  const [retryKey, setRetryKey] = useState(0)
  const requestKey = `${retrospectiveId}|${retryKey}`
  const [response, setResponse] = useState<{ key: string; item: PublishedRetrospective | null; error: unknown }>({ key: '', item: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    getPublishedRetrospective(retrospectiveId, controller.signal).then((item) => setResponse({ key: requestKey, item, error: null })).catch((reason: unknown) => { if (!controller.signal.aborted) setResponse({ key: requestKey, item: null, error: reason }) })
    return () => controller.abort()
  }, [retrospectiveId, retryKey, requestKey])

  if (response.key !== requestKey) return <LoadingState label="Loading retrospective..." />
  const { item, error } = response
  if (error instanceof ApiError && error.status === 404) return <section className="page-message"><h1>Retrospective not found</h1><p>This story is unavailable or no longer published.</p><Link to="/retrospectives">Browse retrospectives</Link></section>
  if (error || !item) return <PageError message={errorMessage(error)} onRetry={() => setRetryKey((key) => key + 1)} />
  return <article className="retrospective-detail"><header><p className="eyebrow"><Link to={`/games/${item.gameId}`}>{item.gameTitle}</Link></p><h1>{item.title}</h1><div className="article-meta"><span>By {item.authorDisplayName}</span><time dateTime={item.publishedAtUtc}>{new Date(item.publishedAtUtc).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time><Rating value={item.rating} /></div></header><ContentImage src={item.imageUrl} alt={item.title} className="article-image" /><div className="article-body">{item.reviewContent.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>
}
