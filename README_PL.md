<div align="center">

<img src="static/app-icon.png" width="96" alt="Logo Skill Forge">

# Skill Forge

**Brakujący GUI dla Claude Code, Codex CLI i Gemini CLI.**

Zarządzaj wizualnie konfiguracją CLI — agent'ami, skill'ami, serwerami MCP, profilami, hook'ami i dowolnymi niestandardowymi folderami — bez dotykania surowych plików.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=najnowsza)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/licencja-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platforma-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#instalacja)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **[Türkçe](README_TR.md)** | **[简体中文](README_ZH.md)** | **[Deutsch](README_DE.md)** | **[Français](README_FR.md)** | **[日本語](README_JA.md)** | **[한국어](README_KO.md)** | **Polski** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## Czym jest Skill Forge?

Claude Code przechowuje wszystko w `~/.claude/`, Codex CLI w `~/.codex/`, a Gemini CLI w `~/.gemini/`. Definicje agent'ów, prompt'y skill'ów, skrypty hook'ów, konfiguracje serwerów MCP, pliki pamięci, ustawienia — to potężny system, ale ręczna edycja surowego Markdown i JSON jest powolna i podatna na błędy.

**Skill Forge** to natywna aplikacja desktopowa, która nakłada przejrzysty interfejs na to wszystko.

- **Obsługa wielu CLI** — przełączaj się między Claude Code, Codex CLI i Gemini CLI z paska bocznego
- Przeglądaj, twórz i edytuj zasoby za pomocą uporządkowanego interfejsu z dedykowanymi widokami
- **Dynamiczna przeglądarka folderów** — odkrywaj i przełączaj widoczność dowolnych katalogów, przeglądaj pliki z nawigacją breadcrumb, edytuj pliki tekstowe z numerami linii, podglądaj HTML
- Przełączaj się między nazwanymi profilami (praca, osobisty, klient) jednym kliknięciem
- Przeszukuj wszystkie agent'y, skill'e i komendy za pomocą `Ctrl+K`
- Zarządzaj serwerami MCP bez dotykania `.mcp.json`
- Edytuj globalne instrukcje (CLAUDE.md, AGENTS.md) bezpośrednio z Ustawień z przełącznikiem Sformatowany/Surowy
- Twórz backup, udostępniaj i przywracaj konfigurację jako przenośny pakiet `.sfbackup` — z wyborem pojedynczych plików i automatycznym przepisywaniem ścieżek między maszynami
- Zmieniaj język interfejsu bez edycji plików konfiguracyjnych (9 języków)
- Wyłapuj błędy walidacji zanim po cichu zepsują Twoje przepływy pracy

> Przestań edytować pliki ręcznie. Zacznij szybciej tworzyć prompt'y.

---

## Funkcje

| | Funkcja | Opis |
|---|---|---|
| **Wiele CLI** | Claude, Codex, Gemini | Przełączaj się między adapterami CLI z paska bocznego — każdy z własnym katalogiem konfiguracji, profilami i widokami |
| **Dynamiczne foldery** | Przeglądaj dowolny katalog | Przełączaj widoczność dowolnego folderu w katalogu konfiguracji CLI — pełna przeglądarka plików z nawigacją breadcrumb, skalowalnym panelem dzielonym, edycją z numerami linii i podglądem HTML |
| **Widoki zasobów** | Dedykowane edytory | Agent'y, Skill'e, Komendy, Hook'i, Plany, Plugin'y, Sesje, Zadania, Zespoły, Listy zadań — każdy z edytorem Markdown i menu kontekstowym |
| **Serwery MCP** | Zarządzanie z GUI | Dodawaj, edytuj, włączaj/wyłączaj serwery bez dotykania JSON |
| **Profile** | Migawki konfiguracji | Zapisuj i przywracaj konfiguracje CLI na projekt lub klienta |
| **Ustawienia** | Strukturalne + surowy JSON | Prowadzone sekcje ustawień, bezpośrednia edycja JSON oraz wbudowany edytor globalnych instrukcji (CLAUDE.md / AGENTS.md) z przełącznikiem Sformatowany/Surowy |
| **Paleta poleceń** | `Ctrl+K` | Błyskawiczne wyszukiwanie rozmyte we wszystkich typach zasobów |
| **Backup i przywracanie** | Przenośne pakiety | Pełny backup (tar.gz), selektywne Udostępnianie i Export z wyborem pojedynczych plików oraz import z automatycznym przepisywaniem ścieżek dla przenośności między maszynami |
| **Historia i porównanie** | Przegląd zmian | Zobacz, co się zmieniło, zanim nadpiszesz |
| **Preferencje** | Kontrolki na poziomie aplikacji | Zmień motyw, język i niestandardowy katalog konfiguracji z jednego okna |
| **Obsługa języków** | 9 języków interfejsu | angielski, niemiecki, francuski, japoński, koreański, polski, turecki, chiński uproszczony, chiński tradycyjny |
| **Walidacja** | Błędy w miejscu | Wyłapuj nieprawidłowe nazwy, wadliwy JSON i problemy z YAML podczas pisania |
| **Podświetlanie składni** | Na bazie Shiki | Piękne bloki kodu w edytorze Markdown |
| **Motywy i aktualizacje** | Dopracowana natywna aplikacja | Motyw jasny/ciemny/automatyczny, ciche sprawdzanie przy starcie, pobieranie/instalacja z poziomu aplikacji i monity o restart |

---

## Obsługa języków

