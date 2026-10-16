/** What the player will see: the notification on the phone, and the same message in his Courrier. */
export default function Apercu({ titre, texte, rangement }: { titre: string; texte: string; rangement: string }) {
  return (
    <div className="nm-apercu" aria-label="Aperçu du message">
      <p className="nm-ap-k">Aperçu · ce que le joueur verra</p>
      <div className="nm-tel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={34} height={34} />
        <div className="nm-tel-txt">
          <span className="nm-tel-app">Lions Eugies · maintenant</span>
          <b>{titre || "Titre du message"}</b>
          <span>{texte || "Texte du message"}</span>
        </div>
      </div>
      <p className="nm-ap-c">📬 Une copie arrive aussi dans son Courrier → <b>{rangement}</b></p>
    </div>
  );
}
