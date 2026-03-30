<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge 图标">

# Skill Forge

**Claude Code、Codex CLI 和 Gemini CLI 缺失的图形界面。**

可视化管理你的 CLI 配置 — agent、skill、MCP 服务器、配置文件、hook 和任意自定义文件夹 — 无需直接编辑原始文件。

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=最新版本)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/许可证-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#安装)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **[Türkçe](README_TR.md)** | **简体中文** | **[Deutsch](README_DE.md)** | **[Français](README_FR.md)** | **[日本語](README_JA.md)** | **[한국어](README_KO.md)** | **[Polski](README_PL.md)** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## 什么是 Skill Forge？

Claude Code 将所有内容存储在 `~/.claude/` 中，Codex CLI 存储在 `~/.codex/` 中，Gemini CLI 存储在 `~/.gemini/` 中。Agent 定义、skill 提示词、hook 脚本、MCP 服务器配置、记忆文件、设置 — 功能强大，但手动编辑原始 Markdown 和 JSON 文件既缓慢又容易出错。

**Skill Forge** 是一款原生桌面应用程序，为所有这些提供了简洁的用户界面。

- **多 CLI 支持** — 从侧边栏在 Claude Code、Codex CLI 和 Gemini CLI 之间切换
- 通过结构化界面和专用视图浏览、创建和编辑资源
- **动态文件夹浏览器** — 发现和切换任意自定义目录，使用面包屑导航浏览文件，编辑带行号的文本文件，预览 HTML
- 一键在命名配置文件（工作、个人、客户）之间切换
- 使用 `Ctrl+K` 在所有 agent、skill 和命令中搜索
- 无需编辑 `.mcp.json` 即可管理 MCP 服务器
- 直接从设置中编辑全局指令（CLAUDE.md、AGENTS.md），支持富文本/原始文本切换
- 将配置备份、分享和恢复为便携式 `.sfbackup` 包 — 支持单文件选择和跨机器自动路径重写
- 无需编辑配置文件即可切换核心 UI 语言（9 种语言）
- 在工作流被静默破坏之前捕获验证错误

> 不再手动编辑文件。更快地构建提示词。

---

## 功能特性

| | 功能 | 描述 |
|---|---|---|
| **多 CLI** | Claude、Codex、Gemini | 从侧边栏切换 CLI 适配器 — 每个都有自己的配置目录、配置文件和视图 |
| **动态文件夹** | 浏览任意目录 | 切换 CLI 配置目录中任意文件夹的可见性 — 完整的文件浏览器，支持面包屑导航、可调大小的分割面板、行号编辑和 HTML 预览 |
| **资源视图** | 专用编辑器 | Agent、Skill、命令、Hook、计划、插件、会话、任务、团队、待办事项 — 每个都有 Markdown 编辑器和上下文菜单 |
| **MCP 服务器** | 图形化管理 | 无需编辑 JSON 即可添加、编辑、启用/禁用服务器 |
| **配置文件** | 配置快照 | 按项目或客户保存和恢复每个 CLI 的配置 |
| **设置** | 结构化 + 原始 JSON | 引导式设置部分、直接 JSON 编辑，以及支持富文本/原始文本切换的内联全局指令编辑器（CLAUDE.md / AGENTS.md） |
| **命令面板** | `Ctrl+K` | 跨所有资源类型的即时模糊搜索 |
| **备份与恢复** | 便携式包 | 完整备份（tar.gz）、支持单文件选择的分享与导出，以及为跨机器可移植性提供自动路径重写的导入 |
| **历史与差异** | 变更审查 | 在覆盖之前查看更改了什么 |
| **偏好设置** | 应用级控制 | 从一个窗口更改主题、语言和自定义配置目录 |
| **语言支持** | 9 种 UI 语言 | 英语、德语、法语、日语、韩语、波兰语、土耳其语、简体中文、繁体中文 |
| **验证** | 内联错误 | 在输入时捕获无效名称、格式错误的 JSON 和 YAML 问题 |
| **语法高亮** | Shiki 驱动 | Markdown 编辑器中精美的代码块 |
| **主题与更新** | 原生应用品质 | 浅色/深色/自动主题、静默启动检查、应用内下载/安装和重启提示 |

