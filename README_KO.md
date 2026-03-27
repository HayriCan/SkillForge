<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge 로고">

# Skill Forge

**Claude Code, Codex CLI 및 Gemini CLI를 위한 GUI.**

CLI 구성을 시각적으로 관리하세요 — agent, skill, MCP 서버, profile, hook, 그리고 모든 사용자 정의 폴더까지 — 원본 파일을 직접 수정할 필요가 없습니다.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=latest)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#설치)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **[Türkçe](README_TR.md)** | **[简体中文](README_ZH.md)** | **[Deutsch](README_DE.md)** | **[Français](README_FR.md)** | **[日本語](README_JA.md)** | **한국어** | **[Polski](README_PL.md)** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## Skill Forge란?

Claude Code는 모든 것을 `~/.claude/`에, Codex CLI는 `~/.codex/`에, Gemini CLI는 `~/.gemini/`에 저장합니다. Agent 정의, skill 프롬프트, hook 스크립트, MCP 서버 구성, 메모리 파일, 설정 — 강력한 시스템이지만, Markdown과 JSON을 직접 편집하는 것은 느리고 오류가 발생하기 쉽습니다.

**Skill Forge**는 이 모든 것 위에 깔끔한 UI를 제공하는 네이티브 데스크톱 애플리케이션입니다.

- **다중 CLI 지원** — 사이드바에서 Claude Code, Codex CLI, Gemini CLI 간에 전환합니다
- 전용 뷰가 포함된 구조화된 인터페이스를 통해 리소스를 탐색, 생성 및 편집합니다
- **동적 폴더 브라우저** — 사용자 정의 디렉토리를 검색하고 토글하며, breadcrumb 내비게이션으로 파일을 탐색하고, 줄 번호가 있는 텍스트 파일을 편집하고, HTML을 미리 봅니다
- 이름이 지정된 profile(업무, 개인, 고객) 간에 한 번의 클릭으로 전환합니다
- `Ctrl+K`로 모든 agent, skill, 명령어를 검색합니다
- `.mcp.json`을 직접 수정하지 않고 MCP 서버를 관리합니다
- 설정에서 리치/원본 토글로 글로벌 지침(CLAUDE.md, AGENTS.md)을 직접 편집합니다
- 구성을 휴대용 `.sfbackup` 번들로 backup, 공유 및 복원합니다 — 개별 파일 선택과 머신 간 자동 경로 변환을 지원합니다
- 구성 파일을 편집하지 않고 기본 UI 언어를 변경합니다 (9개 언어)
- 워크플로우를 조용히 손상시키기 전에 유효성 검사 오류를 포착합니다

> 파일을 직접 편집하는 것을 멈추세요. 프롬프트를 더 빠르게 작성하세요.

---

## 기능

| | 기능 | 설명 |
|---|---|---|
| **다중 CLI** | Claude, Codex, Gemini | 사이드바에서 CLI 어댑터 간 전환 — 각각 고유한 구성 디렉토리, profile, 뷰를 가집니다 |
| **동적 폴더** | 모든 디렉토리 탐색 | CLI 구성 디렉토리의 모든 폴더 표시/숨김 전환 — breadcrumb 내비게이션, 크기 조절 가능한 분할 패널, 줄 번호 편집, HTML 미리보기를 갖춘 완전한 파일 브라우저 |
| **리소스 뷰** | 전용 편집기 | Agent, Skill, 명령어, Hook, 플랜, Plugin, 세션, 작업, 팀, 할 일 — 각각 Markdown 편집기와 컨텍스트 메뉴를 포함 |
| **MCP 서버** | GUI 관리 | JSON을 직접 수정하지 않고 서버 추가, 편집, 활성화/비활성화 |
| **Profile** | 구성 스냅샷 | 프로젝트 또는 고객별 CLI 구성을 저장하고 복원합니다 |
| **설정** | 구조화 + 원본 JSON | 안내식 설정 섹션, 직접 JSON 편집, 리치/원본 토글이 포함된 인라인 글로벌 지침 편집기 (CLAUDE.md / AGENTS.md) |
| **명령어 팔레트** | `Ctrl+K` | 모든 리소스 유형에서 즉시 퍼지 검색 |
| **Backup 및 복원** | 휴대용 번들 | 전체 backup(tar.gz), 개별 파일 선택이 가능한 공유 및 export, 머신 간 이식성을 위한 자동 경로 변환 import |
| **히스토리 및 비교** | 변경 검토 | 덮어쓰기 전에 무엇이 변경되었는지 확인합니다 |
| **환경 설정** | 앱 수준 제어 | 하나의 모달에서 테마, 언어, 사용자 정의 구성 디렉토리를 변경합니다 |
| **언어 지원** | 9개 UI 언어 | English, Deutsch, Fran&ccedil;ais, 日本語, 한국어, Polski, T&uuml;rk&ccedil;e, 简体中文, 繁體中文 |
| **유효성 검사** | 인라인 오류 | 입력 중 잘못된 이름, 형식이 올바르지 않은 JSON, YAML 문제를 포착합니다 |
| **구문 강조** | Shiki 기반 | Markdown 편집기 내의 아름다운 코드 블록 |
| **테마 및 업데이트** | 네이티브 앱 완성도 | 라이트/다크/자동 테마, 무음 시작 확인, 앱 내 다운로드/설치 및 재시작 안내 |

---

## 언어 지원

