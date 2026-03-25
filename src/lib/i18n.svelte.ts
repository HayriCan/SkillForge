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
  'about.description': ['Claude Code configuration manager.', 'Claude Code Konfigurationsmanager.', 'Gestionnaire de configuration Claude Code.', 'Claude Code構成マネージャー。', 'Claude Code 구성 관리자.', 'Menedżer konfiguracji Claude Code.', 'Claude Code yapılandırma yöneticisi.', 'Claude Code 配置管理器。', 'Claude Code 配置管理器。'],
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
  'update.available':      ['New version {v} available! Restart to update.', 'Neue Version {v} verfügbar! Neustarten zum Aktualisieren.', 'Nouvelle version {v} disponible ! Redémarrez pour mettre à jour.', '新しいバージョン {v} が利用可能です！再起動して更新してください。', '새 버전 {v} 사용 가능! 재시작하여 업데이트하세요.', 'Nowa wersja {v} dostępna! Uruchom ponownie, aby zaktualizować.', 'Yeni sürüm {v} mevcut! Güncellemek için yeniden başlatın.', '新版本 {v} 可用！重启以更新。', '新版本 {v} 可用！重新啟動以更新。'],
  'update.not_configured': ['Auto-update not configured yet. Check GitHub for new releases.', 'Auto-Update noch nicht konfiguriert. Prüfen Sie GitHub.', "Mise à jour auto non configurée. Vérifiez GitHub.", '自動更新は未設定です。GitHubで確認してください。', '자동 업데이트가 설정되지 않았습니다. GitHub을 확인하세요.', 'Auto-aktualizacja nie skonfigurowana. Sprawdź GitHub.', "Otomatik güncelleme henüz yapılandırılmadı. GitHub'ı kontrol edin.", '自动更新尚未配置。请查看 GitHub。', '自動更新尚未配置。請查看 GitHub。'],
  'update.error':          ['Could not check for updates. Check your connection.', 'Aktualisierung konnte nicht geprüft werden.', 'Impossible de vérifier les mises à jour.', 'アップデートを確認できませんでした。', '업데이트를 확인할 수 없습니다.', 'Nie można sprawdzić aktualizacji.', 'Güncellemeler kontrol edilemedi. Bağlantınızı kontrol edin.', '无法检查更新。请检查网络连接。', '無法檢查更新。請檢查網路連接。'],

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
