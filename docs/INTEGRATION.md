# Intégration dans le dépôt

Copier dans le dépôt `power-spirit` (aucune dépendance npm ajoutée) :
```
app/tokens.css  app/fonts.css  app/globals.css  app/layout.js  app/page.js
app/icon.svg  app/apple-icon.png  app/favicon.ico  app/manifest.webmanifest
app/components/Logo.js  app/components/Icon.js
public/brand/**   public/fonts/**
```
`app/page.js` fourni = ton fichier + 12 changements minimes (logo, icônes SVG à la place des emojis, mascotte de l'état vide, boutons icône sur mobile). La logique Socket.IO n'est pas touchée.

**Corrections de texte** trouvées dans le dépôt (mots manquants) : « envoie des **fichiers** » (accueil) et « **Partage** l'adresse de cette page » (salon vide). Dans `server.js` (commentaire ligne 2) il manque aussi « fichiers » : « …relaie les messages et les fichiers en mémoire vive ».

Vérifié : `next build` passe ; rendu contrôlé en 1280 px et 375 px (accueil, salon, message envoyé).
Thème forcé : `<html data-theme="dark">` ou `"light"`.