Skill Forge는 앱 셸과 주요 설정 플로우에 대한 내장 현지화를 포함합니다. 현재 UI 언어 옵션은 다음과 같습니다:

- English
- Deutsch
- Fran&ccedil;ais
- 日本語
- 한국어
- Polski
- T&uuml;rk&ccedil;e
- 简体中文
- 繁體中文

앱 내 `환경 설정`에서 언어를 변경할 수 있습니다. 현지화 레이어는 현재 내비게이션, 메뉴, 환경 설정, 업데이터 메시지, 구조화된 설정 UI를 포함합니다.

---

## 키보드 단축키

| 단축키 | 동작 |
|---|---|
| `Ctrl/Cmd K` | 명령어 팔레트 — 모든 것을 검색 |
| `Ctrl/Cmd S` | 현재 파일 저장 |
| `Ctrl/Cmd N` | 활성 뷰에서 새 파일 |
| `1` – `9` | 사이드바 뷰로 이동 |
| `Ctrl =` / `Ctrl -` | 글꼴 크기 확대 / 축소 |
| `Escape` | 모달 또는 팔레트 닫기 |

---

## CLI vs Skill Forge

|  | 원본 CLI | Skill Forge |
|--|--|--|
| Agent 편집 | `vim ~/.claude/agents/x.md` | 구문 강조가 포함된 시각적 편집기 |
| CLI 전환 | 다른 구성 디렉토리를 편집 | 사이드바에서 한 번의 클릭으로 CLI 전환 |
| 사용자 정의 디렉토리 탐색 | `ls ~/.claude/projects/` | 편집 기능이 포함된 동적 폴더 브라우저 |
| 구성 전환 | 수동 복사/붙여넣기 | 한 번의 클릭으로 profile 전환 |
| MCP 서버 설정 | `.mcp.json`을 직접 편집 | 폼 유효성 검사가 포함된 GUI |
| 파일 찾기 | `ls ~/.claude/agents/` | `Ctrl+K` 퍼지 검색 |
| 구성 backup | `cp -r ~/.claude ~/backup` | 전체 backup 또는 파일 단위 세부 선택이 가능한 공유 및 export |
| 오류 포착 | 사후 확인 | 입력 중 인라인으로 확인 |

---

## 설치

### 다운로드

| 플랫폼 | 패키지 |
|---|---|
| Windows | `.msi` 설치 프로그램 |
| macOS | `.dmg` (Universal — Intel + Apple Silicon) |
| Linux | `.AppImage` 또는 `.deb` |

**[최신 릴리스 다운로드](https://github.com/HayriCan/SkillForge/releases/latest)**

> **macOS 참고:** 이 앱은 아직 Apple Developer 인증서로 공증되지 않았습니다. macOS가 실행을 차단하는 경우, **시스템 설정 → 개인 정보 보호 및 보안**으로 이동하여 **"그래도 열기"**를 클릭하세요 — 또는 터미널에서 `xattr -cr /Applications/SkillForge.app`을 실행하세요.

### 소스에서 빌드

서명되지 않은 바이너리를 신뢰하지 않으려면, 로컬에서 빌드할 수 있습니다:

```bash
# 필수 조건: Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

컴파일된 바이너리는 `src-tauri/target/release/bundle/`에 위치합니다.

로컬 소스 빌드는 공식 릴리스 메타데이터 및 서명 체인과 항상 일치하지 않을 수 있으므로, 자체 빌드된 바이너리에서는 앱 내 업데이터가 제한되거나 사용할 수 없을 수 있습니다.

### 자동 업데이트

공식 GitHub 릴리스 빌드는 시작 시 게시된 업데이트를 무음으로 확인합니다. 앱 메뉴에서 **업데이트 확인**을 통해 동일한 설치 플로우를 수동으로 실행할 수도 있습니다.

업데이트가 사용 가능하면, Skill Forge가 다운로드하고, 현재 위치에 설치한 후, 업그레이드를 완료하기 위해 재시작을 요청합니다.

릴리스 빌드 설치가 자동 업데이트의 지원 경로입니다. 자체 빌드된 바이너리는 최선의 노력 수준이며, 초안 GitHub 릴리스는 게시될 때까지 표시되지 않으며, 일부 Linux 패키지 형식은 여전히 수동 업그레이드가 필요할 수 있습니다.

macOS에서는 업데이트가 적용된 후 재실행된 앱이 여전히 Gatekeeper 또는 공증 프롬프트에 걸릴 수 있습니다. 이 경우 첫 실행 시와 동일한 **그래도 열기** 또는 `xattr -cr` 해결 방법을 사용하세요.

### 패키지 관리자

```bash
# macOS — 곧 지원 예정
brew install skill-forge

# Windows — 곧 지원 예정
winget install skill-forge
```

---

## 개발

**필수 조건:** Node 20+, Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**기술 스택:** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**최근 제품 추가 사항:** 다중 CLI 어댑터 지원 (Claude Code, Codex CLI, Gemini CLI), 크기 조절 가능한 패널과 파일 편집이 포함된 동적 폴더 브라우저, 구성 가능한 리소스 표시, 리치/원본 토글이 포함된 글로벌 지침 편집기, CLI별 profile, 웹 파일을 위한 HTML 미리보기, 새로운 기능에 대한 전체 i18n 지원.

---

## 기여하기

기여를 환영합니다. 가이드라인은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 라이선스

MIT — [LICENSE](LICENSE)를 참조하세요.
