import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import { displayName, getVue } from "@/lib/profil";
import { lireExercices } from "@/lib/club";
import FicheExercice from "@/components/entrainements/FicheExercice";

export const dynamic = "force-dynamic";

/** One exercise sheet (video, how it goes, aim, equipment). */
export default async function ExercicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profil, apercu } = await getVue();
  if (!user) redirect("/login");
  const [exercices, { data }] = await Promise.all([lireExercices().catch(() => []), supabase.from("joueurs").select("roles").eq("email", (user.email || "").toLowerCase())]);
  const e = exercices.find((x) => x.id === id || x.id.replace(/-/g, "") === id.replace(/-/g, ""));
  if (!e) notFound();
  const entraineur = (profil?.role === "admin" && !apercu) || ((data || []) as { roles: string[] | null }[]).some((f) => (f.roles || []).includes("🎓 Entraîneur"));
  return (
    <>
      <Header subtitle={`Exercice ${e.code || ""}`} profil={profil} name={displayName(profil, user.email)} apercu={apercu} />
      <main className="wrap">
        <FicheExercice e={e} peutEditer={entraineur} />
      </main>
    </>
  );
}
