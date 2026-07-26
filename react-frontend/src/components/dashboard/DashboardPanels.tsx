import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listGames } from '../../api/gamesApi'
import { listPublishedRetrospectives } from '../../api/retrospectivesApi'
import type { Game, PublishedRetrospective } from '../../api/types'
import { EmptyState, LoadingState, PageError } from '../feedback/Feedback'
import { GameGrid } from '../games/GameGrid'
import { RetrospectiveGrid } from '../retrospectives/RetrospectiveGrid'

type PanelState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; items: T[] }
  | { status: 'error' }

const loadingState = { status: 'loading' } as const

export function DashboardPanels() {
  const [newReleases, setNewReleases] = useState<PanelState<Game>>(loadingState)
  const [upcomingReleases, setUpcomingReleases] = useState<PanelState<Game>>(loadingState)
  const [bestRetrospectives, setBestRetrospectives] = useState<PanelState<PublishedRetrospective>>(loadingState)

  useEffect(() => {
    const controller = new AbortController()
    const options = { page: 1, pageSize: 3 } as const

    listGames({ ...options, releaseWindow: 'new' }, controller.signal)
      .then((result) => setNewReleases({ status: 'loaded', items: result.items }))
      .catch(() => { if (!controller.signal.aborted) setNewReleases({ status: 'error' }) })
    listGames({ ...options, releaseWindow: 'upcoming' }, controller.signal)
      .then((result) => setUpcomingReleases({ status: 'loaded', items: result.items }))
      .catch(() => { if (!controller.signal.aborted) setUpcomingReleases({ status: 'error' }) })
    listPublishedRetrospectives({ ...options, sort: 'best' }, controller.signal)
      .then((result) => setBestRetrospectives({ status: 'loaded', items: result.items }))
      .catch(() => { if (!controller.signal.aborted) setBestRetrospectives({ status: 'error' }) })

    return () => controller.abort()
  }, [])

  return <div className="dashboard-panels">
    <section className="latest" aria-labelledby="new-releases-title">
      <div className="section-heading"><div><p className="eyebrow">Recently launched</p><h2 id="new-releases-title">New Releases</h2></div><Link to="/games?releaseWindow=new">View all <span aria-hidden="true">→</span></Link></div>
      {newReleases.status === 'loading' ? <LoadingState label="Loading new releases..." /> : newReleases.status === 'error' ? <PageError message="New releases could not be loaded." /> : newReleases.items.length ? <GameGrid games={newReleases.items} /> : <EmptyState title="No new releases"><p>New releases will appear here.</p></EmptyState>}
    </section>
    <section className="latest" aria-labelledby="upcoming-releases-title">
      <div className="section-heading"><div><p className="eyebrow">On the horizon</p><h2 id="upcoming-releases-title">Upcoming Releases</h2></div><Link to="/games?releaseWindow=upcoming">View all <span aria-hidden="true">→</span></Link></div>
      {upcomingReleases.status === 'loading' ? <LoadingState label="Loading upcoming releases..." /> : upcomingReleases.status === 'error' ? <PageError message="Upcoming releases could not be loaded." /> : upcomingReleases.items.length ? <GameGrid games={upcomingReleases.items} /> : <EmptyState title="No upcoming releases"><p>Upcoming releases will appear here.</p></EmptyState>}
    </section>
    <section className="latest" aria-labelledby="best-retrospectives-title">
      <div className="section-heading"><div><p className="eyebrow">Highest rated</p><h2 id="best-retrospectives-title">Best Retrospectives</h2></div><Link to="/retrospectives?sort=best">View all <span aria-hidden="true">→</span></Link></div>
      {bestRetrospectives.status === 'loading' ? <LoadingState label="Loading best retrospectives..." /> : bestRetrospectives.status === 'error' ? <PageError message="Best retrospectives could not be loaded." /> : bestRetrospectives.items.length ? <RetrospectiveGrid retrospectives={bestRetrospectives.items} /> : <EmptyState title="No retrospectives yet"><p>Published retrospectives will appear here.</p></EmptyState>}
    </section>
  </div>
}
