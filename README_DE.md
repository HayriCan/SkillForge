<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge Logo">

# Skill Forge

**Die fehlende GUI fuer Claude Code, Codex CLI & Gemini CLI.**

Verwalten Sie Ihre CLI-Konfiguration visuell — Agents, Skills, MCP-Server, Profile, Hooks und beliebige benutzerdefinierte Ordner — ohne jemals eine Rohdatei anzufassen.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=aktuell)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Plattform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#installation)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **[Turkce](README_TR.md)** | **[简体中文](README_ZH.md)** | **Deutsch** | **[Francais](README_FR.md)** | **[日本語](README_JA.md)** | **[한국어](README_KO.md)** | **[Polski](README_PL.md)** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## Was ist Skill Forge?

Claude Code speichert alles in `~/.claude/`, Codex CLI in `~/.codex/` und Gemini CLI in `~/.gemini/`. Agent-Definitionen, Skill-Prompts, Hook-Skripte, MCP-Server-Konfigurationen, Speicherdateien, Einstellungen — ein leistungsstarkes System, aber das manuelle Bearbeiten von Markdown- und JSON-Dateien ist langsam und fehleranfaellig.

**Skill Forge** ist eine native Desktop-Anwendung, die all dem eine uebersichtliche Benutzeroberflaeche verleiht.

- **Multi-CLI-Unterstuetzung** — wechseln Sie ueber die Seitenleiste zwischen Claude Code, Codex CLI und Gemini CLI
- Durchsuchen, erstellen und bearbeiten Sie Ressourcen ueber eine strukturierte Oberflaeche mit dedizierten Ansichten
- **Dynamischer Ordner-Browser** — entdecken und aktivieren Sie beliebige benutzerdefinierte Verzeichnisse, durchsuchen Sie Dateien mit Breadcrumb-Navigation, bearbeiten Sie Textdateien mit Zeilennummern, zeigen Sie HTML-Vorschauen an
- Wechseln Sie mit einem Klick zwischen benannten Profilen (Arbeit, Privat, Kunde)
- Durchsuchen Sie alle Agents, Skills und Befehle mit `Ctrl+K`
- Verwalten Sie MCP-Server, ohne `.mcp.json` anzufassen
- Bearbeiten Sie globale Anweisungen (CLAUDE.md, AGENTS.md) direkt in den Einstellungen mit Rich/Raw-Umschaltung
- Sichern, teilen und stellen Sie Ihre Konfiguration als portables `.sfbackup`-Paket wieder her — mit individueller Dateiauswahl und automatischer Pfadanpassung zwischen verschiedenen Rechnern
- Aendern Sie die UI-Sprache ohne Konfigurationsdateien zu bearbeiten (9 Sprachen)
- Fangen Sie Validierungsfehler ab, bevor sie Ihre Workflows stillschweigend beeintraechtigen

> Hoeren Sie auf, Dateien von Hand zu bearbeiten. Erstellen Sie Prompts schneller.

---

## Funktionen

