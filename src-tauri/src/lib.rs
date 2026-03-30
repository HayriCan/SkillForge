#[tauri::command]
fn run_claude_mcp_list() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let path = format!(
        "{home}/.local/bin:{home}/.npm-global/bin:/usr/local/bin:/usr/bin:/bin",
        home = home
    );
    let output = std::process::Command::new("sh")
        .args(["-c", "claude mcp list"])
        .env("PATH", &path)
        .current_dir(&home)
        .output()
        .map_err(|e| format!("Failed to run claude: {}", e))?;
    if !output.status.success() && output.stdout.is_empty() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Create a full tar.gz backup of the active CLI's config directory.
/// config_dir_name: e.g. ".claude", ".codex", ".gemini"
/// mcp_config_file: e.g. ".claude.json" or null (relative to $HOME)
/// Saves to <configDir>/backups/ with a timestamped filename.
/// Returns "path|size" on success.
#[tauri::command]
fn create_full_backup(config_dir_name: String, mcp_config_file: Option<String>) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|e| format!("HOME not set: {e}"))?;
    let backup_dir = format!("{home}/{config_dir_name}/backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("Failed to create backup dir: {e}"))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let date_output = std::process::Command::new("date")
        .args(["-d", &format!("@{now}"), "+%Y-%m-%d_%H%M%S"])
        .output()
        .map_err(|e| format!("date: {e}"))?;
    let date_str = String::from_utf8_lossy(&date_output.stdout).trim().to_string();
    // Strip leading dot for filename (e.g. ".claude" → "claude")
    let clean_name = config_dir_name.trim_start_matches('.');
    let out_path = format!("{backup_dir}/{clean_name}-full-backup-{date_str}.tar.gz");

    let mut args = vec![
        "-czf".to_string(),
        out_path.clone(),
        "-C".to_string(),
        home.clone(),
        config_dir_name.clone(),
    ];
    // Include MCP config file if it exists (e.g. .claude.json at $HOME level)
    if let Some(ref mcp_file) = mcp_config_file {
        // Only include top-level files (not paths inside the config dir)
        if !mcp_file.contains('/') {
            let mcp_path = format!("{home}/{mcp_file}");
            if std::path::Path::new(&mcp_path).exists() {
                args.push(mcp_file.clone());
            }
        }
    }

    let output = std::process::Command::new("tar")
        .args(&args)
        .output()
        .map_err(|e| format!("tar failed: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !std::path::Path::new(&out_path).exists() {
            return Err(format!("tar failed: {stderr}"));
        }
    }

    let size = std::fs::metadata(&out_path)
        .map(|m| m.len())
        .unwrap_or(0);
    Ok(format!("{}|{}", out_path, size))
}

/// Read a file relative to <configDir>/plugins/.
/// config_dir_name: e.g. ".claude", ".codex", ".gemini"
/// Restricted to this subtree to avoid arbitrary file reads.
#[tauri::command]
fn read_plugin_file(config_dir_name: String, relative_path: String) -> Result<String, String> {
    if relative_path.contains("..") {
        return Err("path traversal not allowed".into());
    }
    let home = std::env::var("HOME").map_err(|e| format!("HOME not set: {e}"))?;
    let full = format!("{home}/{config_dir_name}/plugins/{relative_path}");
    std::fs::read_to_string(&full).map_err(|e| format!("{full}: {e}"))
}

#[tauri::command]
fn toggle_devtools(window: tauri::WebviewWindow) {
    if window.is_devtools_open() {
        window.close_devtools();
    } else {
        window.open_devtools();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![run_claude_mcp_list, read_plugin_file, create_full_backup, toggle_devtools])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
