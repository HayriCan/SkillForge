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

/// Create a full tar.gz backup of ~/.claude/ and ~/.claude.json.
/// Saves to ~/.claude/backups/ with a timestamped filename.
/// Returns the output path on success.
#[tauri::command]
fn create_full_backup() -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|e| format!("HOME not set: {e}"))?;
    let backup_dir = format!("{home}/.claude/backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("Failed to create backup dir: {e}"))?;

    // Timestamp: 2026-03-27_143055
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Convert epoch to readable date via shell (no chrono dependency needed)
    let date_output = std::process::Command::new("date")
        .args(["-d", &format!("@{now}"), "+%Y-%m-%d_%H%M%S"])
        .output()
        .map_err(|e| format!("date: {e}"))?;
    let date_str = String::from_utf8_lossy(&date_output.stdout).trim().to_string();
    let out_path = format!("{backup_dir}/claude-full-backup-{date_str}.tar.gz");

    // Build tar args: always include .claude/, optionally .claude.json
    let mut args = vec![
        "-czf".to_string(),
        out_path.clone(),
        "-C".to_string(),
        home.clone(),
        ".claude".to_string(),
    ];
    let claude_json = format!("{home}/.claude.json");
    if std::path::Path::new(&claude_json).exists() {
        args.push(".claude.json".to_string());
    }

    let output = std::process::Command::new("tar")
        .args(&args)
        .output()
        .map_err(|e| format!("tar failed: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // tar may warn about changing files but still succeed (exit 1 on some systems)
        if !std::path::Path::new(&out_path).exists() {
            return Err(format!("tar failed: {stderr}"));
        }
    }

    // Get file size for the response
    let size = std::fs::metadata(&out_path)
        .map(|m| m.len())
        .unwrap_or(0);
    Ok(format!("{}|{}", out_path, size))
}

/// Read a file relative to $HOME/.claude/plugins/.
/// Restricted to this subtree to avoid arbitrary file reads.
#[tauri::command]
fn read_plugin_file(relative_path: String) -> Result<String, String> {
    // Prevent path traversal
    if relative_path.contains("..") {
        return Err("path traversal not allowed".into());
    }
    let home = std::env::var("HOME").map_err(|e| format!("HOME not set: {e}"))?;
    let full = format!("{home}/.claude/plugins/{relative_path}");
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
