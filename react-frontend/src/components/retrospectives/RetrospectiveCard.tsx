import { Link } from 'react-router-dom'
import type { PublishedRetrospective } from '../../api/types'
import { ContentImage } from '../layout/ContentImage'
import { Rating } from './Rating'

export function RetrospectiveCard({ retrospective }: { retrospective: PublishedRetrospective }) {
  const summary = retrospective.reviewContent.length > 150 ? `${retrospective.reviewContent.slice(0, 147)}...` : retrospective.reviewContent
  return <article className="story-card">
    <Link className="story-card__image" to={`/retrospectives/${retrospective.id}`} aria-label={`Read ${retrospective.title}`}><ContentImage src={retrospective.imageUrl} alt={retrospective.title} /></Link>
    <div className="story-card__body"><div className="story-card__meta"><Link to={`/games/${retrospective.gameId}`}>{retrospective.gameTitle}</Link><span>By {retrospective.authorDisplayName}</span><time dateTime={retrospective.publishedAtUtc}>{new Date(retrospective.publishedAtUtc).toLocaleDateString()}</time></div><h3><Link to={`/retrospectives/${retrospective.id}`}>{retrospective.title}</Link></h3><p>{summary}</p><Rating value={retrospective.rating} /></div>
  </article>
}
