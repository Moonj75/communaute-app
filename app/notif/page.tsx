import { Suspense } from "react";
import FenetreNotif from "./FenetreNotif";

// A ready-made page (served at once, without waiting for the server): it shows what the
// notification carried, and completes it in the background.
export const dynamic = "force-static";
export const metadata = { title: "Message · SC Lions d'Eugies" };

export default function Notif() {
  return (
    <Suspense fallback={<div className="fm-fond fm-page" />}>
      <FenetreNotif />
    </Suspense>
  );
}
