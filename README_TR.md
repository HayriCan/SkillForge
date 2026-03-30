<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge logosu">

# Skill Forge

**Claude Code, Codex CLI ve Gemini CLI için eksik olan GUI.**

CLI yapılandırmanızı — agent'lar, skill'ler, MCP sunucuları, profiller, hook'lar ve herhangi bir özel klasör — ham dosyalara dokunmadan görsel olarak yönetin.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=son%20sürüm)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/lisans-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#kurulum)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**[English](README.md)** | **Türkçe** | **[简体中文](README_ZH.md)** | **[Deutsch](README_DE.md)** | **[Français](README_FR.md)** | **[日本語](README_JA.md)** | **[한국어](README_KO.md)** | **[Polski](README_PL.md)** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## Skill Forge Nedir?

Claude Code her şeyi `~/.claude/` içinde, Codex CLI `~/.codex/` içinde, Gemini CLI ise `~/.gemini/` içinde saklar. Agent tanımları, skill prompt'ları, hook script'leri, MCP sunucu yapılandırmaları, bellek dosyaları, ayarlar — güçlü bir sistem ama ham Markdown ve JSON düzenlemek yavaş ve hataya açıktır.

**Skill Forge**, tüm bunların üzerine temiz bir arayüz koyan native bir masaüstü uygulamasıdır.

- **Çoklu CLI desteği** — kenar çubuğundan Claude Code, Codex CLI ve Gemini CLI arasında geçiş yapın
- Yapılandırılmış arayüz ve özel görünümlerle kaynakları göz atın, oluşturun ve düzenleyin
- **Dinamik klasör tarayıcısı** — herhangi bir özel dizini keşfedin, breadcrumb navigasyonuyla dosyaları göz atın, satır numaralı metin dosyalarını düzenleyin, HTML önizlemesi yapın
- Adlandırılmış profiller (iş, kişisel, müşteri) arasında tek tıkla geçiş yapın
- `Ctrl+K` ile tüm agent'lar, skill'ler ve komutlar arasında arama yapın
- `.mcp.json` dosyasına dokunmadan MCP sunucularını yönetin
- Global talimatları (CLAUDE.md, AGENTS.md) doğrudan Ayarlar'dan Zengin/Ham geçişiyle düzenleyin
- Yapılandırmanızı taşınabilir `.sfbackup` paketi olarak yedekleyin, paylaşın ve geri yükleyin — dosya bazlı seçim ve makineler arası otomatik path düzeltmesi ile
- Yapılandırma dosyalarını düzenlemeden temel arayüz dilini değiştirin (9 dil)
- İş akışlarınızı sessizce bozmadan önce doğrulama hatalarını yakalayın

> Dosyaları elle düzenlemeyi bırakın. Prompt'ları daha hızlı oluşturun.

---

## Özellikler

| | Özellik | Açıklama |
|---|---|---|
| **Çoklu CLI** | Claude, Codex, Gemini | Kenar çubuğundan CLI adaptörleri arasında geçiş — her biri kendi yapılandırma dizini, profilleri ve görünümleriyle |
| **Dinamik Klasörler** | Herhangi bir dizini göz atın | CLI yapılandırma dizininizdeki herhangi bir klasörün görünürlüğünü değiştirin — breadcrumb navigasyonu, yeniden boyutlandırılabilir bölünmüş panel, satır numaralı düzenleme ve HTML önizlemesi ile tam dosya tarayıcısı |
| **Kaynak Görünümleri** | Özel editörler | Agent'lar, Skill'ler, Komutlar, Hook'lar, Planlar, Plugin'ler, Oturumlar, Görevler, Takımlar, Yapılacaklar — her biri Markdown editörü ve bağlam menüsü ile |
| **MCP Sunucuları** | GUI yönetimi | JSON'a dokunmadan sunucu ekleyin, düzenleyin, etkinleştirin/devre dışı bırakın |
| **Profiller** | Yapılandırma anlık görüntüleri | Proje veya müşteri bazlı CLI yapılandırmalarını kaydedin ve geri yükleyin |
| **Ayarlar** | Yapısal + ham JSON | Rehberli ayar bölümleri, doğrudan JSON düzenleme ve Zengin/Ham geçişli satır içi global talimat editörü (CLAUDE.md / AGENTS.md) |
| **Komut Paleti** | `Ctrl+K` | Tüm kaynak türleri arasında anında bulanık arama |
| **Yedekleme ve Geri Yükleme** | Taşınabilir paketler | Tam yedekleme (tar.gz), dosya bazlı seçimli Paylaş & Dışa Aktar ve makineler arası taşınabilirlik için otomatik path düzeltmeli içe aktarma |
| **Geçmiş ve Fark** | Değişiklik incelemesi | Üzerine yazmadan önce neyin değiştiğini görün |
| **Tercihler** | Uygulama düzeyinde kontroller | Tek bir pencereden tema, dil ve özel yapılandırma dizinini değiştirin |
| **Dil Desteği** | 9 arayüz dili | İngilizce, Almanca, Fransızca, Japonca, Korece, Lehçe, Türkçe, Basitleştirilmiş Çince, Geleneksel Çince |
| **Doğrulama** | Satır içi hatalar | Yazarken geçersiz adları, bozuk JSON'u ve YAML sorunlarını yakalayın |
| **Sözdizimi Vurgulama** | Shiki destekli | Markdown editörünün içinde güzel kod blokları |
| **Temalar ve Güncellemeler** | Native uygulama cilası | Açık/Koyu/Otomatik tema, sessiz başlangıç kontrolleri, uygulama içi indirme/kurulum ve yeniden başlatma istemi |

