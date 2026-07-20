export function Rating({ value }: { value: number }) {
  return <div className="rating" aria-label={`Rated ${value} out of 10`}><strong>{value}</strong><span>/10</span></div>
}
