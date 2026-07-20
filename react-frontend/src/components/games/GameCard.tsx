import { Link } from 'react-router-dom'
import type { Game } from '../../api/types'
import { ContentImage } from '../layout/ContentImage'

export function GameCard({ game }: { game: Game }) {
  return <article className="game-card">
    <Link className="game-card__image" to={`/games/${game.id}`} aria-label={`View ${game.title}`}><ContentImage src={game.coverImageUrl} alt={`${game.title} cover`} /></Link>
    <div className="game-card__body"><time dateTime={game.releaseDate}>{new Date(`${game.releaseDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time><h2><Link to={`/games/${game.id}`}>{game.title}</Link></h2>{game.description && <p>{game.description}</p>}</div>
  </article>
}
