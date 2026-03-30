<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge 圖示">

# Skill Forge

**Claude Code、Codex CLI 與 Gemini CLI 欠缺的圖形介面。**

以視覺化方式管理你的 CLI 設定 — agent、skill、MCP 伺服器、profile、hook 以及任意自訂資料夾 — 完全不必手動編輯原始檔案。

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=最新版本)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/授權條款-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#安裝)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **[Türkçe](README_TR.md)** | **[简体中文](README_ZH.md)** | **[Deutsch](README_DE.md)** | **[Français](README_FR.md)** | **[日本語](README_JA.md)** | **[한국어](README_KO.md)** | **[Polski](README_PL.md)** | **繁體中文**

</div>

---

## 什麼是 Skill Forge？

Claude Code 將所有內容儲存在 `~/.claude/`，Codex CLI 儲存在 `~/.codex/`，Gemini CLI 儲存在 `~/.gemini/`。Agent 定義、skill 提示詞、hook 腳本、MCP 伺服器設定、記憶檔案、設定值 — 功能強大，但手動編輯原始 Markdown 和 JSON 檔案既緩慢又容易出錯。

**Skill Forge** 是一款原生桌面應用程式，為這一切提供了簡潔的使用者介面。

- **多 CLI 支援** — 從側邊欄在 Claude Code、Codex CLI 與 Gemini CLI 之間切換
- 透過結構化介面和專屬檢視來瀏覽、建立和編輯資源
- **動態資料夾瀏覽器** — 探索並切換任意自訂目錄，以 breadcrumb 導覽瀏覽檔案，編輯附有行號的文字檔，預覽 HTML
- 一鍵在已命名的 profile（工作、個人、客戶）之間切換
- 使用 `Ctrl+K` 在所有 agent、skill 和指令中搜尋
- 無需編輯 `.mcp.json` 即可管理 MCP 伺服器
- 直接從設定中編輯全域指示（CLAUDE.md、AGENTS.md），支援富文字/原始文字切換
- 將設定備份、分享和還原為可攜式 `.sfbackup` 套件 — 支援逐檔選取以及跨機器自動路徑改寫
- 無需編輯設定檔即可切換核心 UI 語言（9 種語言）
- 在工作流程被無聲地中斷之前捕捉驗證錯誤

> 不再手動編輯檔案。更快地打造提示詞。

---

## 功能特色

| | 功能 | 說明 |
|---|---|---|
| **多 CLI** | Claude、Codex、Gemini | 從側邊欄切換 CLI 配接器 — 每個都有獨立的設定目錄、profile 和檢視 |
| **動態資料夾** | 瀏覽任意目錄 | 切換 CLI 設定目錄中任意資料夾的可見性 — 完整的檔案瀏覽器，支援 breadcrumb 導覽、可調整大小的分割面板、行號編輯和 HTML 預覽 |
| **資源檢視** | 專屬編輯器 | Agent、Skill、指令、Hook、計畫、Plugin、工作階段、任務、團隊、待辦事項 — 每項皆有 Markdown 編輯器和右鍵選單 |
| **MCP 伺服器** | 圖形化管理 | 無需編輯 JSON 即可新增、編輯、啟用/停用伺服器 |
| **Profile** | 設定快照 | 依專案或客戶為每個 CLI 儲存和還原設定 |
| **設定** | 結構化 + 原始 JSON | 引導式設定區塊、直接 JSON 編輯，以及支援富文字/原始文字切換的內嵌全域指示編輯器（CLAUDE.md / AGENTS.md） |
| **指令面板** | `Ctrl+K` | 跨所有資源類型的即時模糊搜尋 |
| **備份與還原** | 可攜式套件 | 完整備份（tar.gz）、支援逐檔選取的分享與 export，以及為跨機器可攜性提供自動路徑改寫的 import |
| **歷史與差異** | 變更審查 | 在覆寫之前查看變更內容 |
| **偏好設定** | 應用程式層級控制 | 從單一視窗變更主題、語言和自訂設定目錄 |
| **語言支援** | 9 種 UI 語言 | English、Deutsch、Français、日本語、한국어、Polski、Türkçe、簡體中文、繁體中文 |
| **驗證** | 內嵌錯誤提示 | 在輸入時捕捉無效名稱、格式錯誤的 JSON 和 YAML 問題 |
| **語法醒目提示** | Shiki 驅動 | Markdown 編輯器中精美的程式碼區塊 |
| **主題與更新** | 原生應用程式品質 | 淺色/深色/自動主題、靜默啟動檢查、應用程式內下載/安裝以及重新啟動提示 |