Skill Forge zawiera wbudowaną lokalizację powłoki aplikacji i kluczowych przepływów ustawień. Dostępne języki interfejsu:

- angielski
- niemiecki
- francuski
- japoński
- koreański
- polski
- turecki
- chiński uproszczony
- chiński tradycyjny

Język możesz zmienić w sekcji `Preferencje` wewnątrz aplikacji. Warstwa lokalizacji obejmuje obecnie nawigację, menu, preferencje, komunikaty aktualizatora oraz interfejs ustawień strukturalnych.

---

## Skróty klawiszowe

| Skrót | Działanie |
|---|---|
| `Ctrl/Cmd K` | Paleta poleceń — szukaj wszędzie |
| `Ctrl/Cmd S` | Zapisz bieżący plik |
| `Ctrl/Cmd N` | Nowy plik w aktywnym widoku |
| `1` – `9` | Przejdź do widoków paska bocznego |
| `Ctrl =` / `Ctrl -` | Zwiększ / zmniejsz rozmiar czcionki |
| `Escape` | Zamknij okno modalne lub paletę |

---

## CLI a Skill Forge

|  | Surowe CLI | Skill Forge |
|--|--|--|
| Edycja agent'a | `vim ~/.claude/agents/x.md` | Edytor wizualny z podświetlaniem składni |
| Zmiana CLI | Edycja różnych katalogów konfiguracji | Przełącznik CLI jednym kliknięciem w pasku bocznym |
| Przeglądanie katalogów | `ls ~/.claude/projects/` | Dynamiczna przeglądarka folderów z edycją |
| Zmiana konfiguracji | Ręczne kopiuj/wklej | Przełączanie profilu jednym kliknięciem |
| Konfiguracja serwera MCP | Ręczna edycja `.mcp.json` | GUI z walidacją formularza |
| Wyszukiwanie pliku | `ls ~/.claude/agents/` | Wyszukiwanie rozmyte `Ctrl+K` |
| Backup konfiguracji | `cp -r ~/.claude ~/backup` | Pełny backup lub selektywne Udostępnianie i Export z granulacją na poziomie plików |
| Wyłapywanie literówek | Po fakcie | Na bieżąco, podczas pisania |

---

## Instalacja

### Pobieranie

| Platforma | Pakiet |
|---|---|
| Windows | Instalator `.msi` |
| macOS | `.dmg` (Universal — Intel + Apple Silicon) |
| Linux | `.AppImage` lub `.deb` |

**[Pobierz najnowszą wersję](https://github.com/HayriCan/SkillForge/releases/latest)**

> **Uwaga dotycząca macOS:** Aplikacja nie jest jeszcze notaryzowana certyfikatem Apple Developer. Jeśli macOS zablokuje uruchomienie, przejdź do **Ustawienia systemowe → Prywatność i bezpieczeństwo** i kliknij **„Otwórz mimo to"** — lub uruchom `xattr -cr /Applications/SkillForge.app` w Terminalu.

### Kompilacja ze źródeł

Jeśli wolisz nie ufać niepodpisanym binarkom, możesz skompilować lokalnie:

```bash
# Wymagania: Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

Skompilowany plik binarny znajdziesz w `src-tauri/target/release/bundle/`.

Lokalne kompilacje ze źródeł nie zawsze odpowiadają oficjalnym metadanym wydania i łańcuchowi podpisów, dlatego wbudowany mechanizm aktualizacji może być ograniczony lub niedostępny w samodzielnie skompilowanych binarkach.

### Automatyczne aktualizacje

Oficjalne kompilacje z wydań GitHub cicho sprawdzają dostępność aktualizacji przy uruchomieniu. Możesz też ręcznie wywołać **Sprawdź aktualizacje** z menu aplikacji, aby otworzyć ten sam przepływ instalacji.

Gdy aktualizacja jest dostępna, Skill Forge pobiera ją, instaluje w miejscu, a następnie prosi o restart w celu dokończenia aktualizacji.

Instalacje z oficjalnych kompilacji wydań to wspierana ścieżka automatycznych aktualizacji. Samodzielnie skompilowane binarki są obsługiwane na zasadzie najlepszego wysiłku, szkicowe wydania GitHub pozostają niewidoczne do momentu publikacji, a niektóre formaty pakietów Linux mogą nadal wymagać ręcznej aktualizacji.

Na macOS ponownie uruchomiona aplikacja po zainstalowaniu aktualizacji może nadal napotkać monity Gatekeeper lub notaryzacji. W takim przypadku użyj tego samego obejścia **„Otwórz mimo to"** lub `xattr -cr`, jak przy pierwszym uruchomieniu.

### Menedżery pakietów

```bash
# macOS — wkrótce
brew install skill-forge

# Windows — wkrótce
winget install skill-forge
```

---

## Rozwój

**Wymagania:** Node 20+, Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**Stos technologiczny:** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**Ostatnie nowości produktowe:** obsługa wielu adapterów CLI (Claude Code, Codex CLI, Gemini CLI), dynamiczna przeglądarka folderów ze skalowalnym panelem i edycją plików, konfigurowalna widoczność zasobów, edytor globalnych instrukcji z przełącznikiem Sformatowany/Surowy, profile per CLI, podgląd HTML dla plików webowych oraz pełne pokrycie i18n dla nowych funkcji.

---

## Współtworzenie

Zapraszamy do współtworzenia projektu. Wytyczne znajdziesz w [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencja

MIT — szczegóły w pliku [LICENSE](LICENSE).
