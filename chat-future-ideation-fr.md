# Le chat PostClaw — le prochain chapitre

> **Mise à jour 2026-04-29** — Sprint Acteur+Œil-ouvert livré. Features 3, 5 et 10 shippées (avec quelques déviations vs spec originale, documentées plus bas). Le chat passe de 5 à 7 outils, ferme la boucle action (publish + schedule), et ouvre les yeux sur les outcomes via une snapshot nightly injectée dans le system prompt (plutôt qu'un tool fishing).

## Phase 1 — État des lieux (lecture, pas devinettes)

Ce que le chat à `/d` sait faire et ne sait pas faire aujourd'hui, après lecture complète du surface :

**Capable de :**
1. Streamer une conversation avec Claude Sonnet 4.6 équipé de **7 outils** (`generate_posts`, `update_post`, `regenerate_post`, `delete_draft`, `set_schedule`, **`publish_drafts`**, **`schedule_drafts`**) — voir `chat-tools.ts`.
2. Effacer-et-réécrire les brouillons sur les comptes sélectionnés via `createFromBrief.ts:44-75` (wipe-then-write, advisory lock, atomique par compte).
3. Lire le knowledge base (`User.knowledgeBase`), les comptes connectés, les brouillons en cours, le timezone et les meilleurs créneaux par compte, et tout assembler dans le system prompt — `chat-system-prompt.ts:36-83`.
4. Programmer un horaire sur un brouillon via `set_schedule` (staging seul) **ou commit le schedule complet via `schedule_drafts` (bulk, parallèle, ownership-scoped)**. Idem pour la publication immédiate via `publish_drafts`. Validation Zernio auto-bakée avant chaque commit.
5. Gérer le coût en crédits (2 pts/compte/draft, 1 pt/rewrite) et faire remonter un payload paywall depuis l'intérieur d'un tool result (`chat-tools.ts:94-121`).
6. Survivre à la latence longue de `generate_posts` (`maxDuration` à 240s, `route.ts:23`).
7. Auto-stick le scroll, render le markdown, afficher des pills d'outils.
8. Rate-limit la conversation en sliding-window (20 messages/min) — `route.ts:49-64`.

**Incapable de :**
- Recevoir une image ou une note vocale de l'utilisateur. La textarea à `ChatPanel.tsx:212-225` est text-only.
- Attacher du média (depuis `User.media` ou un upload frais) à un brouillon.
- ~~Réellement publier ou commit un schedule~~ → ✅ **Livré** via `publish_drafts` + `schedule_drafts` (Sprint Acteur, 2026-04-29).
- Persister l'historique de conversation (le chat est éphémère — confirmé dans `CLAUDE.md`).
- ~~Récupérer les performances des posts publiés pour s'en servir dans la conversation.~~ → ✅ **Livré** via `OutcomeSnapshot` (Inngest cron nightly) injecté dans le system prompt — pas de tool fishing.
- Réagir aux events plateforme (compte déconnecté, post en échec, post partiel) que l'utilisateur n'a pas remarqués. *(Les `failedPosts` sont surfaceés dans le contexte outcomes ; la déconnexion compte n'est pas dans le scope du sprint posts-only.)*
- Initier ("salut, voilà 5 brouillons pour la semaine") — le chat est purement réactif.

**Au moins trois signaux non-utilisés déjà dans le code**, par ordre de leverage :

1. **Toute la zone `Insights.inferred` et `Insights.computed.voiceStats` n'arrive jamais dans le system prompt du chat.** `route.ts:130-148` ne récupère que les `weeklySlots` depuis chaque insights. `createFromBrief.ts:201-231` prouve déjà qu'on sait envoyer une belle empreinte vocale au modèle — `avgPostLengthChars`, `emojiDensity`, `hashtagsPerPost`, `inferred.toneSummary`, `inferred.performingPatterns`, `zernio.topPosts.slice(0,3).content` — mais le prompt **du chat** dans `chat-system-prompt.ts` ignore tout ça. **C'est le delta le plus important entre ce qu'on sait sur l'utilisateur et ce que le modèle sait quand il lui parle.** On paie en temps et en tokens pour calculer ces insights, et on les jette à chaque tour de chat.

2. **`User.media` est une table peuplée à laquelle le chat n'a pas accès.** `schema.prisma:22, 156-170` définit une bibliothèque Cloudinary. `SuggestionsBoard.tsx:190-203` sait attacher des `mediaItems` à un `PostSuggestion`. Le chat n'a pas d'outil `attach_media` — et le `ChatPanel` n'a aucun bouton d'upload — donc la chose la plus naturelle qu'un patron de petite entreprise dirait ("voilà une photo, écris-moi quelque chose") ne peut pas être exprimée.

3. ~~**`PostSuggestion.publishedExternalId` (`schema.prisma:150`) est une clé vers le graphe analytics de Zernio, et on ne s'en sert jamais en retour.**~~ → ✅ **Adressé** via `OutcomeSnapshot` (Sprint Œil-ouvert, 2026-04-29). Une cron Inngest nightly à 3h UTC lit `getAnalytics()` sur les 14 derniers jours, calcule top/under/patterns/failed posts par user (≥5 published required), upsert dans `outcome_snapshot`. Le chat charge cette snapshot en parallèle des autres queries au début de chaque request et l'injecte comme bullet list compacte dans le system prompt. Le modèle peut naturellement tisser "ton post X a fait 3× ta moyenne" sans appeler de tool. La déconnexion compte reste hors scope de ce sprint (le webhook Zernio existe mais le chat n'en sait pas).

Restes plus petits qui méritent d'être nommés : `User.websiteUrl` est capturé à l'onboarding et jamais re-scrapé ; `User.businessDescription` double `knowledgeBase` mais n'est pas exposé au chat ; `getAccountsHealth()` éviterait le scénario "j'ai cliqué Schedule et ça a échoué en silence" ; `validatePost()` permettrait un pre-flight de chaque brouillon avant le stage ; le starter prompt à `ChatPanel.tsx:29` est `"Write me 1 posts about my business"` — il y a une faute de grammaire visible sur le tout premier chat de tout nouvel utilisateur.

## Phase 2 — Scan du marché

**Buffer / Hootsuite / Later / Metricool — les schedulers historiques.**
Ce sont des outils marketing calendar-first. Mauvaise forme pour Sarah-la-traiteur dans trois directions : ils imposent un modèle mental de calendrier (la semaine de Sarah n'est pas un calendrier — c'est "on a fait le mariage Whitfield samedi et la vitrine de pâtisseries était belle mardi"), ils traitent la création de contenu comme séparée du scheduling (donc l'utilisateur doit toujours pondre le post lui-même), et leurs features "AI assistant" sont des générateurs de captions one-shot qui produisent du copy générique. **À voler :** la fiabilité des intégrations plateformes de Buffer et leurs primitives de scheduling tristes — quand Zernio est ta colonne vertébrale tu veux zéro drame côté publish, point. **À refuser :** le calendar-as-hero. Le calendrier est pour les marketeurs qui planifient une campagne ; Sarah n'a pas de campagne. Elle a un mardi et un téléphone plein de photos. La minute où on ship un calendrier surface, le produit redevient un outil.

**Postiz / OwlyWriter / Predis.ai / FeedHive / Vista Social — les nouveaux entrants AI-first.**
Predis.ai est le plus intéressant : il génère *image + caption ensemble*, traite le post comme une unité, et c'est directionnellement juste pour les SMBs parce que la photo c'est 80% d'un post Instagram. OwlyWriter (Hootsuite) est un générateur générique enterré dans une app enterprise. Le "conditional posting" de FeedHive est marketer-flavored — IF ceci THEN cela — c'est l'opposé de ce que veut un utilisateur non-tech. **À voler :** la sortie atomique image+caption de Predis comme unité de travail par défaut, et l'habitude de FeedHive de laisser l'utilisateur écrire des règles en langue naturelle (on devrait adopter l'idée des *règles* mais comme mémoire conversationnelle, pas comme éditeur de règles). **À refuser :** les bibliothèques de templates. Une bibliothèque force Sarah à évaluer 40 options ; elle n'a pas de filtre de goût entraîné sur les réseaux sociaux ; elle veut 3 captions pour *cette* photo, là, maintenant. Les templates rabotent aussi la voix — l'empreinte de marque est le moat, pas les templates.

**ChatGPT + Canva (le stack manuel que la plupart des ICP utilisent vraiment aujourd'hui).**
Sarah ouvre ChatGPT, tape "écris-moi un post Instagram sur une tarte aux fraises", obtient une caption générique, copie, ouvre Canva, fait un visuel, ouvre Instagram, colle, programme dans Meta Business Suite. Quatre surfaces, deux logins, zéro mémoire. Chaque dimanche elle ré-explique qui elle est. **À voler :** l'entrée conversationnelle — on l'a déjà. **À refuser :** la tentation d'être un assistant généraliste. Sarah n'a pas besoin d'un mode "écris-moi un poème". La *contrainte* est le moat : PostClaw fait uniquement son social. ChatGPT ne pourra jamais être ça pour elle parce qu'il ne peut pas se souvenir de sa marque entre les sessions de manière load-bearing. Nous, si.

**Le freelance Fiverr — le vrai concurrent.**
200 à 500 € par mois pour quelqu'un à Manille ou à Bali qui gère son IG. La douleur est honnête : décalage horaire, captions en retard, sorties génériques ("✨ Indulge in our delicious...") et 30% de churn du freelance lui-même. Mais la *sensation* du freelance est ce que PostClaw doit reproduire : quelqu'un qui ping un lundi en disant "rien de neuf cette semaine ? envoie-moi tes photos." Sarah se sent écoutée. **À voler :** la cadence de la relation. L'agent doit *initier*. **À refuser :** la fiction des "humains derrière". Ne pas faire semblant. Sarah s'en fout qu'on soit du code si le code feel comme un manager qui la connaît. Ce qui *l'intéresse* c'est que les captions ne sonnent pas comme toutes les autres captions générées par IA sur internet — et ça c'est l'empreinte vocale, et c'est un moat qu'on possède déjà à moitié.

La leçon cristallisée du scan : **les historiques gagnent sur la largeur d'intégration et perdent sur le care**. Les AI-first gagnent sur la nouveauté et perdent sur la voix. ChatGPT gagne sur la flexibilité et perd sur la mémoire. Les freelances gagnent sur la relation et perdent sur le décalage horaire. Le wedge de PostClaw est le seul quadrant restant : **un manager qui se souvient, qui initie, et qui sonne comme l'utilisateur**.

## Phase 3 — Le futur du social (18 prochains mois)

**Pari 1 : Chaque plateforme ship une AI native, gratuite et en un tap.**
Meta AI est déjà dans Instagram. TikTok Symphony écrit des captions gratos. D'ici Q3 2027 chaque dashboard a un bouton "écris-moi un post" qui produit une caption. *Implication pour le chat :* le modèle ne peut pas concourir sur l'écriture de captions seule — il concourt sur *la voix de qui* il écrit, *quel contexte* il écrit (cette semaine, ce plat, ce client), et *est-ce qu'il ship cross-platform avec un schedule*. Le chat doit s'appuyer fort sur l'empreinte vocale et le séquençage cross-platform — ce sont les choses que les AI plateformes ne peuvent structurellement pas faire parce qu'elles ne connaissent que le compte de l'utilisateur, pas le graph de toute sa marque.

**Pari 2 : Le short-form video éclipse le statique pour la découverte SMB.**
Le reach des Reels en 2026 est déjà 5 à 10× un post feed pour les comptes sub-1k ; cet écart se creuse. Sarah ne sait pas monter une vidéo. *Implication pour le chat :* le chat doit accepter une photo ou un clip de 5 secondes et **renvoyer un Reel/short** — captionné, voice-aware, programmé. Si le chat ne ship que des captions texte en 2027, il écrit le genre nécrologique. Le dashboard a déjà Cloudinary ; les configs plateformes encodent déjà `requiresMedia: "video"`. Le câblage existe ; l'outil n'existe pas.

**Pari 3 : La création voice-first devient normale.**
Sarah est dans son van entre deux events. Le mode vocal de ChatGPT a entraîné les utilisateurs à dicter. *Implication pour le chat :* le chat a besoin d'un input vocal, et idéalement d'une **surface non-app** (WhatsApp / Telegram / SMS) où elle peut envoyer une note vocale de 30 secondes et recevoir des brouillons en retour. Le coût marginal de construire ça est bas (Whisper ou Voxtral) ; la différenciation marginale vs Buffer est énorme parce que Buffer est un produit desktop qui essaie de se traduire sur mobile.

**Pari 4 : L'agentic AI devient l'UX par défaut.**
Les utilisateurs en 2027 attendront des outcomes, pas des interfaces. *Implication pour le chat :* le `set_schedule` qui stage-puis-clic est une UX de 2024. Le chat doit pouvoir **commit** — programmer, publier, retry, dépublier — avec un pattern "dis stop dans les 30 prochaines secondes". Aujourd'hui le chat est un demi-agent : il parle comme un manager, puis demande à l'utilisateur de cliquer. Cet écart n'est pas du safety theater ; c'est une fuite de crédibilité. Soit on est un manager, soit on prétend pas l'être.

**Pari 5 : La confiance s'effondre pour le contenu qui sent l'IA.**
"It's giving AI ✨" devient un baiser de la mort dans les commentaires. Les audiences vont sniffer une caption générique en 0,5 seconde d'ici 2027. Les signaux d'authenticité deviennent le moat. *Implication pour le chat :* chaque post doit refléter les idiosyncrasies de l'utilisateur — densité d'emojis, rythme des phrases, stack de hashtags, expressions signature — parce que c'est ce qui défait le vibe AI-detector. On calcule déjà ces choses dans `Insights.computed.voiceStats` ; le chat ne les lit pas. **Ce n'est pas un pari sur le futur — c'est une vulnérabilité immédiate qu'on paie en churn dès maintenant.**

**Pari 6 : SEO local et social fusionnent.**
Posts Google Business Profile, avis Maps, Instagram local-discovery se fondent en une seule surface de découverte locale pour les SMBs. *Implication pour le chat :* une feature "publie une fois → ça atterrit aussi sur Google Business Profile" devient un value prop dominant pour les traiteurs, photographes, salons, restos — l'ICP littéral. Buffer ne mène pas avec ça ; nous on devrait.

## Phase 4 — Design des features

Dix features, classées par leverage × aha-speed. Chacune dans le format demandé.

---

### Feature 1 : Sonner exactement comme toi

**Le aha moment.** Sarah lit le premier brouillon généré et dit à voix haute : "attends — ça sonne vraiment comme moi."

**L'histoire.** Sarah, photographe de mariage à Leeds, a connecté Instagram. Elle tape "écris 3 posts sur le mariage Whitfield". Trois brouillons reviennent : 142 caractères en moyenne, deux emojis, le stack de hashtags qu'elle utilise réellement (`#leedswedding #naturallight #bridalportrait`), sa manie de commencer une caption par un mot-teaser ("Goldenhour."). Elle ne savait pas qu'on savait ça. Maintenant elle sait.

**Pourquoi maintenant.** C'est construit à 95% et juste pas allumé. `Insights.computed.voiceStats`, `Insights.computed.extractedHashtags`, `Insights.inferred.toneSummary`, `Insights.inferred.performingPatterns`, et `Insights.zernio.topPosts.slice(0,3)` sont déjà peuplés par le pipeline analyze-account et déjà câblés dans `createFromBrief.ts:201-231` pour la génération batch. Le system prompt du chat à `chat-system-prompt.ts:36-83` ne forwarde que les `bestTimes`. Le Pari 5 ci-dessus — l'effondrement de la confiance pour le contenu qui sent l'IA — rend ça urgent, pas nice-to-have.

**Comment ça marche dans le chat.** Pas de nouvel outil. Ajouter une fonction `formatVoiceFingerprint(insights: Insights | null): string` dans `src/lib/services/promptContext.ts` qui émet une section `## Voice fingerprint` pour chaque compte *sélectionné*, avec les mêmes données déjà utilisées dans `createFromBrief`. La passer à travers `route.ts:150-174` et ajouter une section dans `buildChatSystemPrompt`. Les empreintes single-platform sont empruntées entre comptes via le mécanisme `voiceBorrowedFromPlatform` qui existe déjà.

**Signaux utilisés.** `Insights.computed.voiceStats`, `Insights.computed.extractedHashtags`, `Insights.inferred.{topics, toneSummary, performingPatterns}`, `Insights.zernio.topPosts[0..2]` (`src/lib/schemas/insights.ts:30-114`).

**Pourquoi les concurrents ne peuvent pas copier vite.** Buffer n'ingère pas du tout les patterns vocaux. Predis s'entraîne sur du contenu stock, pas sur les posts de l'utilisateur. Même ChatGPT, avec le même historique de texte, n'a pas l'extraction structurée d'empreinte qu'on fait déjà tourner. Le terrain compétitif est "écrit comme l'utilisateur", et on est déjà debout dessus sans le réaliser.

**Leverage 10. Aha-speed : instantané sur le premier draft.**

**Critère de kill.** Si `meta.dataQuality === "cold_start"` et qu'on n'a rien à fingerprinter, la section est omise (pas de caricature). Si un utilisateur dit "les captions sonnent *trop* comme moi" (rare mais possible — la mimicry vocale peut être uncanny), on désactive `inferred.performingPatterns` en premier puisque ces patterns généralisent moins bien que les stats brutes.

---

### Feature 2 : Des brouillons à partir d'une photo

**Le aha moment.** Sarah upload une photo de la vitrine de pâtisseries du jour. 30 secondes plus tard elle a 3 posts IG avec cette photo attachée, programmés à ses meilleurs créneaux, captions qui parlent des macarons réels sur la photo.

**L'histoire.** Sarah ferme la boulangerie à 18h. Elle ouvre PostClaw sur son téléphone, tape une petite icône caméra à côté de l'input, choisit deux photos depuis la pellicule. Chat : "Je vois une tarte aux fraises et un meringué citron. Je rédige 3 posts IG et 2 FB — donne-moi 10 secondes." Trois brouillons apparaissent avec l'image déjà attachée, programmés mardi 11h, jeudi 18h, samedi 10h. Elle tap un et clic Post. Fini en 90 secondes, bout en bout.

**Pourquoi maintenant.** L'upload Cloudinary est dans le code (`useCloudinaryUpload.ts`, `MediaUploadModal.tsx`, `api/uploads/sign/route.ts`). `PostSuggestion.mediaItems` porte déjà du média attaché. Sonnet 4.6 supporte l'input vision. Le chat n'a pas de bouton média — l'écart est purement UI plus un outil.

**Comment ça marche dans le chat.** Deux changements. D'abord, ajouter un sélecteur de média dans `ChatPanel` (icône caméra à côté du bouton send, ouvre une sheet pour soit choisir depuis `User.media`, soit upload frais via `useCloudinaryUpload`). Ensuite, ajouter un outil :

```ts
attach_media({
  suggestionIds: string[],   // brouillons stagés à attacher (optionnel — peut tourner pré-génération)
  mediaIds: string[]         // Media.id depuis User.media ou fraîchement uploadé
})
```

Quand l'utilisateur a attaché des photos *avant* d'envoyer le message, on les route comme des `image` parts sur le user message via AI SDK (Sonnet 4.6 les voit) ET on stocke les `mediaIds` pour que `generate_posts` produise des brouillons avec `mediaItems` pré-peuplé.

**Signaux utilisés.** `User.media`, vision input sur le user message, `Insights.computed.voiceStats` (empreinte vocale), `requiresMedia` plateforme pour le steering, `accountsBestTimes` pour le scheduling.

**Pourquoi les concurrents ne peuvent pas copier vite.** Buffer te laisse upload du média sur un brouillon mais ne génère pas de captions brand-aware sur ce qui est *dans* la photo. Predis a la génération d'images mais n'ingère pas tes photos. ChatGPT peut décrire une photo mais ne va pas programmer un post ni connaître tes meilleurs créneaux. Le chemin intégré — ta photo + ta voix + ton schedule, dans un seul input — est uniquement composable ici.

**Leverage 9. Aha-speed : 30s.**

**Critère de kill.** Si la complétion mobile sur la pellicule est <40% au premier essai (les permissions caméra sont notoirement fragiles sur iOS in-browser), on fallback sur un flow "drag a photo here" desktop-only et on ship la surface WhatsApp (Feature 7) pour l'input mobile-natif.

---

### Feature 3 : Poste-le pour moi ✅ Livré (2026-04-29)

> **Statut implémenté** — Deux outils ajoutés : `publish_drafts({ ids: string[] })` et `schedule_drafts({ items: [{id, scheduledAt}] })`. Bulk dès le jour 1 (pas de v1 solo). Validation Zernio auto-bakée à l'intérieur du même service partagé `publishOrScheduleSuggestion` (factorisé depuis `/api/suggestions/[id]`). Confirmation explicite obligatoire dans le system prompt (énumération avant + go/oui/ok/vas-y dans le dernier message), sans le pattern "stop dans 30s" (trop fragile pour la v1 — re-évaluer post-launch). Sécurité durcie : `schedule_drafts` scope son staging update via `updateMany` filtré sur `lateProfile.userId` pour empêcher le LLM de tamper des drafts cross-tenant. Bulk parallèle via `Promise.all` + try/catch par item (préserve la traçabilité de l'id sur erreur). Retour structuré `{ ok, succeeded[], failed[], paywall? }` avec un switch exhaustif (`satisfies never`) pour que toute future variante `PublishResult` casse à la compilation. **Le pattern "set_schedule reste pour staging seul" a été conservé** — le user peut toujours stager sans commit.

**Le aha moment.** Sarah dit "programme-les tous" et 30 secondes plus tard ils sont locked in. Sans cliquer à travers 5 cartes.

**L'histoire.** Sarah a 5 brouillons à l'écran. Elle tape : "programme-les tous cette semaine." Chat : "Vu — mardi 11h, jeudi 18h, samedi 10h, lundi 9h, mercredi 13h. Si tu dis oui je verrouille. Tape 'stop' pour annuler dans les 30 prochaines secondes." Elle ne fait rien. Ils sont programmés. Elle ferme son laptop.

**Pourquoi maintenant.** Aujourd'hui le chat *stage* via `set_schedule` et l'utilisateur doit cliquer Schedule sur chaque carte (`SuggestionsBoard.tsx:142-181`). C'est une fuite de crédibilité — on a promis un manager et on a livré un demi-agent. Le Pari 4 (UX agentique) rend ça urgent.

**Comment ça marche dans le chat.** Deux nouveaux outils, qui appellent tous les deux la plomberie `commitWithErrorMapping` qui existe déjà :

```ts
confirm_publish({ ids: string[] })   // appelle /api/suggestions/[id] avec action: "publish"
confirm_schedule({ ids: string[] })  // appelle /api/suggestions/[id] avec action: "schedule"
```

Règle dans le system prompt : avant d'appeler l'un ou l'autre, le modèle émet une confirmation en une ligne et attend un tour. Pour éviter les surprises flippantes, le premier usage demande à l'utilisateur de taper "oui" (ou "stop" annule) — après le premier run réussi, l'utilisateur peut opt-in dans les settings pour de l'auto-commit.

**Signaux utilisés.** Tout l'état des brouillons. L'état de la subscription compte aussi — `commitWithErrorMapping` enforce déjà `FREE_POST_LIMIT_REACHED` (`SuggestionsBoard.tsx:98-103`) ; l'outil le surface.

**Pourquoi les concurrents ne peuvent pas copier vite.** Les schedulers enterprise ne shippent pas "AI qui publie réellement" parce que leurs acheteurs compliance-flavored paniquent. Nous on peut ship ça parce que notre acheteur est une personne qui a payé 49€/mois pour déléguer.

**Leverage 9. Aha-speed : 60s.**

**Critère de kill.** Si en première semaine les utilisateurs envoient >5% de tickets contenant "je voulais pas que ça parte", on revert au stage + 1-tap confirm. Le flag opt-in reste, mais default off.

---

### Feature 4 : Pense à moi

**Le aha moment.** Sarah avait oublié PostClaw depuis 9 jours. Dimanche soir, elle reçoit un message : "Salut Sarah — j'ai préparé 5 brouillons pour la semaine basés sur ta série bridal-suite. Tap pour review." Elle tap. Ils sont déjà programmés à ses meilleurs créneaux. Elle publie 4 sur 5.

**L'histoire.** PostClaw initie. Le cron Inngest se déclenche dimanche 19h dans le timezone de l'utilisateur, lance un brief `generate_posts` seedé par `Insights.zernio.topPosts` et `Insights.inferred.topics` plus n'importe quel cue saisonnier de `knowledgeBase`. L'utilisateur reçoit un email + un push (Brevo est déjà câblé). Tap ouvre `/d` avec les brouillons pré-chargés et un message chat pré-stagé : "Tu veux que je les programme tous à tes meilleurs créneaux cette semaine ?"

**Pourquoi maintenant.** Pari 4 : l'agent doit initier. Le mode d'échec de Sarah c'est oublier de planifier, pas échouer à planifier. Les fonctions Inngest scheduled existent ; l'email Brevo est plombé ; on est littéralement à un cron de distance.

**Comment ça marche dans le chat.** Nouvelle fonction Inngest `weekly-digest` triggered sur un cron par-utilisateur dérivé du `User.timezone`. Génère les brouillons, enqueue un email + un deep link Better Auth-authenticated vers `/d`. Le chat reçoit une section de contexte : `## Pending weekly digest — drafted X posts, awaiting your review`.

**Signaux utilisés.** `User.timezone`, `User.knowledgeBase`, `Insights.zernio.topPosts`, `Insights.inferred.topics`, comptes récents publié-vs-programmé (pour ne pas empiler des brouillons sur quelqu'un qui a déjà 14 stagés).

**Pourquoi les concurrents ne peuvent pas copier vite.** Buffer est allergique aux actions initiées au nom de l'utilisateur — leur UX est construite autour de l'utilisateur qui drive. Nous on peut ship des brouillons initiés parce que notre identité c'est le manager, pas l'outil.

**Leverage 8. Aha-speed : instantané au premier trigger (mais laggé 7 jours après le signup).**

**Critère de kill.** Si le taux d'ouverture du dimanche-digest est <15% après 200 envois, le timing ou le framing est faux ; itérer le copy avant de tuer la feature.

---

### Feature 5 : Remarque ce qui a marché ✅ Livré (2026-04-29) — réarchitecturée

> **Statut implémenté — déviation majeure vs spec.** Pas de tool `get_recent_outcomes`. À la place : table `OutcomeSnapshot` (1 row/user) + Inngest cron `compute-outcomes` nightly à 3h UTC + injection compacte dans le system prompt. Raisonnement : pour un signal présent dans >50% des conversations et dont la donnée est petite + fraîche-suffisante, l'inject dans le contexte bat un tool fishing (zéro round-trip, le modèle "remarque" naturellement, pas d'auto-call-on-greeting fragile). Calcul : médiane d'engagement par plateforme (métrique primaire de `platformConfig`), top performers = posts ≥2× médiane, underperformers = posts ≤0.3× médiane, patterns = bestPlatform/bestHour/bestContentType extraits par moyennes par bucket, failedPosts = tally par plateforme. Sécurité : `lateApiKey` n'est JAMAIS retournée d'un `step.run` (Inngest persiste les outputs en run history) — les candidates sont userIds-only, l'apiKey est re-fetchée à l'intérieur de chaque per-user step. Le seuil ≥5 published posts est appliqué côté cron (sur `User.postsPublished`). Le format injecté est compact pour économiser des tokens : `Top: "..." on Instagram (47 likes, 3.2× your average)`. **Comptes déconnectés explicitement hors scope** (focus posts-only, par décision produit). **Pas de tool `get_post_performance` ni d'`inspirationPostIds` sur generate_posts** — le modèle compose le brief à partir du contexte injecté.

**Le aha moment.** Sarah ouvre PostClaw vendredi. Le chat s'ouvre avec : "Ton post sur la tarte aux fraises a fait 47 likes — ton meilleur post depuis 6 semaines. Tu veux 3 autres dans le même style ?"

**L'histoire.** PostClaw ferme la boucle. Une fois qu'un post est publié, `PostSuggestion.publishedExternalId` est peuplé. Une fonction Inngest quotidienne lit `getAnalytics()` sur les 14 derniers jours, identifie le post outlier-positif (>2× la médiane d'engagement de l'utilisateur), et stage un hint pour le greeting du chat. La prochaine fois que l'utilisateur ouvre `/d`, le chat le surface.

**Pourquoi maintenant.** On a les IDs. On a le client API (`mutations.ts:541-568`). On ne les relit jamais.

**Comment ça marche dans le chat.** Un nouvel outil que le modèle peut appeler quand l'utilisateur ouvre le chat sans message :

```ts
get_recent_outcomes({ since?: string }): {
  topPost?: { id, content, platform, metric, vsAverage },
  underperformer?: { id, content, platform, metric, vsAverage },
  failedPosts?: { id, platform, error }[]    // depuis getPost(...).platformErrors
}
```

System prompt : "Si `topPost` existe et que l'utilisateur n'a pas encore vu ce signal cette semaine, mène avec ça conversationnellement avant de répondre à son message."

**Signaux utilisés.** `PostSuggestion.publishedExternalId`, `LatePost.platforms[].errorMessage`, `Insights.zernio.topPosts`, métriques per-post de `getAnalytics()`.

**Pourquoi les concurrents ne peuvent pas copier vite.** Buffer a des analytics ; personne n'a les analytics-comme-ouverture-de-conversation. Le pont entre "la donnée existe dans le dashboard" et "l'agent dit quelque chose d'utile" est le moat.

**Leverage 8. Aha-speed : laggé (nécessite ~7+ posts publiés), puis instantané à chaque ouverture hebdo.**

**Critère de kill.** Si le modèle hallucine des patterns depuis trop peu de data (n<10 posts), exiger un sample minimum avant de surfacer.

---

### Feature 6 : Reels à partir d'une photo

**Le aha moment.** Sarah upload 3 photos et un brief de 4 mots. 60 secondes plus tard elle a un Reel de 9 secondes avec des overlays texte dans ses couleurs de marque, prêt à publier sur Instagram et TikTok.

**L'histoire.** "Fais-en un Reel — 'menu dégustation printemps'." Chat : "C'est parti — slideshow 9s avec tes photos, 'Le printemps est là 🌸' sur la première frame, ta carte texte corail habituelle à la fin. Je rédige les captions maintenant." 60s plus tard, brouillonné sur IG + TikTok avec le MP4 rendu attaché.

**Pourquoi maintenant.** Pari 2 : le short-form video éclipse le statique. Les configs plateformes encodent déjà `requiresMedia: "video"` pour TikTok et YouTube (`platformConfig.ts:117-147`). Cloudinary supporte la transformation vidéo nativement (Ken Burns, overlays texte, transitions). Le pont est pas cher.

**Comment ça marche dans le chat.** Nouvel outil :

```ts
make_short_video({
  mediaIds: string[],         // images ou clips courts depuis User.media
  style?: "slideshow" | "talking_head" | "ken_burns",
  durationSec?: 9 | 15 | 30,
  textOverlays?: string[]     // suggérés par le modèle, confirmables par l'utilisateur
})
```

Le backend utilise l'API de transformation vidéo Cloudinary pour assembler un slideshow avec des layers texte ; le résultat est un `mediaItems[{type:"video", url}]` attaché aux brouillons sur chaque compte vidéo-capable sélectionné. L'empreinte vocale drive le texte à l'écran (court, percutant, dans le ton de l'utilisateur).

**Signaux utilisés.** `User.media`, `Insights.computed.voiceStats`, `requiresMedia` plateforme, couleur de marque depuis `knowledgeBase` si extraite (sinon neutre par défaut).

**Pourquoi les concurrents ne peuvent pas copier vite.** Buffer ne render pas de vidéo. Predis render de la vidéo générique. CapCut + Buffer c'est deux outils, deux logins, zéro mémoire vocale. Le photo→Reel→schedule verticalement intégré avec voix de marque est asymétrique.

**Leverage 8 (impact haut, build moyen-haut). Aha-speed : 90s au premier essai.**

**Critère de kill.** Si le coût de rendu Cloudinary > 0,30€/Reel à scale, repousser jusqu'à ce que le pricing supporte ; ship une version statique "carrousel depuis photos" d'abord comme wedge.

---

### Feature 7 : Notes vocales depuis n'importe où (surface WhatsApp/Telegram)

**Le aha moment.** Sarah revient d'un shooting mariage en voiture. Elle envoie une note vocale WhatsApp de 30 secondes à PostClaw. Quand elle est rentrée, 3 brouillons sont sur son board, programmés.

**L'histoire.** Sarah enregistre le numéro WhatsApp de PostClaw pendant l'onboarding ("envoie 'salut' à ce numéro pour parler à PostClaw en route"). Elle envoie une note vocale "on vient de shooter un mariage à Goldsborough Hall, la mariée portait une robe en dentelle vintage, fais-moi 3 posts IG." Whisper transcrit. Le transcript hit `/api/chat` avec son contexte utilisateur authentifié. Les brouillons apparaissent sur le board. WhatsApp répond : "3 brouillons prêts — ouvre /d pour review ou réponds 'programme' pour locker."

**Pourquoi maintenant.** Pari 3 : le voice-first est normal. Les SMBs vivent sur WhatsApp — c'est pas un canal pour eux, c'est là où leur travail vit. Aucun de Buffer / Hootsuite / Later n'a une surface WhatsApp, structurellement — ils sont enterprise-flavored.

**Comment ça marche dans le chat.** Un webhook WhatsApp Business API (ou Telegram Bot pour MVP Europe — beaucoup plus rapide à ship) route les messages entrants vers `/api/chat-inbound`. Les notes vocales sont transcrites via Whisper, puis nourries au pipeline chat existant. Les réponses repartent vers WhatsApp/Telegram. La surface chat dans `/d` devient la surface de *review* ; WhatsApp devient la surface de *capture*.

**Signaux utilisés.** Mêmes que le chat in-app. Plus la provenance du message WhatsApp pour la sécurité (vérifier que le téléphone d'envoi matche `User.phone` si on le capture).

**Pourquoi les concurrents ne peuvent pas copier vite.** C'est asymétrique. Le client de Buffer est un marketeur à un bureau ; le nôtre c'est Sarah dans un van. Ils ne peuvent pas se réorienter sans perdre leur base installée.

**Leverage 7 (build moyen, différenciation très haute). Aha-speed : 30s une fois pairé.**

**Critère de kill.** Si le drop-off du pairing-flow est >50% (probable sur l'approbation WhatsApp Business API), ship Telegram d'abord — c'est une UX unauth-friendly. Si les deux échouent, ship l'input vocal in-app comme lot de consolation.

---

### Feature 8 : Retiens ce que je dis

**Le aha moment.** Sarah tape "arrête de mettre des emojis à la fin des posts" une fois. Elle n'a plus jamais à le redire.

**L'histoire.** Sarah corrige un brouillon : "celui-là est trop long, et arrête de mettre des emojis à la fin — moi je les mets toujours en milieu de phrase." Chat : "Vu — sauvegardé pour la prochaine fois. Tu veux que je refasse celui-là ?" Chaque génération future respecte la règle. Elle a oublié qu'elle avait dit ça trois mois plus tard ; PostClaw, non.

**Pourquoi maintenant.** La mémoire est le moat agentique. Aujourd'hui chaque session est amnésique. `User.knowledgeBase` est déjà un blob JSON — ajouter un array `preferences[]` est un changement de schema sans Prisma migration douloureuse.

**Comment ça marche dans le chat.** Deux outils :

```ts
save_preference({ rule: string, scope: "all" | platform })
forget_preference({ id: string })
```

Le system prompt reçoit une section `## Standing rules` dans `formatBusinessContext` (en étendant `promptContext.ts`). Les règles surfacent visiblement dans `/d/business` pour que les utilisateurs puissent les éditer/supprimer — la transparence compte.

**Signaux utilisés.** `User.knowledgeBase.preferences[]` (étendu). Aussi nourri à `createFromBrief.buildBriefPrompt` pour que les batch generations respectent les règles.

**Pourquoi les concurrents ne peuvent pas copier vite.** La plupart des schedulers n'ont aucune couche de persistence pour les préférences free-form. ChatGPT a de la mémoire mais elle est généraliste et non load-bearing dans un contexte de marque.

**Leverage 9. Aha-speed : 10s à la première correction ; compose pour toujours.**

**Critère de kill.** Si les préférences accumulent au-delà de ~20, des conflits émergent (ex: "toujours utiliser des emojis" + "arrête les emojis"). Cap à 20 avec auto-prune des plus vieilles, ou résumer en cas d'overflow.

---

### Feature 9 : Re-poste ce qui a marché en un tap

**Le aha moment.** Six semaines après le signup, le chat dit : "Ta série bridal-suite a fait 3× ton engagement habituel. Tu veux 3 autres comme ça pour la semaine prochaine ?" Sarah tap oui.

**L'histoire.** Un utilisateur avec ≥10 posts publiés a un quartile haut clair. Le chat (à l'ouverture, contextuellement) surface le pattern : "Tes 3 meilleurs posts étaient tous des gros plans d'accessoires de mariage avec des captions d'un mot. Tu veux 3 autres dans ce pattern ?" Oui → `generate_posts` avec un brief seedé par le contenu réel des top posts (pas juste les metadata).

**Pourquoi maintenant.** On a `Insights.zernio.topPosts` peuplé déjà (`accountInsights.ts`), et le chat ne le voit pas.

**Comment ça marche dans le chat.** Un nouvel outil :

```ts
remix_top_posts({
  platform: string,
  count?: number,
  fromDays?: number  // default 60
})
```

Internement fetch les top posts via `getAnalytics()` existant et nourrit leur contenu comme exemplars à `createFromBrief` avec une instruction "réécris-mais-ne-copie-pas".

**Signaux utilisés.** `Insights.zernio.topPosts`, `getAnalytics()`, empreinte vocale.

**Pourquoi les concurrents ne peuvent pas copier vite.** Buffer a des analytics ; le saut de "montre-moi un graph" à "génère plus comme le top performer" est un saut UX que les outils enterprise ne feront pas parce que leurs utilisateurs veulent du contrôle manuel.

**Leverage 7. Aha-speed : 90s, mais seulement après que l'utilisateur ait publié 10+ posts (donc c'est une feature Day-30).**

**Critère de kill.** Si le top-3 est trop sparse pour trouver un pattern (ex: tous single-photo et single-mot — signal trop bas), fallback sur le texte `inferred.performingPatterns`.

---

### Feature 10 : Pre-flight avant publish ✅ Livré (2026-04-29) — auto-baked

> **Statut implémenté — déviation vs spec.** Pas de tool `validate_drafts` séparé. La validation `validatePost()` Zernio (+ `validateMediaItems` local) tourne automatiquement à l'intérieur de `publishOrScheduleSuggestion` avant chaque commit Zernio. Si elle échoue, retour `{ ok: false, error: "validation_failed", validationErrors }` — le bulk summary remonte ça avec `recoverable: true` et le system prompt apprend au modèle à proposer fix/skip/retry. Raisonnement : un tool séparé force une séquence "valider puis agir" que les LLMs ratent souvent (oublient de valider, ou valident sans agir). Auto-bake = un round-trip, zéro confusion. Coût latence : 200-400ms × N drafts × N platforms parallélisés via `Promise.all` à l'intérieur du service. **Re-évaluer si users demandent explicitement "vérifie mes drafts sans publier"** — ce serait le seul cas d'usage justifiant un tool standalone.

**Le aha moment.** Le brouillon de Sarah aurait échoué (image trop petite pour un carrousel IG). PostClaw l'attrape avant qu'elle ne clique Post.

**L'histoire.** Quand l'utilisateur tape "publie tout", avant d'appeler `confirm_publish`, le chat appelle `validate_drafts({ ids })` qui boucle `validatePost()` par brouillon par plateforme. Un échec ("Pinterest a besoin d'au moins une image") devient "Je laisserais Pinterest de côté — il a besoin d'une image. Tu veux que j'en prenne une dans ta bibliothèque, ou on skip Pinterest pour cette fois ?"

**Pourquoi maintenant.** `validatePost()` existe déjà (`mutations.ts:364-399`). Le path publish le check server-side après que l'utilisateur ait cliqué Post — trop tard. Tirer ça plus tôt dans le chat évite la frustration "j'ai cliqué Schedule et j'ai eu un toast d'erreur".

**Comment ça marche dans le chat.** Nouvel outil `validate_drafts({ ids: string[] })` qui retourne les résultats de validation par-plateforme. Le modèle s'en sert pour décider de continuer, suggérer un fix, ou skip un compte.

**Signaux utilisés.** L'infra `validatePost()` existante ; `User.media` pour proposer des fixes.

**Pourquoi les concurrents ne peuvent pas copier vite.** Ce n'est pas un moat — c'est de l'hygiène. Mais le *feel* (le manager attrape les erreurs avant qu'elles n'arrivent) compose la boucle de confiance.

**Leverage 6. Aha-speed : invisible jusqu'à ce qu'un truc faillisse presque — puis dramatique.**

**Critère de kill.** Si `validatePost()` ajoute >2s/draft de latence à scale, batcher avec de la concurrence ou passer sur un pattern optimiste-puis-fix.

---

## Ce qui a été shippé en premier (au lieu de Feature 1)

**Sprint Acteur+Œil-ouvert (2026-04-29) — Features 3, 5, 10.** Décision opérée en s'appuyant sur l'analyse expert chat-app : avant d'optimiser la *qualité* des brouillons (Feature 1), fermer la **boucle d'action** (Feature 3) parce qu'un chat qui produit sans pouvoir commit était une fuite de crédibilité plus saignante qu'un chat qui produit sans empreinte vocale parfaite. La Feature 5 a suivi naturellement (l'agent "remarque" sans fishing) et la 10 s'est auto-bakée dans la 3. Total : 3 sprints en 1 PR (~600 lignes net), 1 nouvelle table Prisma, 1 cron Inngest, 2 nouveaux services partagés, refacto du `/api/suggestions/[id]` en route thin. Adversarial review (security/logic/clean-code en parallèle) a sorti 4 findings réels tous résolus avant merge : IDOR cross-tenant sur `schedule_drafts`, leak `lateApiKey` dans les step.run outputs Inngest, dédup manquante, switch d'erreurs sans exhaustiveness TS.

## La feature à construire en premier *(spec originale — toujours valide, à shipper post-Sprint-Acteur)*

**Feature 1 — Sonner exactement comme toi.** Elle domine tout le reste pour trois raisons :

D'abord, elle est déjà construite à 95%. Le pipeline calcule `voiceStats`, `extractedHashtags`, et la zone `inferred` à chaque analyse de compte ; `createFromBrief` prompte déjà Claude avec ça. Le chat les jette à la frontière. Le PR fait grosso modo 80-120 lignes : un helper `formatVoiceFingerprint(insights)` dans `promptContext.ts` et un thread-through dans `route.ts:130-174`. Une journée de boulot, test de régression compris.

Ensuite, **toutes les autres features s'améliorent à la minute où la voix est allumée.** Photo-to-posts (Feature 2) est générique sans la voix et brand-shaped avec elle. Les Reels (Feature 6) ont leur texte à l'écran dans l'idiome de l'utilisateur seulement si la voix est nourrie au renderer. Re-poster ce qui a marché (Feature 9) a besoin de la voix pour *ne pas* sonner comme l'IA aurait réécrit un winner en wallpaper. L'empreinte vocale est de l'infra, pas une feature.

Enfin, le Pari 5 (effondrement de la confiance pour le contenu qui sent l'IA) se passe déjà. Là maintenant on ship des brouillons qui sentent comme tous les autres outils génératifs. Chaque utilisateur qui churn dans les 14 premiers jours churn en partie parce que les captions sonnent comme si un étranger les avait écrites. On a la donnée pour fixer ça ; on ne s'en sert pas. C'est une fuite, pas un item de roadmap.

## La feature qu'il faut refuser de construire

**Feature 9 dans sa forme naïve (et toute variante "planificateur de thèmes hebdo").** La raison pour laquelle ça sonne bien est aussi pour laquelle c'est faux : ça demande à l'utilisateur de *planifier*. Même framé comme "raconte-moi ta semaine", ça force Sarah à pauser, résumer, prioriser — du travail qu'elle a explicitement outsourcé à PostClaw. La minute où le chat demande "c'est quoi tes thèmes cette semaine ?" on a recréé le mental model de calendrier et on est redevenus un outil. Photo-first, event-first, top-post-remix-first dominent tous le planner-first parce qu'ils matchent les moments où Sarah a vraiment du temps libre et du cerveau (après un service, après un shooting, dimanche au verre de vin). Chaque feature plan-first est un outil déguisé — refuser par principe. *Là où la Feature 9 reste vivante c'est dans son mécanisme — générer une séquence depuis un input — mais l'input doit être une photo, un top post, ou une description d'événement en une ligne, jamais "ta semaine".*

## Un pari contrarian

**Feature 7 — WhatsApp / Telegram inbound.** Ça sonne faux pour trois raisons : c'est une surface en plus à maintenir, l'API WhatsApp Business est chiante à provisionner, et Sarah est déjà dans ton app — pourquoi l'envoyer ailleurs ? Voilà pourquoi c'est juste quand même : Sarah n'est *pas* dans ton app. Elle est dans son van, dans sa cuisine, derrière un comptoir. L'ICP SMB non-tech fait tourner toute son entreprise sur WhatsApp — leads, clients, fournisseurs, famille. L'étape de friction la plus haute dans PostClaw c'est "ouvre le laptop, log in, clic /d, tape quelque chose". Si on met le point de capture dans WhatsApp, cette friction tombe à zéro. Le pari est asymétrique : Buffer ne peut pas suivre parce que leur identité c'est enterprise-desktop ; Predis ne peut pas suivre parce qu'ils sont un générateur, pas un manager. On peut ship un MVP Telegram en deux semaines (pas d'approbation business nécessaire) et graduer vers WhatsApp une fois que ça a gagné sa place. Le frame contrarian : *le dashboard est le pire endroit pour capturer l'intent d'un patron de petite entreprise. C'est la boîte de réception.*

---

## Note du fondateur

Si je devais parier les 6 prochains mois de PostClaw sur une seule décision enracinée dans cette analyse : **fais de la voix de marque le pilier load-bearing de chaque génération, et plie chaque nouvelle feature autour de ça.** Pas comme un setting. Comme la physique. Le PR du lundi matin est le plus petit possible — une fonction `formatVoiceFingerprint(insights)` ajoutée à `src/lib/services/promptContext.ts`, appelée dans `src/app/api/chat/route.ts:150` pour qu'elle atterrisse dans le system prompt du chat à côté de `formatBusinessContext`. Ça ship avant midi. Puis pour le reste de la semaine : un bouton média dans `ChatPanel` et un outil `attach_media`. D'ici vendredi, chaque utilisateur existant reçoit des brouillons qui sonnent comme lui et acceptent ses photos en input. C'est ça le wedge. Une fois que la voix est load-bearing, photo-to-posts, Reels, notes vocales WhatsApp et re-poster les winners arrêtent d'être des features et deviennent des expressions d'une seule idée produit : *le manager qui te connaît vraiment.* Tout le reste — confirm-and-publish, digest hebdo, analytics en boucle fermée — tombe naturellement de cette idée sur les cinq mois suivants.