---

## 語言支援

Skill Forge 包含應用程式外殼和關鍵設定流程的內建在地化。目前的 UI 語言選項如下：

- English
- Deutsch
- Français
- 日本語
- 한국어
- Polski
- Türkçe
- 簡體中文
- 繁體中文

你可以從應用程式內的「偏好設定」變更語言。在地化層目前涵蓋導覽、選單、偏好設定、更新程式訊息和結構化設定 UI。

---

## 鍵盤快速鍵

| 快速鍵 | 操作 |
|---|---|
| `Ctrl/Cmd K` | 指令面板 — 搜尋所有內容 |
| `Ctrl/Cmd S` | 儲存目前檔案 |
| `Ctrl/Cmd N` | 在目前檢視中建立新檔案 |
| `1` – `9` | 跳至側邊欄檢視 |
| `Ctrl =` / `Ctrl -` | 放大 / 縮小字體大小 |
| `Escape` | 關閉對話框或面板 |

---

## CLI 與 Skill Forge 比較

|  | 原始 CLI | Skill Forge |
|--|--|--|
| 編輯 agent | `vim ~/.claude/agents/x.md` | 視覺化編輯器，語法醒目提示 |
| 切換 CLI | 編輯不同的設定目錄 | 側邊欄一鍵 CLI 切換器 |
| 瀏覽自訂目錄 | `ls ~/.claude/projects/` | 支援編輯的動態資料夾瀏覽器 |
| 切換設定 | 手動複製/貼上 | 一鍵 profile 切換 |
| MCP 伺服器設定 | 手動編輯 `.mcp.json` | 附表單驗證的 GUI |
| 尋找檔案 | `ls ~/.claude/agents/` | `Ctrl+K` 模糊搜尋 |
| 備份設定 | `cp -r ~/.claude ~/backup` | 完整備份或支援逐檔粒度的分享與 export |
| 捕捉錯誤 | 事後才發現 | 即時內嵌提示 |

---

## 安裝

### 下載

| 平台 | 套件 |
|---|---|
| Windows | `.msi` 安裝程式 |
| macOS | `.dmg`（Universal — Intel + Apple Silicon） |
| Linux | `.AppImage` 或 `.deb` |

**[下載最新版本](https://github.com/HayriCan/SkillForge/releases/latest)**

> **macOS 提示：** 本應用程式尚未通過 Apple Developer 憑證公證。如果 macOS 阻止啟動，請前往**系統設定 → 隱私權與安全性**並點選**「強制打開」** — 或在終端機中執行 `xattr -cr /Applications/SkillForge.app`。

### 從原始碼建置

若你不想信任未簽署的二進位檔，可以在本機建置：

```bash
# 先決條件：Node 20+、Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

編譯後的二進位檔將位於 `src-tauri/target/release/bundle/`。

本機原始碼建置不一定會與官方發行的中繼資料和簽章鏈相符，因此自行建置的二進位檔可能無法使用或僅有限度地使用應用程式內更新程式。

### 自動更新

官方 GitHub 發行版本會在啟動時靜默檢查已發佈的更新。你也可以從應用程式選單觸發**檢查更新**來手動開啟相同的安裝流程。

當有更新可用時，Skill Forge 會下載並就地安裝，然後要求重新啟動以完成升級。

發行版本安裝是自動更新的支援路徑。自行建置的二進位檔僅為盡力而為，GitHub 草稿版本在正式發佈前不可見，某些 Linux 套件格式可能仍需手動升級。

在 macOS 上，更新後重新啟動的應用程式可能仍會遇到 Gatekeeper 或公證提示。如果發生這種情況，請使用與首次啟動相同的**「強制打開」**或 `xattr -cr` 解決方法。

### 套件管理員

```bash
# macOS — 即將推出
brew install skill-forge

# Windows — 即將推出
winget install skill-forge
```

---

## 開發

**先決條件：** Node 20+、Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**技術堆疊：** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**近期產品更新：** 多 CLI 配接器支援（Claude Code、Codex CLI、Gemini CLI）、支援可調整大小面板和檔案編輯的動態資料夾瀏覽器、可設定的資源可見性、支援富文字/原始文字切換的全域指示編輯器、每 CLI 的 profile、Web 檔案的 HTML 預覽，以及新功能的完整 i18n 涵蓋範圍。

---

## 貢獻

歡迎貢獻。請參閱 [CONTRIBUTING.md](CONTRIBUTING.md) 了解相關規範。

## 授權條款

MIT — 詳見 [LICENSE](LICENSE)。