| | Funktion | Beschreibung |
|---|---|---|
| **Multi-CLI** | Claude, Codex, Gemini | Wechseln Sie ueber die Seitenleiste zwischen CLI-Adaptern — jeder mit eigenem Konfigurationsverzeichnis, Profilen und Ansichten |
| **Dynamische Ordner** | Beliebiges Verzeichnis durchsuchen | Aktivieren Sie die Sichtbarkeit beliebiger Ordner in Ihrem CLI-Konfigurationsverzeichnis — vollstaendiger Dateibrowser mit Breadcrumb-Navigation, anpassbarem geteiltem Bereich, zeilennummerierter Bearbeitung und HTML-Vorschau |
| **Ressourcenansichten** | Dedizierte Editoren | Agents, Skills, Befehle, Hooks, Plaene, Plugins, Sitzungen, Aufgaben, Teams, Todos — jeweils mit Markdown-Editor und Kontextmenue |
| **MCP-Server** | GUI-Verwaltung | Server hinzufuegen, bearbeiten, aktivieren/deaktivieren — ohne JSON anzufassen |
| **Profile** | Konfigurations-Snapshots | CLI-Konfigurationen pro Projekt oder Kunde speichern und wiederherstellen |
| **Einstellungen** | Strukturiert + rohes JSON | Gefuehrte Einstellungsbereiche, direkte JSON-Bearbeitung und Inline-Editor fuer globale Anweisungen (CLAUDE.md / AGENTS.md) mit Rich/Raw-Umschaltung |
| **Befehlspalette** | `Ctrl+K` | Sofortige unscharfe Suche ueber alle Ressourcentypen |
| **Backup & Wiederherstellung** | Portable Pakete | Vollstaendiges Backup (tar.gz), selektiver Export mit individueller Dateiauswahl und Import mit automatischer Pfadanpassung fuer rechneruebergreifende Portabilitaet |
| **Verlauf & Diff** | Aenderungspruefung | Sehen Sie, was sich geaendert hat, bevor Sie etwas ueberschreiben |
| **Einstellungen** | App-weite Steuerung | Theme, Sprache und benutzerdefiniertes Konfigurationsverzeichnis in einem Dialog aendern |
| **Sprachunterstuetzung** | 9 UI-Sprachen | English, Deutsch, Francais, Japanisch, Koreanisch, Polnisch, Tuerkisch, Vereinfachtes Chinesisch, Traditionelles Chinesisch |
| **Validierung** | Inline-Fehler | Ungueltige Namen, fehlerhaftes JSON und YAML-Probleme waehrend der Eingabe erkennen |
| **Syntaxhervorhebung** | Shiki-basiert | Ansprechende Code-Bloecke im Markdown-Editor |
| **Themes & Updates** | Native App-Qualitaet | Hell/Dunkel/Automatisch-Theme, stille Startpruefungen, In-App-Download/Installation und Neustart-Aufforderungen |

---

## Sprachunterstuetzung

Skill Forge enthaelt eine integrierte Lokalisierung fuer die App-Oberflaeche und die wichtigsten Einstellungsablaeufe. Die derzeit verfuegbaren UI-Sprachen sind:

- English
- Deutsch
- Francais
- Japanisch
- Koreanisch
- Polnisch
- Tuerkisch
- Vereinfachtes Chinesisch
- Traditionelles Chinesisch

Sie koennen die Sprache in den `Einstellungen` innerhalb der App aendern. Die Lokalisierungsschicht umfasst derzeit Navigation, Menues, Einstellungen, Updater-Nachrichten und die strukturierte Einstellungsoberflaeche.

---

## Tastenkuerzel

| Kuerzel | Aktion |
|---|---|
| `Ctrl/Cmd K` | Befehlspalette — alles durchsuchen |
| `Ctrl/Cmd S` | Aktuelle Datei speichern |
| `Ctrl/Cmd N` | Neue Datei in der aktiven Ansicht |
| `1` – `9` | Zu Seitenleistenansichten springen |
| `Ctrl =` / `Ctrl -` | Schriftgroesse vergroessern / verkleinern |
| `Escape` | Dialog oder Palette schliessen |

---

## CLI vs. Skill Forge

|  | Reine CLI | Skill Forge |
|--|--|--|
| Agent bearbeiten | `vim ~/.claude/agents/x.md` | Visueller Editor mit Syntaxhervorhebung |
| CLI wechseln | Verschiedene Konfigurationsverzeichnisse bearbeiten | Ein-Klick-CLI-Umschalter in der Seitenleiste |
| Benutzerdefinierte Verzeichnisse durchsuchen | `ls ~/.claude/projects/` | Dynamischer Ordner-Browser mit Bearbeitungsfunktion |
| Konfiguration wechseln | Manuelles Kopieren/Einfuegen | Ein-Klick-Profilwechsel |
| MCP-Server einrichten | `.mcp.json` manuell bearbeiten | GUI mit Formularvalidierung |
| Datei finden | `ls ~/.claude/agents/` | `Ctrl+K` unscharfe Suche |
| Konfiguration sichern | `cp -r ~/.claude ~/backup` | Vollstaendiges Backup oder selektiver Export mit Einzeldatei-Auswahl |
| Tippfehler erkennen | Im Nachhinein | Inline, waehrend der Eingabe |

