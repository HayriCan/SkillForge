<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge ロゴ">

# Skill Forge

**Claude Code、Codex CLI、Gemini CLI のための、欠けていたGUI。**

CLI の設定 — agent、skill、MCP サーバー、profile、hook、任意のカスタムフォルダー — を、生ファイルに一切触れずに視覚的に管理できます。

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=latest)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#インストール)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **[Türkçe](README_TR.md)** | **[简体中文](README_ZH.md)** | **[Deutsch](README_DE.md)** | **[Français](README_FR.md)** | **日本語** | **[한국어](README_KO.md)** | **[Polski](README_PL.md)** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## Skill Forge とは？

Claude Code はすべてを `~/.claude/` に、Codex CLI は `~/.codex/` に、Gemini CLI は `~/.gemini/` に保存します。agent 定義、skill プロンプト、hook スクリプト、MCP サーバー設定、メモリファイル、各種設定 — 強力なシステムですが、生の Markdown や JSON を手作業で編集するのは遅く、ミスが起きやすいです。

**Skill Forge** は、これらすべてをクリーンな UI で操作できるネイティブデスクトップアプリケーションです。

- **マルチ CLI 対応** — サイドバーから Claude Code、Codex CLI、Gemini CLI を切り替えられます
- 専用ビューを備えた構造化インターフェースで、リソースの閲覧・作成・編集が可能です
- **動的フォルダーブラウザー** — 任意のカスタムディレクトリを検出してトグル表示、breadcrumb ナビゲーションでファイルを閲覧、行番号付きでテキストファイルを編集、HTML プレビューが可能です
- 名前付き profile（仕事用、個人用、クライアント用）をワンクリックで切り替えられます
- `Ctrl+K` ですべての agent、skill、コマンドを横断検索できます
- `.mcp.json` に触れずに MCP サーバーを管理できます
- グローバル指示ファイル（CLAUDE.md、AGENTS.md）をリッチ/ロー切り替え付きで設定画面から直接編集できます
- 設定をポータブルな `.sfbackup` バンドルとしてバックアップ、共有、復元できます — 個別ファイル選択とマシン間の自動パス書き換えに対応しています
- 設定ファイルを編集せずに UI 言語を変更できます（9言語対応）
- ワークフローを静かに壊す前にバリデーションエラーを検出できます

> ファイルの手動編集はもうやめましょう。プロンプト作成をもっと速く。

---

## 機能一覧

| | 機能 | 説明 |
|---|---|---|
| **マルチ CLI** | Claude、Codex、Gemini | サイドバーから CLI アダプターを切り替え — それぞれ独自の設定ディレクトリ、profile、ビューを持ちます |
| **動的フォルダー** | 任意のディレクトリを閲覧 | CLI 設定ディレクトリ内の任意のフォルダーの表示をトグル — breadcrumb ナビゲーション、リサイズ可能な分割パネル、行番号付き編集、HTML プレビュー付きのフルファイルブラウザー |
| **リソースビュー** | 専用エディター | agent、skill、コマンド、hook、プラン、plugin、セッション、タスク、チーム、Todo — それぞれ Markdown エディターとコンテキストメニュー付き |
| **MCP サーバー** | GUI 管理 | JSON に触れずにサーバーの追加、編集、有効化/無効化が可能 |
| **profile** | 設定スナップショット | プロジェクトやクライアントごとに CLI 設定を保存・復元 |
| **設定** | 構造化 + 生 JSON | ガイド付き設定セクション、直接 JSON 編集、リッチ/ロー切り替え付きインライングローバル指示エディター（CLAUDE.md / AGENTS.md） |
| **コマンドパレット** | `Ctrl+K` | すべてのリソースタイプを即座にファジー検索 |
| **backup と復元** | ポータブルバンドル | フル backup（tar.gz）、個別ファイル選択による共有 & export、マシン間ポータビリティのための自動パス書き換え付き import |
| **履歴と差分** | 変更レビュー | 上書きする前に何が変わったかを確認 |
| **環境設定** | アプリレベルの制御 | テーマ、言語、カスタム設定ディレクトリを一つのモーダルから変更 |
| **言語サポート** | 9つの UI 言語 | English、Deutsch、Français、日本語、韓国語、Polski、Türkçe、簡体中文、繁體中文 |
| **バリデーション** | インラインエラー | 入力中に無効な名前、不正な JSON、YAML の問題を検出 |
| **シンタックスハイライト** | Shiki 搭載 | Markdown エディター内の美しいコードブロック |
| **テーマと更新** | ネイティブアプリ品質 | ライト/ダーク/自動テーマ、サイレント起動チェック、アプリ内ダウンロード/インストール、再起動プロンプト |

---

## 言語サポート