---

## 语言支持

Skill Forge 包含应用程序外壳和关键设置流程的内置本地化。当前 UI 语言选项：

- 英语
- 德语
- 法语
- 日语
- 韩语
- 波兰语
- 土耳其语
- 简体中文
- 繁体中文

你可以从应用内的"偏好设置"更改语言。本地化层目前涵盖导航、菜单、偏好设置、更新程序消息和结构化设置 UI。

---

## 键盘快捷键

| 快捷键 | 操作 |
|---|---|
| `Ctrl/Cmd K` | 命令面板 — 搜索所有内容 |
| `Ctrl/Cmd S` | 保存当前文件 |
| `Ctrl/Cmd N` | 在活动视图中新建文件 |
| `1` – `9` | 跳转到侧边栏视图 |
| `Ctrl =` / `Ctrl -` | 增大 / 减小字体大小 |
| `Escape` | 关闭模态框或面板 |

---

## CLI 与 Skill Forge 对比

|  | 原始 CLI | Skill Forge |
|--|--|--|
| 编辑 agent | `vim ~/.claude/agents/x.md` | 可视化编辑器，语法高亮 |
| 切换 CLI | 编辑不同的配置目录 | 侧边栏一键 CLI 切换器 |
| 浏览自定义目录 | `ls ~/.claude/projects/` | 支持编辑的动态文件夹浏览器 |
| 切换配置 | 手动复制/粘贴 | 一键配置文件切换 |
| MCP 服务器设置 | 手动编辑 `.mcp.json` | 带表单验证的 GUI |
| 查找文件 | `ls ~/.claude/agents/` | `Ctrl+K` 模糊搜索 |
| 备份配置 | `cp -r ~/.claude ~/backup` | 完整备份或支持单文件粒度的分享与导出 |
| 捕获错误 | 事后发现 | 输入时，内联提示 |

---

## 安装

### 下载

| 平台 | 包 |
|---|---|
| Windows | `.msi` 安装程序 |
| macOS | `.dmg`（Universal — Intel + Apple Silicon） |
| Linux | `.AppImage` 或 `.deb` |

**[下载最新版本](https://github.com/HayriCan/SkillForge/releases/latest)**

> **macOS 提示：** 该应用尚未使用 Apple Developer 证书进行公证。如果 macOS 阻止启动，请前往**系统设置 → 隐私与安全**并点击**"仍然打开"** — 或在终端中运行 `xattr -cr /Applications/SkillForge.app`。

### 从源码构建

如果你不想信任未签名的二进制文件，可以在本地构建：

```bash
# 先决条件：Node 20+、Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

编译后的二进制文件将位于 `src-tauri/target/release/bundle/` 中。

本地源码构建可能不总是与官方发布的元数据和签名链匹配，因此自行构建的二进制文件的应用内更新程序可能会受限或不可用。

### 自动更新

官方 GitHub 发布版本会在启动时静默检查已发布的更新。你也可以从应用菜单触发**检查更新**来手动打开相同的安装流程。

当有更新可用时，Skill Forge 会下载它，原地安装，然后请求重启以完成升级。

发布版本安装是自动更新的受支持路径。自行构建的二进制文件仅为尽力而为，草稿 GitHub 发布在发布之前保持不可见，某些 Linux 包格式可能仍需要手动升级。

在 macOS 上，应用更新后重新启动的应用可能仍会遇到 Gatekeeper 或公证提示。如果发生这种情况，请使用与首次启动相同的**"仍然打开"**或 `xattr -cr` 解决方法。

### 包管理器

```bash
# macOS — 即将推出
brew install skill-forge

# Windows — 即将推出
winget install skill-forge
```

---

## 开发

**先决条件：** Node 20+、Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**技术栈：** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**最近的产品更新：** 多 CLI 适配器支持（Claude Code、Codex CLI、Gemini CLI）、支持可调大小面板和文件编辑的动态文件夹浏览器、可配置的资源可见性、支持富文本/原始文本切换的全局指令编辑器、每 CLI 配置文件、Web 文件的 HTML 预览，以及新功能的完整 i18n 覆盖。

---

## 贡献

欢迎贡献。请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

## 许可证

MIT — 详见 [LICENSE](LICENSE)。
