/**
 * Minimal i18n system with Svelte 5 runes.
 * Supports 9 languages (matching SwitchHosts). Persists to localStorage.
 */

export type Locale = 'en' | 'de' | 'fr' | 'ja' | 'ko' | 'pl' | 'tr' | 'zh' | 'zh-hant';

const STORAGE_KEY = 'sf-locale';
const VALID_LOCALES: Locale[] = ['en', 'de', 'fr', 'ja', 'ko', 'pl', 'tr', 'zh', 'zh-hant'];

let _locale = $state<Locale>('en');

export function getLocale(): Locale {
  return _locale;
}

export function setLocale(l: Locale): void {
  _locale = l;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, l);
  }
}

export function initLocale(): void {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && VALID_LOCALES.includes(stored)) {
    _locale = stored;
  }
}

/** Supported languages for the UI */
export const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pl', label: 'Polski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'zh', label: '简体中文' },
  { code: 'zh-hant', label: '繁體中文' },
];

// L = [en, de, fr, ja, ko, pl, tr, zh, zh-hant]
type L9 = [string, string, string, string, string, string, string, string, string];
type TranslationMap = Record<string, L9>;

/** Index order: en=0 de=1 fr=2 ja=3 ko=4 pl=5 tr=6 zh=7 zh-hant=8 */
const localeIndex: Record<Locale, number> = {
  en: 0, de: 1, fr: 2, ja: 3, ko: 4, pl: 5, tr: 6, zh: 7, 'zh-hant': 8,
};

