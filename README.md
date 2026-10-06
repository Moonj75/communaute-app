# SC Lions d'Eugies — application du club

Application web du club : connexion sécurisée par lien e-mail, espace joueur et administration.

- **Next.js 15** (App Router) hébergé sur **Vercel**
- **Supabase** : base de données, connexion (« magic link ») et règles d'accès (RLS)

## Étape 1 (cette version)

- Page de connexion sans mot de passe : seules les adresses enregistrées dans la table `membres` peuvent se connecter.
- Rôles **Administrateur** et **Joueur**.
- Page d'accueil personnalisée (« Bonjour Mongi 🦁 »), avec des cartes différentes selon le rôle.
- Page **/admin** : ajouter des membres, changer leur rôle, les activer ou les désactiver.

## Mise en place

1. **Supabase → SQL Editor** : coller le contenu de `supabase/schema.sql`, puis cliquer sur **Run**.
2. **Vercel → Environment Variables** :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. **Supabase → Authentication → URL Configuration** :
   - Site URL : l'adresse Vercel, par exemple `https://lions-eugies.vercel.app`
   - Redirect URLs : `https://lions-eugies.vercel.app/**`

Ne jamais mettre la clé `secret` / `service_role` dans le code ni dans ce dépôt.

## Travailler en local (facultatif)

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Étape 4 : tout le club dans l'application

Menu adapté à chaque personne :

- **Tous** : Accueil, Calendrier, Mes inscriptions (bouton « Répondre » vers le formulaire Tally), Ma fiche.
- **Administrateurs** : Tableau de bord des inscriptions, Planning (tâches et rappels modifiables, enregistrés dans Notion), Joueurs.

La connexion Notion « Lions Eugies App » doit être reliée à toute la page **Deplacements** et avoir les capacités
« Lire », « Mettre à jour » et « Insérer » (pour le planning).
