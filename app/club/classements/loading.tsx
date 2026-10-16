/** Shown at once while the ranking arrives (usually a fraction of a second now that it is kept in cache). */
export default function Chargement() {
  return (
    <main className="wrap cl-attente" aria-busy="true" aria-label="Chargement du classement">
      <div className="cl-att-t" />
      {Array.from({ length: 9 }, (_, i) => <div key={i} className="cl-att-l" style={{ animationDelay: `${i * 70}ms` }} />)}
    </main>
  );
}
