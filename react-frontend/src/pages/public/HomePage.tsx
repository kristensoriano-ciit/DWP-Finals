import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import type { PagedResponse, PublishedRetrospective } from '../../api/types'
import { EmptyState, LoadingState, PageError } from '../../components/feedback/Feedback'
import { ContentImage } from '../../components/layout/ContentImage'
import { Rating } from '../../components/retrospectives/Rating'
import { RetrospectiveGrid } from '../../components/retrospectives/RetrospectiveGrid'
import { errorMessage } from './query'

type HomeData = { key: number; newest?: PagedResponse<PublishedRetrospective>; best?: PagedResponse<PublishedRetrospective>; newestError?: string; bestError?: string }

export function HomePage() {
  const [data, setData] = useState<HomeData>({ key: -1 })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([
      listPublishedRetrospectives({ sort: 'newest', pageSize: 4 }, controller.signal),
      listPublishedRetrospectives({ sort: 'best', pageSize: 3 }, controller.signal),
    ]).then(([newest, best]) => {
      if (controller.signal.aborted) return
      setData({
        key: retryKey,
        newest: newest.status === 'fulfilled' ? newest.value : undefined,
        best: best.status === 'fulfilled' ? best.value : undefined,
        newestError: newest.status === 'rejected' ? errorMessage(newest.reason) : undefined,
        bestError: best.status === 'rejected' ? errorMessage(best.reason) : undefined,
      })
    })
    return () => controller.abort()
  }, [retryKey])

  if (data.key !== retryKey) return <LoadingState label="Loading featured retrospectives..." />
  if (!data.newest && !data.best) return <PageError message={data.newestError || data.bestError || 'Retrospectives could not be loaded.'} onRetry={() => setRetryKey((key) => key + 1)} />
  const featured = data.newest?.items[0]

  return <>
    {featured ? <section className="featured" aria-labelledby="featured-title"><ContentImage src={featured.imageUrl} alt={featured.title} /><div className="featured__overlay" /><div className="featured__content"><p className="eyebrow">Featured retrospective</p><p className="game-name">{featured.gameTitle}</p><h1 id="featured-title">{featured.title}</h1><p className="featured__summary">{featured.reviewContent.slice(0, 240)}</p><div className="featured__footer"><Link className="read-link" to={`/retrospectives/${featured.id}`}>Read the story <span aria-hidden="true">→</span></Link><Rating value={featured.rating} /></div></div></section>
      : <EmptyState title="No retrospectives yet"><p>Published stories will appear here.</p></EmptyState>}
    {data.newestError && <PageError message={`Newest stories: ${data.newestError}`} />}
    {data.newest && data.newest.items.length > 1 && <section className="latest" aria-labelledby="latest-title"><div className="section-heading"><div><p className="eyebrow">From the archive</p><h2 id="latest-title">Latest retrospectives</h2></div><Link to="/retrospectives">View all <span aria-hidden="true">→</span></Link></div><RetrospectiveGrid retrospectives={data.newest.items.slice(1)} /></section>}
    <section className="latest" aria-labelledby="best-title"><div className="section-heading"><div><p className="eyebrow">Highest rated</p><h2 id="best-title">The best remembered</h2></div><Link to="/retrospectives?sort=best">View all <span aria-hidden="true">→</span></Link></div>{data.bestError ? <PageError message={data.bestError} /> : data.best && <RetrospectiveGrid retrospectives={data.best.items} />}</section>
  </>
}