Skill Forge は、アプリシェルと主要な設定フローのための組み込みローカライズを備えています。現在利用可能な UI 言語は以下の通りです：

- English
- Deutsch
- Français
- 日本語
- 韓国語
- Polski
- Türkçe
- 簡体中文
- 繁體中文

言語はアプリ内の `環境設定` から変更できます。ローカライズレイヤーは現在、ナビゲーション、メニュー、環境設定、アップデーターメッセージ、構造化設定 UI をカバーしています。

---

## キーボードショートカット

| ショートカット | 動作 |
|---|---|
| `Ctrl/Cmd K` | コマンドパレット — すべてを検索 |
| `Ctrl/Cmd S` | 現在のファイルを保存 |
| `Ctrl/Cmd N` | アクティブなビューで新規ファイル |
| `1` – `9` | サイドバービューにジャンプ |
| `Ctrl =` / `Ctrl -` | フォントサイズ拡大 / 縮小 |
| `Escape` | モーダルまたはパレットを閉じる |

---

## CLI と Skill Forge の比較

|  | 生の CLI | Skill Forge |
|--|--|--|
| agent の編集 | `vim ~/.claude/agents/x.md` | シンタックスハイライト付きビジュアルエディター |
| CLI の切り替え | 異なる設定ディレクトリを編集 | サイドバーでワンクリック CLI 切り替え |
| カスタムディレクトリの閲覧 | `ls ~/.claude/projects/` | 編集機能付き動的フォルダーブラウザー |
| 設定の切り替え | 手動コピー＆ペースト | ワンクリック profile 切り替え |
| MCP サーバー設定 | `.mcp.json` を手動編集 | フォームバリデーション付き GUI |
| ファイル検索 | `ls ~/.claude/agents/` | `Ctrl+K` ファジー検索 |
| 設定の backup | `cp -r ~/.claude ~/backup` | フル backup またはファイル単位の共有 & export |
| タイプミスの検出 | 事後的に | 入力中にインラインで |

---

## インストール

### ダウンロード

| プラットフォーム | パッケージ |
|---|---|
| Windows | `.msi` インストーラー |
| macOS | `.dmg`（Universal — Intel + Apple Silicon） |
| Linux | `.AppImage` または `.deb` |

**[最新リリースをダウンロード](https://github.com/HayriCan/SkillForge/releases/latest)**

> **macOS に関する注意:** このアプリはまだ Apple Developer 証明書による公証を受けていません。macOS が起動をブロックする場合は、**システム設定 → プライバシーとセキュリティ** に移動し、**「このまま開く」** をクリックしてください。または、ターミナルで `xattr -cr /Applications/SkillForge.app` を実行してください。

### ソースからビルド

署名されていないバイナリを使用したくない場合は、ローカルでビルドできます：

```bash
# 前提条件: Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

コンパイルされたバイナリは `src-tauri/target/release/bundle/` に出力されます。

ローカルソースビルドは公式リリースのメタデータや署名チェーンと一致しない場合があるため、自分でビルドしたバイナリではアプリ内アップデーターが制限されるか、利用できない可能性があります。

### 自動更新

公式 GitHub リリースビルドは、起動時にサイレントで公開済みの更新を確認します。アプリメニューから **更新を確認** を選択して、同じインストールフローを手動で開始することもできます。

更新が利用可能な場合、Skill Forge はそれをダウンロードし、その場でインストールした後、アップグレードを完了するために再起動を求めます。

リリースビルドのインストールが自動更新のサポート対象パスです。自分でビルドしたバイナリはベストエフォートのみで、ドラフトの GitHub リリースは公開されるまで表示されず、一部の Linux パッケージ形式では手動アップグレードが必要になる場合があります。

macOS では、更新が適用された後に再起動したアプリが Gatekeeper や公証プロンプトに引っかかることがあります。その場合は、初回起動時と同じ **「このまま開く」** または `xattr -cr` の回避策を使用してください。

### パッケージマネージャー

```bash
# macOS — 近日対応予定
brew install skill-forge

# Windows — 近日対応予定
winget install skill-forge
```

---

## 開発

**前提条件:** Node 20+, Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**技術スタック:** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**最近の主な追加機能:** マルチ CLI アダプターサポート（Claude Code、Codex CLI、Gemini CLI）、リサイズ可能なパネルとファイル編集機能付き動的フォルダーブラウザー、設定可能なリソース表示、リッチ/ロー切り替え付きグローバル指示エディター、CLI ごとの profile、Web ファイルの HTML プレビュー、新機能の完全な i18n カバレッジ。

---

## コントリビューション

コントリビューションを歓迎します。ガイドラインについては [CONTRIBUTING.md](CONTRIBUTING.md) をご参照ください。

## ライセンス

MIT — 詳細は [LICENSE](LICENSE) をご覧ください。
