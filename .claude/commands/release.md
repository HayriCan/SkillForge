# Release Skill

Skill Forge için yeni release oluşturma süreci. Kullanıcıdan versiyon bilgisi al ve tüm adımları uygula.

## Parametreler

- `$ARGUMENTS` — Yeni versiyon numarası (ör: `0.4.0`). Verilmezse kullanıcıya sor.

## Adımlar

### 1. Ön Kontrol
- `git status` ile uncommitted değişiklik olup olmadığını kontrol et
- Uncommitted değişiklik varsa kullanıcıyı uyar ve devam etmek isteyip istemediğini sor
- `npm run check` ve `npm test` çalıştır — hata varsa DUR
- Mevcut versiyonu `package.json`'dan oku ve kullanıcıya göster
- Verilen versiyon numarasının mevcut versiyondan büyük olduğunu doğrula

### 2. Version Bump
Aşağıdaki 3 dosyada versiyonu güncelle:
- `package.json` → `"version": "X.Y.Z"`
- `src-tauri/Cargo.toml` → `version = "X.Y.Z"`
- `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`

Sonra `cargo generate-lockfile --manifest-path src-tauri/Cargo.toml` çalıştır.

### 3. Commit & Tag
- Değişiklikleri commit et: `feat: release vX.Y.Z`
- NOT: Sadece version bump dosyalarını değil, tüm staged ve unstaged değişiklikleri dahil et (kullanıcı onay verdiyse)
- `vX.Y.Z` tag'i oluştur

### 4. Push
- `git push origin main` ve `git push origin vX.Y.Z`
- Bu otomatik olarak GitHub Actions Release workflow'unu tetikler

### 5. Build İzleme
- `gh run list --limit 1 --workflow=release.yml` ile run ID'yi al
- `gh run watch <ID> --exit-status` ile arka planda izle
- Tamamlanınca sonucu kontrol et — başarısızsa logları göster

### 6. Release Doğrulama
Build başarılıysa:
- `gh release view vX.Y.Z --json assets --jq '.assets[].name'` ile asset listesini göster
- `.sig` dosyalarının ve `latest.json`'ın varlığını doğrula
- `latest.json` içeriğinden version ve platform sayısını göster

### 7. Publish
- Kullanıcıya draft release'i publish etmek isteyip istemediğini sor
- Onay gelirse: `gh release edit vX.Y.Z --draft=false`
- Publish sonrası `https://github.com/HayriCan/SkillForge/releases/latest/download/latest.json` endpoint'ini doğrula

### 8. Vault Sync
Session sonu protokolüne uygun olarak Obsidian vault'u güncelle:
- `ilerleme.md` dosyasında yeni versiyon bilgisini güncelle
- `dev-notes.md`'ye release notu ekle

## Hata Durumları
- Build başarısız olursa: logları göster, tag'i silme — kullanıcıya fix yaptıktan sonra tag'i tekrar oluşturmasını öner
- `.sig` dosyaları eksikse: `tauri.conf.json`'da `bundle.createUpdaterArtifacts: true` olduğunu kontrol et
- `latest.json` eksikse: signing key'in GitHub secrets'ta doğru set edildiğini kontrol et
