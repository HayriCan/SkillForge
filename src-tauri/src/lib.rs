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

/// Run `claude /insights` to generate usage-data/ analytics.
/// Returns stdout on success; stderr as Err on failure.
#[tauri::command]
fn generate_insights() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let path = format!(
        "{home}/.local/bin:{home}/.npm-global/bin:/usr/local/bin:/usr/bin:/bin",
        home = home
    );
    let output = std::process::Command::new("sh")
        .args(["-c", "claude /insights"])
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
    let now_str = now.to_string();
    let at_now = format!("@{now}");
    let date_args: &[&str] = if cfg!(target_os = "macos") {
        &["-r", &now_str, "+%Y-%m-%d_%H%M%S"]
    } else {
        &["-d", &at_now, "+%Y-%m-%d_%H%M%S"]
    };
    let date_output = std::process::Command::new("date")
        .args(date_args)
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
    if relative_path.contains("..") || relative_path.starts_with('/') {
        return Err("path traversal not allowed".into());
    }
    let home = std::env::var("HOME").map_err(|e| format!("HOME not set: {e}"))?;
    let base = std::path::Path::new(&home)
        .join(&config_dir_name)
        .join("plugins");
    let full = base.join(&relative_path);
    // Eğer dosya varsa canonicalize ile boundary kontrolü yap
    if full.exists() {
        if let Ok(canonical) = full.canonicalize() {
            if !canonical.starts_with(&base) {
                return Err("path traversal not allowed".into());
            }
        }
    }
    std::fs::read_to_string(&full).map_err(|e| format!("{}: {e}", full.display()))
}

/// Run the active CLI (claude/codex/gemini) with a file context prompt.
/// The full prompt (with file content + user instruction) is sent via stdin
/// to the CLI's non-interactive print mode.
/// Returns the CLI's stdout — the modified file content.
#[tauri::command]
fn run_cli_on_file(
    cli_id: String,
    file_name: String,
    file_content: String,
    user_prompt: String,
) -> Result<String, String> {
    use std::io::Write;
    use std::process::{Command, Stdio};

    let home = std::env::var("HOME").unwrap_or_default();
    let path_env = format!(
        "{home}/.local/bin:{home}/.npm-global/bin:/usr/local/bin:/usr/bin:/bin",
        home = home
    );

    let full_prompt = format!(
        "File: {file_name}\n\nCurrent content:\n{file_content}\n\nInstruction: {user_prompt}\n\nReturn ONLY the complete updated file content. No explanations, no markdown code fences (no ```), no preamble, no postamble."
    );

    let sh_cmd = match cli_id.as_str() {
        "claude" => "claude --print".to_string(),
        "codex"  => "codex -q".to_string(),
        "gemini" => "gemini -p".to_string(),
        other    => return Err(format!("Unknown CLI: {other}")),
    };

    let mut child = Command::new("sh")
        .args(["-c", &sh_cmd])
        .env("PATH", &path_env)
        .current_dir(&home)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn {cli_id}: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(full_prompt.as_bytes());
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("CLI wait failed: {e}"))?;

    if !output.status.success() && output.stdout.is_empty() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
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
        .invoke_handler(tauri::generate_handler![run_claude_mcp_list, read_plugin_file, create_full_backup, toggle_devtools, generate_insights, run_cli_on_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
