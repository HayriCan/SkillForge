<div align="center">

<img src="static/app-icon.png" width="96" alt="Logo Skill Forge">

# Skill Forge

**L'interface graphique manquante pour Claude Code, Codex CLI et Gemini CLI.**

Gerez visuellement la configuration de votre CLI — agents, skills, serveurs MCP, profils, hooks et tout dossier personnalise — sans jamais toucher un fichier brut.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=derni%C3%A8re%20version)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/plateforme-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#installation)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **[Türkçe](README_TR.md)** | **[简体中文](README_ZH.md)** | **[Deutsch](README_DE.md)** | **Français** | **[日本語](README_JA.md)** | **[한국어](README_KO.md)** | **[Polski](README_PL.md)** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## Qu'est-ce que Skill Forge ?

Claude Code stocke tout dans `~/.claude/`, Codex CLI dans `~/.codex/`, et Gemini CLI dans `~/.gemini/`. Definitions d'agents, prompts de skills, scripts de hooks, configurations de serveurs MCP, fichiers memoire, parametres — c'est puissant, mais editer du Markdown et du JSON bruts a la main est lent et source d'erreurs.

**Skill Forge** est une application de bureau native qui place une interface claire au-dessus de tout cela.

- **Support multi-CLI** — basculez entre Claude Code, Codex CLI et Gemini CLI depuis la barre laterale
- Parcourez, creez et editez des ressources a travers une interface structuree avec des vues dediees
- **Navigateur de dossiers dynamique** — decouvrez et activez n'importe quel repertoire personnalise, parcourez les fichiers avec une navigation par breadcrumb, editez les fichiers texte avec numeros de ligne, previsualisation HTML
- Basculez entre des profils nommes (travail, personnel, client) en un clic
- Recherchez parmi tous vos agents, skills et commandes avec `Ctrl+K`
- Gerez les serveurs MCP sans toucher a `.mcp.json`
- Editez les instructions globales (CLAUDE.md, AGENTS.md) directement depuis les Parametres avec un basculement Riche/Brut
- Sauvegardez, partagez et restaurez votre configuration sous forme de paquet portable `.sfbackup` — avec selection individuelle des fichiers et reecriture automatique des chemins entre machines
- Changez la langue principale de l'interface sans editer de fichiers de configuration (9 langues)
- Detectez les erreurs de validation avant qu'elles ne cassent silencieusement vos workflows

> Arretez d'editer des fichiers a la main. Creez vos prompts plus rapidement.

---

## Fonctionnalites

| | Fonctionnalite | Description |
|---|---|---|
| **Multi-CLI** | Claude, Codex, Gemini | Basculez entre les adaptateurs CLI depuis la barre laterale — chacun avec son propre repertoire de configuration, ses profils et ses vues |
| **Dossiers dynamiques** | Parcourir n'importe quel repertoire | Activez la visibilite de n'importe quel dossier dans votre repertoire de configuration CLI — navigateur de fichiers complet avec navigation par breadcrumb, panneau fractionne redimensionnable, edition avec numeros de ligne et previsualisation HTML |
| **Vues de ressources** | Editeurs dedies | Agents, Skills, Commandes, Hooks, Plans, Plugins, Sessions, Taches, Equipes, A faire — chacun avec editeur Markdown et menus contextuels |
| **Serveurs MCP** | Gestion par interface graphique | Ajoutez, editez, activez/desactivez des serveurs sans toucher au JSON |
| **Profils** | Instantanes de configuration | Sauvegardez et restaurez les configurations par CLI, par projet ou par client |
| **Parametres** | Structure + JSON brut | Sections de parametres guidees, edition directe du JSON et editeur d'instructions globales en ligne (CLAUDE.md / AGENTS.md) avec basculement Riche/Brut |
| **Palette de commandes** | `Ctrl+K` | Recherche floue instantanee parmi tous les types de ressources |
| **Sauvegarde et restauration** | Paquets portables | Sauvegarde complete (tar.gz), Partage et Export selectif avec choix fichier par fichier, et import avec reecriture automatique des chemins pour la portabilite entre machines |
| **Historique et comparaison** | Revue des modifications | Visualisez ce qui a change avant d'ecraser quoi que ce soit |
| **Preferences** | Controles au niveau de l'application | Changez le theme, la langue et le repertoire de configuration personnalise depuis une seule fenetre |
| **Support linguistique** | 9 langues d'interface | Anglais, Allemand, Francais, Japonais, Coreen, Polonais, Turc, Chinois simplifie, Chinois traditionnel |
| **Validation** | Erreurs en ligne | Detectez les noms invalides, le JSON mal forme et les problemes YAML en cours de saisie |
| **Coloration syntaxique** | Propulsee par Shiki | De beaux blocs de code dans l'editeur Markdown |
| **Themes et mises a jour** | Finition d'application native | Theme Clair/Sombre/Automatique, verification silencieuse au demarrage, telechargement/installation integres et invite de redemarrage |

