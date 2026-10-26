import type { Metadata } from "next";
import Header from "@/components/Header";
import GuideInstall from "@/components/GuideInstall";

export const metadata: Metadata = { title: "Installer l'appli – SC Lions d'Eugies" };

/** Public page to send to every member: it shows how to install the app on THEIR phone. */
export default function InstallerPage() {
  return (
    <>
      <Header subtitle="Installer l'appli" />
      <main className="wrap">
        <GuideInstall />
      </main>
    </>
  );
}