---

## Installation

### Download

| Plattform | Paket |
|---|---|
| Windows | `.msi`-Installationsprogramm |
| macOS | `.dmg` (Universal — Intel + Apple Silicon) |
| Linux | `.AppImage` oder `.deb` |

**[Neueste Version herunterladen](https://github.com/HayriCan/SkillForge/releases/latest)**

> **macOS-Hinweis:** Die App ist noch nicht mit einem Apple Developer-Zertifikat notarisiert. Falls macOS den Start blockiert, gehen Sie zu **Systemeinstellungen → Datenschutz & Sicherheit** und klicken Sie auf **"Trotzdem oeffnen"** — oder fuehren Sie im Terminal `xattr -cr /Applications/SkillForge.app` aus.

### Aus dem Quellcode erstellen

Wenn Sie unsignierten Binaries nicht vertrauen moechten, koennen Sie lokal erstellen:

```bash
# Voraussetzungen: Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

Die kompilierte Binary befindet sich in `src-tauri/target/release/bundle/`.

Lokale Quellcode-Builds stimmen nicht immer mit den offiziellen Release-Metadaten und der Signaturkette ueberein, daher kann der In-App-Updater bei selbst erstellten Binaries eingeschraenkt oder nicht verfuegbar sein.

### Automatische Updates

Offizielle GitHub-Release-Builds pruefen beim Start stillschweigend auf veroeffentlichte Updates. Sie koennen auch **Nach Updates suchen** im App-Menue auswaehlen, um den gleichen Installationsablauf manuell zu starten.

Wenn ein Update verfuegbar ist, laedt Skill Forge es herunter, installiert es vor Ort und fordert anschliessend zum Neustart auf, um das Upgrade abzuschliessen.

Release-Builds sind der unterstuetzte Pfad fuer automatische Updates. Selbst erstellte Binaries werden nur nach bestem Bemühen unterstuetzt, GitHub-Release-Entwuerfe bleiben bis zur Veroeffentlichung unsichtbar, und einige Linux-Paketformate erfordern moeglicherweise weiterhin manuelle Upgrades.

Unter macOS kann die nach einem Update neu gestartete App weiterhin auf Gatekeeper- oder Notarisierungsabfragen stossen. Verwenden Sie in diesem Fall die gleiche **Trotzdem oeffnen**- oder `xattr -cr`-Loesung wie beim ersten Start.

### Paketmanager

```bash
# macOS — in Kuerze verfuegbar
brew install skill-forge

# Windows — in Kuerze verfuegbar
winget install skill-forge
```

---

## Entwicklung

**Voraussetzungen:** Node 20+, Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**Technologie-Stack:** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**Aktuelle Produkt-Erweiterungen:** Multi-CLI-Adapter-Unterstuetzung (Claude Code, Codex CLI, Gemini CLI), dynamischer Ordner-Browser mit anpassbarem Bereich und Dateibearbeitung, konfigurierbare Ressourcensichtbarkeit, Editor fuer globale Anweisungen mit Rich/Raw-Umschaltung, CLI-spezifische Profile, HTML-Vorschau fuer Webdateien und vollstaendige i18n-Abdeckung fuer neue Funktionen.

---

## Mitwirken

Beitraege sind willkommen. Richtlinien finden Sie in [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

MIT — siehe [LICENSE](LICENSE).
