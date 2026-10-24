# power spirit — Design System (MASTER)

> Source de vérité du design. Les valeurs vivent dans `app/tokens.css` ; les composants n'utilisent que les **tokens sémantiques** (`--bg`, `--surface`, `--text`, `--primary`…), jamais un hex brut.

## 1. Concept
Un fantôme qui porte l'éclair : **l'esprit** (ce qui passe sans laisser de trace) + **power** (la vitesse du transfert). Produit : messages et fichiers éphémères sur un réseau local. Promesse : **« Discute. Partage. Disparais. »**
Style : *néo-brutalisme joueur* — contours d'encre 2 px, ombres dures décalées, aplats vifs, fond ciel pointillé. Lisible, tactile, amical ; jamais « corporate ».

## 2. Couleurs
| Rôle | Token | Valeur | Usage | Contraste sur encre/papier |
|---|---|---|---|---|
| Encre | `--ps-ink` | `#1D1B2E` | texte, contours, ombres | 16,8:1 sur papier |
| Papier | `--ps-paper` | `#FFFFFF` | surfaces | — |
| Ciel | `--ps-sky` | `#DFF3FF` | fond de l'app | encre 14,7:1 |
| Soleil | `--ps-sun` | `#FFD23F` | **action principale**, éclair | encre 11,6:1 |
| Esprit | `--ps-violet` | `#B9A8FF` | mascotte, en-tête, admin | encre 8,1:1 |
| Menthe | `--ps-mint` | `#5FD6A4` | succès, « mes messages » | encre 9,3:1 |
| Corail | `--ps-coral` | `#FF6F61` | alerte, exclusion | encre 6,2:1 |
| Violet profond | `--ps-violet-deep` | `#4B35C9` | liens, accents texte | 7,9:1 sur papier |
| Encre douce | `--ps-ink-soft` | `#4A4766` | texte secondaire | 8,8:1 sur papier |

Règles : une seule action principale (jaune) par écran · le texte sur aplat coloré est **toujours encre** · l'information n'est jamais portée par la couleur seule (icône ou libellé en plus) · le violet clair ne sert pas de couleur de texte.
**Mode sombre** : mêmes rôles, valeurs retravaillées (`#14121F` fond, `#1D1B2E` surface, contours lavande) — pas une inversion. Suit `prefers-color-scheme`, forçable via `data-theme="light|dark"`.

## 3. Typographie (auto-hébergée, licence OFL)
- **Bricolage Grotesque** 700–800 — logo, titres, boutons.
- **Figtree** 400–700 — texte courant, 16 px / interligne 1,5.
- **JetBrains Mono** 500 — heures, tailles de fichier.
Échelle : 12 · 14 · 16 · 18 · 24 · 32 · 44 px. Titres : interlettrage −0,015 em.

## 4. Forme, espace, mouvement
- Bordure 2 px encre · rayons 6 / 10 / 16 px · ombres dures 2 / 4 / 6 px (décalage, flou 0).
- Grille 4 px : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Cible tactile ≥ **44 px**.
- Survol : le bouton se soulève ; clic : il s'enfonce dans son ombre. 120–200 ms, `cubic-bezier(.2,.8,.2,1)`. `prefers-reduced-motion` respecté.
- Z-index : header 10 · overlay 50 · toast 100.

## 5. Composants (classes existantes de l'app)
`button` (jaune, ombre dure) · `.chan` / `.chan.active` · `.msg` / `.msg.mine` (menthe) · `.sys` · `.pill` · `.tag` · `.badge` · `.file` · `.composer` · `.toast` · `.upload` · `.empty` (mascotte endormie).
Icônes : `app/components/Icon.js` (trait 2,25 px, bouts ronds). **Pas d'emoji structurel** ; les avatars-emoji des personnes sont des identités, ils restent.

## 6. Mascotte (3 humeurs)
`idle` (accueil, logo) · `sleep` (salon vide) · `wow` (fichier reçu, réussite). Composant : `Logomark mood=…`.

## 7. Anti-patterns
Emoji comme icône · ombres floues · dégradés · plusieurs boutons jaunes sur un écran · texte gris sur ciel · logo étiré, recoloré ou sur fond bruyant · animation > 300 ms.
