"use client";

import { useState } from "react";

/** The club photo on the home page (public/accueil.webp); nothing shown if the file is not there. */
export default function PhotoAccueil() {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <figure className="acc-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/accueil.webp" alt="Les Lions d'Eugies" loading="lazy" onError={() => setOk(false)} />
    </figure>
  );
}
