import type { Game } from '../../api/types'
import { GameCard } from './GameCard'

export function GameGrid({ games }: { games: Game[] }) {
  return <div className="game-grid">{games.map((game) => <GameCard key={game.id} game={game} />)}</div>
}
