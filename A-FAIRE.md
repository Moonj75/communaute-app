# Lions d'Eugies — ce qu'il reste à faire (dans l'ordre)

## 1. Mettre la nouvelle version en ligne (GitHub → Vercel)
1. Dézipper `lions-eugies-complet.zip` sur l'ordinateur.
2. GitHub → dépôt **Moonj75/communaute-app** → **Add file → Upload files**.
3. Glisser **tout le contenu** du dossier dézippé (pas le dossier lui-même) → **Commit changes**.
4. Vercel redéploie tout seul (2-3 min). Vérifier dans Vercel → Deployments que la dernière ligne est verte « Ready ».

## 2. Supabase → SQL Editor (un script à la fois, bouton Run)
- [x] `supabase/etape5-photos.sql` (déjà fait)
- [ ] `supabase/etape6-fiche-notifications.sql` (classements/palmarès sur la fiche + notifications)
- [ ] `supabase/etape7-classements.sql` (tableaux des classements)

Chaque script peut être relancé sans risque.

## 3. Vercel → Settings → Environment Variables
Coller les valeurs directement dans Vercel (jamais dans un chat). Puis **Redeploy**.

| Nom | Où la trouver |
|---|---|
| `NOTION_TOKEN` | déjà en place |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → *secret key* |
| `CRON_SECRET` | inventer un long mot de passe (30 caractères ou plus) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | dans l'appli : Staff → **Notifs** → Réglages → « Générer mes clés » |

## 4. Notion
- Connexion « Lions Eugies App » : cocher **Lire**, **Insérer** et **Mettre à jour** (Paramètres → Connexions).
- Remplir la base **Infos publiques du club** (textes de la page publique /club).

## 5. Dans l'appli, une fois en ligne
1. **Joueurs** (menu Staff) → « Synchroniser avec Notion ».
2. **🔄 MAJ clt** (menu Staff, = mise à jour des classements) → « Vérifier maintenant ».
   - Si un site refuse : télécharger le fichier Excel sur le site officiel et le déposer dans le bloc « Importer un fichier ».
3. **Notifs** (menu Staff) → Réglages : toutes les lignes doivent être ✅.
4. Sur ton téléphone : ouvrir l'appli → « Installer » → **Ma fiche → Notifications → Activer**.
5. Tester avec « 👁️ Voir comme un joueur » (page Joueurs).

## Ce qui tourne tout seul ensuite
- Chaque matin (≈ 9 h) : rappels et notifications automatiques.
- Le **1er de chaque mois** (≈ 8 h) : classements FBFTS + FISTF → appli → Notion.

## Plus tard
- Supprimer les anciens artefacts (sur ta confirmation).
- Calendrier : ajout des événements FISTF / FBFTS dans Notion.