---

## Dil Desteği

Skill Forge, uygulama kabuğu ve temel ayar akışları için yerleşik yerelleştirme içerir. Mevcut arayüz dili seçenekleri:

- İngilizce
- Almanca
- Fransızca
- Japonca
- Korece
- Lehçe
- Türkçe
- Basitleştirilmiş Çince
- Geleneksel Çince

Dili uygulama içindeki `Tercihler` bölümünden değiştirebilirsiniz. Yerelleştirme katmanı şu anda navigasyon, menüler, tercihler, güncelleyici mesajları ve yapılandırılmış ayarlar arayüzünü kapsar.

---

## Klavye Kısayolları

| Kısayol | İşlem |
|---|---|
| `Ctrl/Cmd K` | Komut paleti — her şeyi arayın |
| `Ctrl/Cmd S` | Mevcut dosyayı kaydedin |
| `Ctrl/Cmd N` | Aktif görünümde yeni dosya |
| `1` – `9` | Kenar çubuğu görünümlerine atlayın |
| `Ctrl =` / `Ctrl -` | Yazı boyutu büyüt / küçült |
| `Escape` | Modal veya paleti kapatın |

---

## CLI ve Skill Forge Karşılaştırması

|  | Ham CLI | Skill Forge |
|--|--|--|
| Agent düzenle | `vim ~/.claude/agents/x.md` | Görsel editör, sözdizimi vurgulu |
| CLI değiştir | Farklı yapılandırma dizinlerini düzenle | Kenar çubuğunda tek tıkla CLI değiştirici |
| Özel dizinleri göz at | `ls ~/.claude/projects/` | Düzenleme özellikli dinamik klasör tarayıcısı |
| Yapılandırma değiştir | Manuel kopyala/yapıştır | Tek tıkla profil değiştirme |
| MCP sunucu kurulumu | `.mcp.json` dosyasını elle düzenle | Form doğrulamalı GUI |
| Dosya bul | `ls ~/.claude/agents/` | `Ctrl+K` bulanık arama |
| Yapılandırmayı yedekle | `cp -r ~/.claude ~/backup` | Tam yedekleme veya dosya bazlı Paylaş & Dışa Aktar |
| Hataları yakala | Sonradan | Yazarken, satır içinde |

---

## Kurulum

### İndirme

| Platform | Paket |
|---|---|
| Windows | `.msi` yükleyici |
| macOS | `.dmg` (Universal — Intel + Apple Silicon) |
| Linux | `.AppImage` veya `.deb` |

**[Son sürümü indirin](https://github.com/HayriCan/SkillForge/releases/latest)**

> **macOS notu:** Uygulama henüz Apple Developer sertifikasıyla noterize edilmemiştir. macOS başlatmayı engellerse, **Sistem Ayarları → Gizlilik ve Güvenlik** bölümüne gidin ve **"Yine de Aç"** seçeneğine tıklayın — veya Terminal'de `xattr -cr /Applications/SkillForge.app` komutunu çalıştırın.

### Kaynaktan Derleme

İmzasız binary'lere güvenmek istemiyorsanız, yerel olarak derleyebilirsiniz:

```bash
# Ön koşullar: Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

Derlenen binary `src-tauri/target/release/bundle/` içinde olacaktır.

Yerel kaynak derlemeleri her zaman resmi sürüm meta verileri ve imzalama zinciriyle eşleşmeyebilir, bu nedenle kendi derlediğiniz binary'lerde uygulama içi güncelleyici sınırlı olabilir veya kullanılamayabilir.

### Otomatik Güncellemeler

Resmi GitHub sürüm derlemeleri başlangıçta sessizce yayınlanan güncellemeleri kontrol eder. Aynı kurulum akışını manuel olarak açmak için uygulama menüsünden **Güncellemeleri Kontrol Et** seçeneğini de tetikleyebilirsiniz.

Bir güncelleme mevcut olduğunda, Skill Forge onu indirir, yerinde kurar ve ardından yükseltmeyi tamamlamak için yeniden başlatma ister.

Sürüm derlemeli kurulumlar otomatik güncellemeler için desteklenen yoldur. Kendi derlediğiniz binary'ler yalnızca en iyi çaba esasınadır, taslak GitHub sürümleri yayınlanana kadar görünmez kalır ve bazı Linux paket formatları hâlâ manuel yükseltme gerektirebilir.

macOS'ta, bir güncelleme uygulandıktan sonra yeniden başlatılan uygulama hâlâ Gatekeeper veya noterize istemlerine takılabilir. Bu durumda, ilk başlatmadakiyle aynı **Yine de Aç** veya `xattr -cr` geçici çözümünü kullanın.

### Paket Yöneticileri

```bash
# macOS — yakında
brew install skill-forge

# Windows — yakında
winget install skill-forge
```

---

## Geliştirme

**Ön koşullar:** Node 20+, Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**Teknoloji yığını:** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**Son ürün eklemeleri:** çoklu CLI adaptör desteği (Claude Code, Codex CLI, Gemini CLI), yeniden boyutlandırılabilir panel ve dosya düzenleme özellikli dinamik klasör tarayıcısı, yapılandırılabilir kaynak görünürlüğü, Zengin/Ham geçişli global talimat editörü, CLI bazlı profiller, web dosyaları için HTML önizleme ve yeni özellikler için tam i18n kapsamı.

---

## Katkıda Bulunma

Katkılarınızı bekliyoruz. Yönergeler için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın.

## Lisans

MIT — ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