const T: TranslationMap = {
  // ── Sidebar ──
  'nav.resources':  ['Resources', 'Ressourcen', 'Ressources', 'リソース', '리소스', 'Zasoby', 'Kaynaklar', '资源', '資源'],
  'nav.system':     ['System', 'System', 'Système', 'システム', '시스템', 'System', 'Sistem', '系统', '系統'],
  'nav.agents':     ['Agents', 'Agenten', 'Agents', 'エージェント', '에이전트', 'Agenci', "Agent'lar", '代理', '代理'],
  'nav.commands':   ['Commands', 'Befehle', 'Commandes', 'コマンド', '명령어', 'Polecenia', 'Komutlar', '命令', '命令'],
  'nav.hooks':      ['Hooks', 'Hooks', 'Hooks', 'フック', '훅', 'Hooki', "Hook'lar", '钩子', '鉤子'],
  'nav.plans':      ['Plans', 'Pläne', 'Plans', 'プラン', '플랜', 'Plany', 'Planlar', '计划', '計劃'],
  'nav.plugins':    ['Plugins', 'Plugins', 'Extensions', 'プラグイン', '플러그인', 'Wtyczki', 'Eklentiler', '插件', '外掛'],
  'nav.skills':     ['Skills', 'Fähigkeiten', 'Compétences', 'スキル', '스킬', 'Umiejętności', 'Beceriler', '技能', '技能'],
  'nav.tasks':      ['Tasks', 'Aufgaben', 'Tâches', 'タスク', '태스크', 'Zadania', 'Görevler', '任务', '任務'],
  'nav.teams':      ['Teams', 'Teams', 'Équipes', 'チーム', '팀', 'Zespoły', 'Takımlar', '团队', '團隊'],
  'nav.todos':      ['Todos', 'Aufgaben', 'À faire', 'ToDo', '할 일', 'Do zrobienia', 'Yapılacaklar', '待办', '待辦'],
  'nav.config':     ['Config', 'Konfiguration', 'Config', '設定', '설정', 'Konfiguracja', 'Yapılandırma', '配置', '配置'],
  'nav.mcp':        ['MCP', 'MCP', 'MCP', 'MCP', 'MCP', 'MCP', 'MCP', 'MCP', 'MCP'],
  'nav.sessions':   ['Sessions', 'Sitzungen', 'Sessions', 'セッション', '세션', 'Sesje', 'Oturumlar', '会话', '工作階段'],
  'nav.settings':   ['Settings', 'Einstellungen', 'Paramètres', '設定', '설정', 'Ustawienia', 'Ayarlar', '设置', '設定'],

  // ── Gear menu ──
  'menu.about':          ['About', 'Über', 'À propos', 'このアプリについて', '정보', 'O programie', 'Hakkında', '关于', '關於'],
  'menu.check_updates':  ['Check for Updates', 'Aktualisierung prüfen', 'Vérifier les mises à jour', 'アップデートを確認', '업데이트 확인', 'Sprawdź aktualizacje', 'Güncellemeleri Kontrol Et', '检查更新', '檢查更新'],
  'menu.feedback':       ['Feedback', 'Feedback', 'Commentaires', 'フィードバック', '피드백', 'Opinia', 'Geri Bildirim', '反馈', '意見回饋'],
  'menu.homepage':       ['Homepage', 'Startseite', "Page d'accueil", 'ホームページ', '홈페이지', 'Strona główna', 'Anasayfa', '主页', '首頁'],
  'menu.backup':         ['Backup', 'Sicherung', 'Sauvegarde', 'バックアップ', '백업', 'Kopia zapasowa', 'Yedekleme', '备份', '備份'],
  'menu.preferences':    ['Preferences', 'Einstellungen', 'Préférences', '環境設定', '환경설정', 'Preferencje', 'Tercihler', '偏好设置', '偏好設定'],
  'menu.devtools':       ['Toggle DevTools', 'DevTools umschalten', 'Outils de développement', '開発者ツール', '개발자 도구', 'Narzędzia deweloperskie', 'Geliştirici Araçları', '开发者工具', '開發者工具'],
  'menu.profiles':       ['Profiles', 'Profile', 'Profils', 'プロファイル', '프로필', 'Profile', 'Profiller', '配置文件', '設定檔'],

  // ── Preferences modal ──
  'pref.title':      ['Preferences', 'Einstellungen', 'Préférences', '環境設定', '환경설정', 'Preferencje', 'Tercihler', '偏好设置', '偏好設定'],
  'pref.theme':      ['Theme', 'Design', 'Thème', 'テーマ', '테마', 'Motyw', 'Tema', '主题', '主題'],
  'pref.language':   ['Language', 'Sprache', 'Langue', '言語', '언어', 'Język', 'Dil', '语言', '語言'],
  'pref.claude_dir': ['Claude Directory', 'Claude-Verzeichnis', 'Répertoire Claude', 'Claudeディレクトリ', 'Claude 디렉토리', 'Katalog Claude', 'Claude Dizini', 'Claude 目录', 'Claude 目錄'],
  'pref.cancel':     ['Cancel', 'Abbrechen', 'Annuler', 'キャンセル', '취소', 'Anuluj', 'İptal', '取消', '取消'],
  'pref.ok':         ['OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'Tamam', '确定', '確定'],

  // ── About modal ──
  'about.description': ['Configuration manager for Claude Code, Codex CLI, and Gemini CLI.', 'Konfigurationsmanager für Claude Code, Codex CLI und Gemini CLI.', 'Gestionnaire de configuration pour Claude Code, Codex CLI et Gemini CLI.', 'Claude Code・Codex CLI・Gemini CLI構成マネージャー。', 'Claude Code, Codex CLI, Gemini CLI 구성 관리자.', 'Menedżer konfiguracji Claude Code, Codex CLI i Gemini CLI.', 'Claude Code, Codex CLI ve Gemini CLI yapılandırma yöneticisi.', 'Claude Code、Codex CLI 和 Gemini CLI 配置管理器。', 'Claude Code、Codex CLI 和 Gemini CLI 配置管理器。'],
  'about.homepage':    ['Homepage', 'Startseite', "Page d'accueil", 'ホームページ', '홈페이지', 'Strona główna', 'Anasayfa', '主页', '首頁'],
  'about.source':      ['Source Code', 'Quellcode', 'Code source', 'ソースコード', '소스 코드', 'Kod źródłowy', 'Kaynak Kod', '源代码', '原始碼'],
  'about.close':       ['Close', 'Schließen', 'Fermer', '閉じる', '닫기', 'Zamknij', 'Kapat', '关闭', '關閉'],

  // ── Top bar ──
  'search': ['Search', 'Suche', 'Rechercher', '検索', '검색', 'Szukaj', 'Ara', '搜索', '搜尋'],

  // ── Common ──
  'save':             ['Save', 'Speichern', 'Enregistrer', '保存', '저장', 'Zapisz', 'Kaydet', '保存', '儲存'],
  'cancel':           ['Cancel', 'Abbrechen', 'Annuler', 'キャンセル', '취소', 'Anuluj', 'İptal', '取消', '取消'],
  'close':            ['Close', 'Schließen', 'Fermer', '閉じる', '닫기', 'Zamknij', 'Kapat', '关闭', '關閉'],
  'delete':           ['Delete', 'Löschen', 'Supprimer', '削除', '삭제', 'Usuń', 'Sil', '删除', '刪除'],
  'new':              ['+ New', '+ Neu', '+ Nouveau', '+ 新規', '+ 새로 만들기', '+ Nowy', '+ Yeni', '+ 新建', '+ 新增'],
  'no_profiles':      ['No profiles saved', 'Keine Profile gespeichert', 'Aucun profil enregistré', 'プロファイルなし', '저장된 프로필 없음', 'Brak zapisanych profili', 'Kayıtlı profil yok', '没有保存的配置', '沒有儲存的設定檔'],
  'manage_profiles':  ['Manage Profiles...', 'Profile verwalten...', 'Gérer les profils...', 'プロファイル管理...', '프로필 관리...', 'Zarządzaj profilami...', 'Profilleri Yönet...', '管理配置文件...', '管理設定檔...'],
  'default':          ['Default', 'Standard', 'Par défaut', 'デフォルト', '기본값', 'Domyślny', 'Varsayılan', '默认', '預設'],
  'active':           ['active', 'aktiv', 'actif', 'アクティブ', '활성', 'aktywny', 'aktif', '激活', '啟用'],

  // ── Theme labels ──
  'theme.auto':  ['Auto', 'Auto', 'Auto', '自動', '자동', 'Auto', 'Otomatik', '自动', '自動'],
  'theme.light': ['Light', 'Hell', 'Clair', 'ライト', '라이트', 'Jasny', 'Aydınlık', '浅色', '淺色'],
  'theme.dark':  ['Dark', 'Dunkel', 'Sombre', 'ダーク', '다크', 'Ciemny', 'Karanlık', '深色', '深色'],

  // ── Settings ──
  'settings.structured': ['Structured', 'Strukturiert', 'Structuré', '構造化', '구조화', 'Strukturalny', 'Yapısal', '结构化', '結構化'],
  'settings.raw_json':   ['Raw JSON', 'Roh-JSON', 'JSON brut', 'Raw JSON', 'Raw JSON', 'Surowy JSON', 'Ham JSON', '原始 JSON', '原始 JSON'],
  'settings.search':     ['Search settings...', 'Einstellungen suchen...', 'Rechercher...', '設定を検索...', '설정 검색...', 'Szukaj ustawień...', 'Ayarlarda ara...', '搜索设置...', '搜尋設定...'],
  'settings.discard':    ['Discard', 'Verwerfen', 'Annuler', '破棄', '취소', 'Odrzuć', 'İptal', '放弃', '捨棄'],

  // ── Updater ──
  'update.latest':         ['You are on the latest version.', 'Sie verwenden die neueste Version.', 'Vous utilisez la dernière version.', '最新バージョンです。', '최신 버전입니다.', 'Masz najnowszą wersję.', 'En güncel sürümdesiniz.', '您已是最新版本。', '您已是最新版本。'],
  'update.available':      ['New version {v} available.', 'Neue Version {v} verfügbar.', 'Nouvelle version {v} disponible.', '新しいバージョン {v} が利用可能です。', '새 버전 {v} 사용 가능.', 'Nowa wersja {v} dostępna.', 'Yeni sürüm {v} mevcut.', '新版本 {v} 可用。', '新版本 {v} 可用。'],
  'update.not_configured': ['Auto-update not configured yet. Check GitHub for new releases.', 'Auto-Update noch nicht konfiguriert. Prüfen Sie GitHub.', "Mise à jour auto non configurée. Vérifiez GitHub.", '自動更新は未設定です。GitHubで確認してください。', '자동 업데이트가 설정되지 않았습니다. GitHub을 확인하세요.', 'Auto-aktualizacja nie skonfigurowana. Sprawdź GitHub.', "Otomatik güncelleme henüz yapılandırılmadı. GitHub'ı kontrol edin.", '自动更新尚未配置。请查看 GitHub。', '自動更新尚未配置。請查看 GitHub。'],
  'update.error':          ['Could not check for updates. Check your connection.', 'Aktualisierung konnte nicht geprüft werden.', 'Impossible de vérifier les mises à jour.', 'アップデートを確認できませんでした。', '업데이트를 확인할 수 없습니다.', 'Nie można sprawdzić aktualizacji.', 'Güncellemeler kontrol edilemedi. Bağlantınızı kontrol edin.', '无法检查更新。请检查网络连接。', '無法檢查更新。請檢查網路連接。'],
  'update.title_checking': ['Checking for updates', 'Checking for updates', 'Checking for updates', 'Checking for updates', 'Checking for updates', 'Checking for updates', 'Checking for updates', 'Checking for updates', 'Checking for updates'],
  'update.title_available': ['Update available', 'Update available', 'Update available', 'Update available', 'Update available', 'Update available', 'Update available', 'Update available', 'Update available'],
  'update.title_ready': ['Restart to finish update', 'Restart to finish update', 'Restart to finish update', 'Restart to finish update', 'Restart to finish update', 'Restart to finish update', 'Restart to finish update', 'Restart to finish update', 'Restart to finish update'],
  'update.title_error': ['Update failed', 'Update failed', 'Update failed', 'Update failed', 'Update failed', 'Update failed', 'Update failed', 'Update failed', 'Update failed'],
  'update.title_latest': ['No update found', 'No update found', 'No update found', 'No update found', 'No update found', 'No update found', 'No update found', 'No update found', 'No update found'],
  'update.summary_checking': ['Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.', 'Looking for the latest published release for this installation.'],
  'update.summary_available': ['Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.', 'Version {next} is ready to download and install over {current}.'],
  'update.summary_downloading': ['Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.', 'Downloading the update package now. Keep the app open until the install step completes.'],
  'update.summary_installing': ['Installing the downloaded release package.', 'Installing the downloaded release package.', 'Installing the downloaded release package.', 'Installing the downloaded release package.', 'Installing the downloaded release package.', 'Installing the downloaded release package.', 'Installing the downloaded release package.', 'Installing the downloaded release package.', 'Installing the downloaded release package.'],
  'update.summary_ready': ['Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.', 'Version {v} is installed. Restart Skill Forge to finish the update.'],
  'update.version_label': ['Version', 'Version', 'Version', 'Version', 'Version', 'Version', 'Version', 'Version', 'Version'],
  'update.release_date': ['Release date', 'Release date', 'Release date', 'Release date', 'Release date', 'Release date', 'Release date', 'Release date', 'Release date'],
  'update.release_notes': ['Release notes', 'Release notes', 'Release notes', 'Release notes', 'Release notes', 'Release notes', 'Release notes', 'Release notes', 'Release notes'],
  'update.status_downloading': ['Downloading update', 'Downloading update', 'Downloading update', 'Downloading update', 'Downloading update', 'Downloading update', 'Downloading update', 'Downloading update', 'Downloading update'],
  'update.status_installing': ['Installing update', 'Installing update', 'Installing update', 'Installing update', 'Installing update', 'Installing update', 'Installing update', 'Installing update', 'Installing update'],
  'update.action_later': ['Later', 'Later', 'Later', 'Later', 'Later', 'Later', 'Later', 'Later', 'Later'],
  'update.action_download_install': ['Download and Install', 'Download and Install', 'Download and Install', 'Download and Install', 'Download and Install', 'Download and Install', 'Download and Install', 'Download and Install', 'Download and Install'],
  'update.action_restart': ['Restart to Update', 'Restart to Update', 'Restart to Update', 'Restart to Update', 'Restart to Update', 'Restart to Update', 'Restart to Update', 'Restart to Update', 'Restart to Update'],
  'update.action_retry': ['Check Again', 'Check Again', 'Check Again', 'Check Again', 'Check Again', 'Check Again', 'Check Again', 'Check Again', 'Check Again'],
  'update.progress_unknown': ['Preparing download size…', 'Preparing download size…', 'Preparing download size…', 'Preparing download size…', 'Preparing download size…', 'Preparing download size…', 'Preparing download size…', 'Preparing download size…', 'Preparing download size…'],
  'update.progress_working': ['Working…', 'Working…', 'Working…', 'Working…', 'Working…', 'Working…', 'Working…', 'Working…', 'Working…'],
  'update.error_label': ['Details', 'Details', 'Details', 'Details', 'Details', 'Details', 'Details', 'Details', 'Details'],
  'update.error_signature': ['This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.', 'This release could not be verified. Check the signing key and published artifacts.'],
  'update.error_network': ['The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.', 'The update server could not be reached. Check your network connection and try again.'],
  'update.error_metadata': ['Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.', 'Release metadata is missing or incomplete. Install the latest GitHub release manually if needed.'],
  'update.error_permission': ['Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.', 'Skill Forge could not replace the current app bundle. Check file permissions or install location.'],
  'update.error_notarization': ['The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.', 'The update was blocked by platform security checks. On macOS, confirm the app is notarized and trusted.'],
  'update.error_generic': ['Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.', 'Skill Forge could not finish the update. Try again or install the latest release manually.'],
  'update.remind_me_later': ['Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.', 'Update dismissed for now. You can reopen it from Check for Updates.'],

  // ── Resource config popover ──
  'res.visible':       ['Visible Resources', 'Sichtbare Ressourcen', 'Ressources visibles', '表示リソース', '표시 리소스', 'Widoczne zasoby', 'Görünen Kaynaklar', '可见资源', '可見資源'],
  'res.builtin':       ['Built-in', 'Integriert', 'Intégré', '組み込み', '기본 제공', 'Wbudowane', 'Yerleşik', '内置', '內建'],
  'res.custom':        ['Custom', 'Benutzerdefiniert', 'Personnalisé', 'カスタム', '사용자 정의', 'Niestandardowe', 'Özel', '自定义', '自訂'],
  'res.auto':          ['auto', 'auto', 'auto', '自動', '자동', 'auto', 'otomatik', '自动', '自動'],

  // ── FolderView ──
  'folder.empty':      ['Empty folder', 'Leerer Ordner', 'Dossier vide', '空のフォルダ', '빈 폴더', 'Pusty folder', 'Boş klasör', '空文件夹', '空資料夾'],
  'folder.select':     ['Select a file to preview', 'Datei zum Anzeigen auswählen', 'Sélectionnez un fichier', 'ファイルを選択してプレビュー', '파일을 선택하여 미리보기', 'Wybierz plik do podglądu', 'Önizlemek için dosya seçin', '选择文件预览', '選擇檔案預覽'],
  'folder.binary':     ['Binary file — preview not available', 'Binärdatei — keine Vorschau', 'Fichier binaire — aperçu non disponible', 'バイナリファイル — プレビュー不可', '바이너리 파일 — 미리보기 불가', 'Plik binarny — podgląd niedostępny', 'İkili dosya — önizleme mevcut değil', '二进制文件 — 无法预览', '二進位檔案 — 無法預覽'],
  'folder.items':      ['{n} items', '{n} Elemente', '{n} éléments', '{n} 項目', '{n}개 항목', '{n} elementów', '{n} öğe', '{n} 个项目', '{n} 個項目'],
  'folder.copy_path':  ['Copy Path', 'Pfad kopieren', 'Copier le chemin', 'パスをコピー', '경로 복사', 'Kopiuj ścieżkę', 'Yolu Kopyala', '复制路径', '複製路徑'],

  // ── Editor modes ──
  'editor.rich':       ['Rich', 'Rich', 'Rich', 'リッチ', '리치', 'Rich', 'Zengin', 'Rich', 'Rich'],
  'editor.raw':        ['Raw', 'Roh', 'Brut', 'Raw', 'Raw', 'Surowy', 'Ham', '原始', '原始'],
  'editor.source':     ['Source', 'Quelle', 'Source', 'ソース', '소스', 'Źródło', 'Kaynak', '源码', '原始碼'],
  'editor.preview':    ['Preview', 'Vorschau', 'Aperçu', 'プレビュー', '미리보기', 'Podgląd', 'Önizleme', '预览', '預覽'],
  'editor.saving':     ['Saving...', 'Speichern...', 'Enregistrement...', '保存中...', '저장 중...', 'Zapisywanie...', 'Kaydediliyor...', '保存中...', '儲存中...'],
  'editor.unsaved':    ['unsaved', 'ungespeichert', 'non enregistré', '未保存', '미저장', 'niezapisane', 'kaydedilmedi', '未保存', '未儲存'],

  // ── Settings: Global Instructions ──
  'settings.global_instructions': ['Global Instructions', 'Globale Anweisungen', 'Instructions globales', 'グローバル指示', '전역 지시사항', 'Instrukcje globalne', 'Genel Talimatlar', '全局指令', '全域指令'],

  // ── Toasts ──
  'toast.preferences_saved': ['Preferences saved', 'Einstellungen gespeichert', 'Préférences enregistrées', '設定を保存しました', '환경설정 저장됨', 'Preferencje zapisane', 'Tercihler kaydedildi', '偏好设置已保存', '偏好設定已儲存'],
  'toast.welcome':           ['Welcome! Skill Forge is ready.', 'Willkommen! Skill Forge ist bereit.', 'Bienvenue ! Skill Forge est prêt.', 'ようこそ！Skill Forgeの準備ができました。', '환영합니다! Skill Forge가 준비되었습니다.', 'Witaj! Skill Forge jest gotowy.', 'Hoş geldiniz! Skill Forge kullanıma hazır.', '欢迎！Skill Forge 已就绪。', '歡迎！Skill Forge 已就緒。'],
  'toast.devtools':          ['Press {shortcut} to open DevTools', 'Drücken Sie {shortcut} für DevTools', 'Appuyez sur {shortcut} pour DevTools', '{shortcut} でDevToolsを開く', '{shortcut}를 눌러 DevTools 열기', 'Naciśnij {shortcut} aby otworzyć DevTools', 'DevTools için {shortcut} tuşlayın', '按 {shortcut} 打开开发者工具', '按 {shortcut} 開啟開發者工具'],
};

/**
 * Translate a key to the current locale.
 * Supports simple {placeholder} interpolation.
 */
export function t(key: string, params?: Record<string, string>): string {
  const entry = T[key];
  if (!entry) return key;
  const idx = localeIndex[_locale] ?? 0;
  let text = entry[idx] || entry[0] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
