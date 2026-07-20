import type { PublishedRetrospective } from '../../api/types'
import { RetrospectiveCard } from './RetrospectiveCard'

export function RetrospectiveGrid({ retrospectives }: { retrospectives: PublishedRetrospective[] }) {
  return <div className="story-grid">{retrospectives.map((item) => <RetrospectiveCard key={item.id} retrospective={item} />)}</div>
}