---

## Support linguistique

Skill Forge inclut une localisation integree pour le shell de l'application et les principaux flux de parametres. Les langues d'interface disponibles sont :

- Anglais
- Allemand
- Francais
- Japonais
- Coreen
- Polonais
- Turc
- Chinois simplifie
- Chinois traditionnel

Vous pouvez changer la langue depuis les `Preferences` dans l'application. La couche de localisation couvre actuellement la navigation, les menus, les preferences, les messages du systeme de mise a jour et l'interface de parametres structuree.

---

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `Ctrl/Cmd K` | Palette de commandes — rechercher partout |
| `Ctrl/Cmd S` | Enregistrer le fichier actuel |
| `Ctrl/Cmd N` | Nouveau fichier dans la vue active |
| `1` – `9` | Acceder aux vues de la barre laterale |
| `Ctrl =` / `Ctrl -` | Augmenter / diminuer la taille de police |
| `Escape` | Fermer la fenetre modale ou la palette |

---

## CLI vs Skill Forge

|  | CLI brut | Skill Forge |
|--|--|--|
| Editer un agent | `vim ~/.claude/agents/x.md` | Editeur visuel avec coloration syntaxique |
| Changer de CLI | Editer differents repertoires de configuration | Selecteur de CLI en un clic dans la barre laterale |
| Parcourir les repertoires personnalises | `ls ~/.claude/projects/` | Navigateur de dossiers dynamique avec edition |
| Changer de configuration | Copier/coller manuellement | Changement de profil en un clic |
| Configurer un serveur MCP | Editer `.mcp.json` a la main | Interface graphique avec validation de formulaire |
| Trouver un fichier | `ls ~/.claude/agents/` | Recherche floue `Ctrl+K` |
| Sauvegarder la configuration | `cp -r ~/.claude ~/backup` | Sauvegarde complete ou Partage et Export selectif fichier par fichier |
| Detecter les erreurs | Apres coup | En ligne, en cours de saisie |

---

## Installation

### Telechargement

| Plateforme | Paquet |
|---|---|
| Windows | Installateur `.msi` |
| macOS | `.dmg` (Universel — Intel + Apple Silicon) |
| Linux | `.AppImage` ou `.deb` |

**[Telecharger la derniere version](https://github.com/HayriCan/SkillForge/releases/latest)**

> **Note macOS :** L'application n'est pas encore notariee avec un certificat Apple Developer. Si macOS bloque le lancement, rendez-vous dans **Reglages du systeme → Confidentialite et securite** et cliquez sur **"Ouvrir quand meme"** — ou executez `xattr -cr /Applications/SkillForge.app` dans le Terminal.

### Compiler depuis les sources

Si vous preferez ne pas faire confiance a des binaires non signes, vous pouvez compiler localement :

```bash
# Prerequis : Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

Le binaire compile se trouvera dans `src-tauri/target/release/bundle/`.

Les compilations locales ne correspondent pas toujours aux metadonnees officielles de la version et a la chaine de signature, de sorte que le systeme de mise a jour integre peut etre limite ou indisponible sur les binaires compiles par vos soins.

### Mises a jour automatiques

Les versions officielles publiees sur GitHub verifient silencieusement les mises a jour au demarrage. Vous pouvez egalement declencher **Verifier les mises a jour** depuis le menu de l'application pour ouvrir manuellement le meme flux d'installation.

Lorsqu'une mise a jour est disponible, Skill Forge la telecharge, l'installe sur place, puis demande un redemarrage pour finaliser la mise a niveau.

Les installations a partir des versions officielles constituent le chemin supporte pour les mises a jour automatiques. Les binaires compiles par vos soins fonctionnent au mieux, les versions GitHub en brouillon restent invisibles jusqu'a leur publication, et certains formats de paquets Linux peuvent encore necessiter des mises a niveau manuelles.

Sur macOS, l'application relancee peut encore rencontrer des invites Gatekeeper ou de notarisation apres l'application d'une mise a jour. Dans ce cas, utilisez la meme solution de contournement **Ouvrir quand meme** ou `xattr -cr` que lors du premier lancement.

### Gestionnaires de paquets

```bash
# macOS — bientot disponible
brew install skill-forge

# Windows — bientot disponible
winget install skill-forge
```

---

## Developpement

**Prerequis :** Node 20+, Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**Stack technique :** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**Ajouts recents :** support multi-CLI avec adaptateurs (Claude Code, Codex CLI, Gemini CLI), navigateur de dossiers dynamique avec panneau redimensionnable et edition de fichiers, visibilite configurable des ressources, editeur d'instructions globales avec basculement Riche/Brut, profils par CLI, previsualisation HTML pour les fichiers web et couverture i18n complete pour les nouvelles fonctionnalites.

---

## Contribuer

Les contributions sont les bienvenues. Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour les directives.

## Licence

MIT — voir [LICENSE](LICENSE).
