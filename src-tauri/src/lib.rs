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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![run_claude_mcp_list, toggle_devtools])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
