#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    name: String,
    version: String,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: "Debt Growth".into(),
        version: env!("CARGO_PKG_VERSION").into(),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("Debt Growth failed to start");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_version_is_the_crate_version() {
        assert_eq!(app_info().version, env!("CARGO_PKG_VERSION"));
        assert!(!app_info().version.is_empty());
    }
}
