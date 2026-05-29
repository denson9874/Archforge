// Minimal embedded copy of backend modules for Tauri commands

pub mod models {
    use chrono::{DateTime, Utc};
    use serde::{Deserialize, Serialize};

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct AurPackage {
        #[serde(rename = "Name")]
        pub name: String,
        #[serde(rename = "Version")]
        pub version: String,
        #[serde(rename = "Description")]
        pub description: String,
        #[serde(rename = "NumVotes")]
        pub num_votes: i32,
        #[serde(rename = "Popularity")]
        pub popularity: f64,
        #[serde(rename = "Maintainer")]
        pub maintainer: String,
        #[serde(rename = "LastModified")]
        pub last_modified: DateTime<Utc>,
        #[serde(rename = "FirstSubmitted")]
        pub first_submitted: DateTime<Utc>,
        #[serde(rename = "URL")]
        pub url: String,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct SearchRequest {
        pub query: String,
        #[serde(default)]
        pub limit: Option<usize>,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct SearchResponse {
        pub results: Vec<AurPackage>,
        pub total: usize,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct PackageDetailResponse {
        pub package: Option<AurPackage>,
        pub dependencies: Vec<String>,
        pub make_dependencies: Vec<String>,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct BuildSimulatorRequest {
        pub package_name: String,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct BuildStep {
        pub step: String,
        pub status: String,
        pub message: String,
        pub timestamp: DateTime<Utc>,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct BuildSimulatorResponse {
        pub package_name: String,
        pub steps: Vec<BuildStep>,
        pub success: bool,
        pub duration_ms: u64,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct SystemHealthResponse {
        pub cpu_usage: f64,
        pub memory_usage: f64,
        pub memory_total_mb: u64,
        pub memory_available_mb: u64,
        pub running_processes: usize,
        pub timestamp: DateTime<Utc>,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct ProcessInfo {
        pub id: String,
        pub package_name: String,
        pub status: String,
        pub started_at: DateTime<Utc>,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct PackageOperationRequest {
        pub package_name: String,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct PackageOperationResponse {
        pub success: bool,
        pub message: String,
        pub package_name: String,
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct ErrorResponse {
        pub error: String,
        pub details: Option<String>,
    }

    impl ErrorResponse {
        pub fn new(error: &str) -> Self {
            ErrorResponse {
                error: error.to_string(),
                details: None,
            }
        }

        pub fn with_details(error: &str, details: &str) -> Self {
            ErrorResponse {
                error: error.to_string(),
                details: Some(details.to_string()),
            }
        }
    }
}

pub mod state {
    use crate::models::AurPackage;
    use chrono::{DateTime, Utc};
    use std::collections::HashMap;

    #[derive(Clone, Debug)]
    pub struct AppState {
        pub aur_index: Vec<AurPackage>,
        pub aur_map: HashMap<String, usize>,
        pub cached_packages: Vec<String>,
        pub active_processes: HashMap<String, crate::models::ProcessInfo>,
        pub last_cache_update: DateTime<Utc>,
        pub is_indexing: bool,
        pub last_index_time: DateTime<Utc>,
    }

    impl AppState {
        pub fn new() -> Self {
            let mut state = AppState {
                aur_index: vec![],
                aur_map: HashMap::new(),
                cached_packages: vec![],
                active_processes: HashMap::new(),
                last_cache_update: Utc::now(),
                is_indexing: false,
                last_index_time: Utc::now(),
            };

            state.load_seed_packages();
            state
        }

        fn load_seed_packages(&mut self) {
            let seeds = vec![
                AurPackage {
                    name: "visual-studio-code-bin".to_string(),
                    version: "1.90.0-1".to_string(),
                    description:
                        "Visual Studio Code binary release with built-in telemetry disabled."
                            .to_string(),
                    num_votes: 5210,
                    popularity: 48.2,
                    maintainer: "danyisidori".to_string(),
                    last_modified: Utc::now(),
                    first_submitted: Utc::now(),
                    url: "https://code.visualstudio.com/".to_string(),
                },
                AurPackage {
                    name: "spotify".to_string(),
                    version: "1.2.37.1118-2".to_string(),
                    description: "A proprietary music streaming service desktop client."
                        .to_string(),
                    num_votes: 4801,
                    popularity: 32.5,
                    maintainer: "Nico_0".to_string(),
                    last_modified: Utc::now(),
                    first_submitted: Utc::now(),
                    url: "https://www.spotify.com".to_string(),
                },
            ];

            for pkg in seeds {
                self.aur_map
                    .insert(pkg.name.to_lowercase(), self.aur_index.len());
                self.aur_index.push(pkg);
            }

            self.last_index_time = Utc::now();
        }

        pub fn rebuild_aur_map(&mut self) {
            self.aur_map.clear();
            for (idx, pkg) in self.aur_index.iter().enumerate() {
                self.aur_map.insert(pkg.name.to_lowercase(), idx);
            }
        }
    }

    impl Default for AppState {
        fn default() -> Self {
            Self::new()
        }
    }
}

pub mod aur {
    use crate::models::AurPackage;
    use crate::state::AppState;

    pub struct AurSearch;

    impl AurSearch {
        pub fn search(state: &AppState, query: &str, limit: Option<usize>) -> Vec<AurPackage> {
            let limit = limit.unwrap_or(50);
            let query_lower = query.to_lowercase();

            let mut results: Vec<_> = state
                .aur_index
                .iter()
                .filter(|pkg| Self::matches_package(&pkg, &query_lower))
                .map(|pkg| pkg.clone())
                .collect();

            results.sort_by(|a, b| {
                let a_score = Self::calculate_relevance_score(&a, &query_lower);
                let b_score = Self::calculate_relevance_score(&b, &query_lower);
                b_score
                    .partial_cmp(&a_score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            results.into_iter().take(limit).collect()
        }

        fn matches_package(pkg: &AurPackage, query: &str) -> bool {
            let pkg_name_lower = pkg.name.to_lowercase();
            let pkg_desc_lower = pkg.description.to_lowercase();

            if pkg_name_lower.contains(query) {
                return true;
            }

            if pkg_desc_lower.contains(query) {
                return true;
            }

            for term in query.split_whitespace() {
                if !pkg_name_lower.contains(term) && !pkg_desc_lower.contains(term) {
                    return false;
                }
            }

            true
        }

        fn calculate_relevance_score(pkg: &AurPackage, query: &str) -> f64 {
            let pkg_name_lower = pkg.name.to_lowercase();
            let pkg_desc_lower = pkg.description.to_lowercase();

            let mut score = 0.0;

            if pkg_name_lower == query {
                score += 1000.0;
            }

            if pkg_name_lower.starts_with(query) {
                score += 500.0;
            }

            if pkg_name_lower.contains(query) {
                score += 300.0;
            }

            if pkg_desc_lower.contains(query) {
                score += 100.0;
            }

            score += pkg.popularity * 10.0;
            score += (pkg.num_votes as f64) * 0.1;

            score
        }

        pub fn get_package(state: &AppState, name: &str) -> Option<AurPackage> {
            let name_lower = name.to_lowercase();
            state
                .aur_map
                .get(&name_lower)
                .and_then(|&idx| state.aur_index.get(idx))
                .cloned()
        }

        pub fn get_suggestions(state: &AppState, partial_name: &str) -> Vec<String> {
            let partial_lower = partial_name.to_lowercase();
            state
                .aur_index
                .iter()
                .filter(|pkg| pkg.name.to_lowercase().starts_with(&partial_lower))
                .take(10)
                .map(|pkg| pkg.name.clone())
                .collect()
        }
    }
}

pub mod health {
    use crate::models::SystemHealthResponse;
    use chrono::Utc;
    use std::fs;

    pub struct SystemHealth;

    impl SystemHealth {
        pub fn collect() -> SystemHealthResponse {
            let cpu_usage = Self::get_cpu_usage();
            let (mem_used, mem_total) = Self::get_memory_info();
            let memory_available_mb = if mem_total > mem_used {
                mem_total - mem_used
            } else {
                0
            };

            let running_processes = Self::count_processes();

            SystemHealthResponse {
                cpu_usage,
                memory_usage: if mem_total > 0 {
                    (mem_used as f64 / mem_total as f64) * 100.0
                } else {
                    0.0
                },
                memory_total_mb: mem_total,
                memory_available_mb,
                running_processes,
                timestamp: Utc::now(),
            }
        }

        fn get_cpu_usage() -> f64 {
            match fs::read_to_string("/proc/stat") {
                Ok(content) => {
                    let lines: Vec<&str> = content.lines().collect();
                    if let Some(first_line) = lines.first() {
                        let parts: Vec<&str> = first_line.split_whitespace().collect();
                        if parts.len() >= 5 {
                            let user: u64 = parts[1].parse().unwrap_or(0);
                            let nice: u64 = parts[2].parse().unwrap_or(0);
                            let system: u64 = parts[3].parse().unwrap_or(0);
                            let idle: u64 = parts[4].parse().unwrap_or(1);

                            let total = user + nice + system + idle;
                            if total > 0 {
                                ((total - idle) as f64 / total as f64) * 100.0
                            } else {
                                0.0
                            }
                        } else {
                            0.0
                        }
                    } else {
                        0.0
                    }
                }
                Err(_) => 0.0,
            }
        }

        fn get_memory_info() -> (u64, u64) {
            match fs::read_to_string("/proc/meminfo") {
                Ok(content) => {
                    let mut mem_total = 0u64;
                    let mut mem_available = 0u64;

                    for line in content.lines() {
                        if line.starts_with("MemTotal:") {
                            mem_total = Self::parse_meminfo_line(line);
                        } else if line.starts_with("MemAvailable:") {
                            mem_available = Self::parse_meminfo_line(line);
                        }
                    }

                    let mem_used = if mem_total > mem_available {
                        mem_total - mem_available
                    } else {
                        0
                    };

                    (mem_used, mem_total)
                }
                Err(_) => (0, 0),
            }
        }

        fn parse_meminfo_line(line: &str) -> u64 {
            line.split_whitespace()
                .nth(1)
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0)
        }

        fn count_processes() -> usize {
            match fs::read_dir("/proc") {
                Ok(entries) => entries
                    .filter_map(|entry| entry.ok())
                    .filter(|entry| entry.file_name().to_string_lossy().parse::<u32>().is_ok())
                    .count(),
                Err(_) => 0,
            }
        }
    }
}

// Shared application state for Tauri commands
use crate::state::AppState;
use once_cell::sync::Lazy;
use parking_lot::RwLock;

pub static STATE: Lazy<RwLock<AppState>> = Lazy::new(|| RwLock::new(AppState::new()));

// Tauri-exposed commands
#[derive(serde::Serialize)]
pub struct SudoResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPackage {
    pub name: String,
    pub version: String,
    pub repo: String,
    pub description: String,
    pub installed_at: String,
    pub size: String,
    pub health: String,
    pub health_details: Option<String>,
    pub maintainer: Option<String>,
    pub license: Option<String>,
    pub url: Option<String>,
    pub has_update: Option<bool>,
    pub new_version: Option<String>,
    pub pinned_version: Option<String>,
    pub history: Option<Vec<String>>,
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupExecuteRequest {
    pub remove_orphans: bool,
    pub clear_system_cache: bool,
    pub clear_aur_cache: bool,
    pub selected_orphans: Option<Vec<String>>,
    pub selected_aur_caches: Option<Vec<String>>,
    pub password: Option<String>,
}

fn command_output(program: &str, args: &[&str]) -> Result<String, String> {
    let output = std::process::Command::new(program)
        .args(args)
        .output()
        .map_err(|e| format!("failed to run {}: {}", program, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn is_real_arch() -> bool {
    std::path::Path::new("/usr/bin/pacman").exists() || std::path::Path::new("/bin/pacman").exists()
}

fn safe_package_name(name: &str) -> bool {
    if name.is_empty() || name.len() > 128 {
        return false;
    }
    name.chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '@' | '+' | '_' | '.' | '-'))
}

fn parse_pacman_qi(
    stdout: &str,
    foreign: &std::collections::HashSet<String>,
) -> Vec<InstalledPackage> {
    let mut packages = Vec::new();

    for block in stdout.split("\n\n") {
        let mut name = String::new();
        let mut version = String::new();
        let mut description = String::new();
        let mut installed_at = chrono::Utc::now().to_rfc3339();
        let mut size = String::from("Unknown");
        let mut url = None;
        let mut license = None;

        for line in block.lines() {
            let Some((raw_key, raw_value)) = line.split_once(':') else {
                continue;
            };
            let key = raw_key.trim();
            let value = raw_value.trim();

            match key {
                "Name" => name = value.to_string(),
                "Version" => version = value.to_string(),
                "Description" => description = value.to_string(),
                "Install Date" => installed_at = value.to_string(),
                "Installed Size" => size = value.to_string(),
                "URL" if !value.is_empty() && value != "None" => url = Some(value.to_string()),
                "Licenses" if !value.is_empty() && value != "None" => {
                    license = Some(value.to_string())
                }
                _ => {}
            }
        }

        if !name.is_empty() {
            let repo = if foreign.contains(&name) {
                "aur"
            } else {
                "core"
            }
            .to_string();
            packages.push(InstalledPackage {
                name,
                version,
                repo,
                description,
                installed_at,
                size,
                health: "healthy".to_string(),
                health_details: None,
                maintainer: None,
                license,
                url,
                has_update: Some(false),
                new_version: None,
                pinned_version: None,
                history: Some(Vec::new()),
            });
        }
    }

    packages
}

fn fallback_packages() -> Vec<InstalledPackage> {
    vec![InstalledPackage {
        name: "pacman".to_string(),
        version: "local".to_string(),
        repo: "core".to_string(),
        description: "Arch Linux package manager".to_string(),
        installed_at: chrono::Utc::now().to_rfc3339(),
        size: "Unknown".to_string(),
        health: "healthy".to_string(),
        health_details: None,
        maintainer: None,
        license: Some("GPL".to_string()),
        url: Some("https://archlinux.org/pacman/".to_string()),
        has_update: Some(false),
        new_version: None,
        pinned_version: None,
        history: Some(Vec::new()),
    }]
}

#[tauri::command]
fn search(
    query: String,
    limit: Option<usize>,
) -> Result<crate::models::SearchResponse, String> {
    let guard = STATE.read();
    let results = crate::aur::AurSearch::search(&guard, &query, limit);
    let total = results.len();
    Ok(crate::models::SearchResponse {
        results,
        total,
    })
}

#[tauri::command]
fn get_package(name: String) -> Result<Option<crate::models::AurPackage>, String> {
    let guard = STATE.read();
    Ok(crate::aur::AurSearch::get_package(&guard, &name))
}

#[tauri::command]
fn simulate_build(name: String) -> Result<crate::models::BuildSimulatorResponse, String> {
    let mut guard = STATE.write();
    let package = match crate::aur::AurSearch::get_package(&guard, &name) {
        Some(pkg) => pkg,
        None => return Err("Package not found".to_string()),
    };

    let steps = vec![
        crate::models::BuildStep {
            step: "Resolving dependencies".to_string(),
            status: "completed".to_string(),
            message: format!("Found 3 runtime dependencies for {}", package.name),
            timestamp: chrono::Utc::now(),
        },
        crate::models::BuildStep {
            step: "Downloading sources".to_string(),
            status: "completed".to_string(),
            message: "Downloaded 1.2 MB from upstream".to_string(),
            timestamp: chrono::Utc::now(),
        },
        crate::models::BuildStep {
            step: "Verifying checksums".to_string(),
            status: "completed".to_string(),
            message: "SHA256 verification: OK".to_string(),
            timestamp: chrono::Utc::now(),
        },
        crate::models::BuildStep {
            step: "Compiling".to_string(),
            status: "completed".to_string(),
            message: "Build completed successfully".to_string(),
            timestamp: chrono::Utc::now(),
        },
    ];

    let duration_ms = 0u64;

    guard.active_processes.insert(
        uuid::Uuid::new_v4().to_string(),
        crate::models::ProcessInfo {
            id: uuid::Uuid::new_v4().to_string(),
            package_name: name.clone(),
            status: "completed".to_string(),
            started_at: chrono::Utc::now(),
        },
    );

    Ok(crate::models::BuildSimulatorResponse {
        package_name: name,
        steps,
        success: true,
        duration_ms,
    })
}

#[tauri::command]
fn system_health() -> Result<crate::models::SystemHealthResponse, String> {
    Ok(crate::health::SystemHealth::collect())
}

#[tauri::command]
fn installed_packages() -> Result<Vec<InstalledPackage>, String> {
    if !is_real_arch() {
        return Ok(fallback_packages());
    }

    let foreign_stdout = command_output("pacman", &["-Qmq"]).unwrap_or_default();
    let foreign = foreign_stdout
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect::<std::collections::HashSet<_>>();

    match command_output("pacman", &["-Qi"]) {
        Ok(stdout) => Ok(parse_pacman_qi(&stdout, &foreign)),
        Err(err) => Err(format!("failed to query installed packages: {}", err)),
    }
}

#[tauri::command]
fn system_stats() -> Result<serde_json::Value, String> {
    let packages = installed_packages().unwrap_or_else(|_| fallback_packages());
    let health = crate::health::SystemHealth::collect();
    let disk = command_output("df", &["-h", "/"]).unwrap_or_default();
    let mut disk_total = "Unknown".to_string();
    let mut disk_used = "Unknown".to_string();
    let mut disk_percent = 0;

    if let Some(line) = disk.lines().nth(1) {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() >= 5 {
            disk_total = cols[1].to_string();
            disk_used = cols[2].to_string();
            disk_percent = cols[4].trim_end_matches('%').parse::<i32>().unwrap_or(0);
        }
    }

    let missing_tools = ["git", "fakeroot", "makepkg", "pacman"]
        .iter()
        .filter(|tool| command_output("which", &[tool]).is_err())
        .map(|tool| tool.to_string())
        .collect::<Vec<_>>();

    let aur_count = packages.iter().filter(|pkg| pkg.repo == "aur").count();
    let core_count = packages
        .iter()
        .filter(|pkg| pkg.repo == "core" || pkg.repo == "extra")
        .count();
    let extra_count = packages.iter().filter(|pkg| pkg.repo == "extra").count();
    let healthy_count = packages
        .iter()
        .filter(|pkg| pkg.health == "healthy")
        .count();
    let warning_count = packages
        .iter()
        .filter(|pkg| pkg.health == "warning")
        .count();
    let error_count = packages.iter().filter(|pkg| pkg.health == "error").count();

    Ok(serde_json::json!({
        "isRealArch": is_real_arch(),
        "totals": {
            "all": packages.len(),
            "aur": aur_count,
            "core": core_count,
            "extra": extra_count,
            "upgrades": packages.iter().filter(|pkg| pkg.has_update.unwrap_or(false)).count()
        },
        "health": {
            "healthy": healthy_count,
            "warning": warning_count,
            "error": error_count
        },
        "diskSpace": {
            "used": disk_used,
            "total": disk_total,
            "percent": disk_percent
        },
        "cpuUsage": format!("{:.0}%", health.cpu_usage),
        "memoryUsage": format!(
            "{:.1} GB / {:.1} GB",
            (health.memory_total_mb.saturating_sub(health.memory_available_mb)) as f64 / 1024.0,
            health.memory_total_mb as f64 / 1024.0
        ),
        "missingTools": missing_tools
    }))
}

#[tauri::command]
fn cleanup_scan() -> Result<serde_json::Value, String> {
    let orphans_stdout = command_output("pacman", &["-Qdtq"]).unwrap_or_default();
    let orphans = orphans_stdout
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty() && safe_package_name(line))
        .collect::<Vec<_>>();

    let system_cache_size = command_output("du", &["-sh", "/var/cache/pacman/pkg"])
        .ok()
        .and_then(|out| out.split_whitespace().next().map(|s| s.to_string()))
        .unwrap_or_else(|| "0 B".to_string());

    let home = std::env::var("HOME").unwrap_or_default();
    let aur_cache = format!("{}/.cache/yay", home);
    let aur_cache_size = command_output("du", &["-sh", &aur_cache])
        .ok()
        .and_then(|out| out.split_whitespace().next().map(|s| s.to_string()))
        .unwrap_or_else(|| "0 B".to_string());

    let aur_cache_files = std::fs::read_dir(&aur_cache)
        .map(|entries| {
            entries
                .filter_map(|entry| entry.ok())
                .filter_map(|entry| entry.file_name().into_string().ok())
                .filter(|name| safe_package_name(name))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let orphans_size = if orphans.is_empty() {
        "0 B".to_string()
    } else {
        format!("{} MB", orphans.len() * 45)
    };

    Ok(serde_json::json!({
        "orphans": orphans,
        "orphansSize": orphans_size,
        "systemCacheSize": system_cache_size,
        "aurCacheSize": aur_cache_size,
        "aurCacheFiles": aur_cache_files
    }))
}

#[tauri::command]
fn cleanup_execute(req: CleanupExecuteRequest) -> Result<serde_json::Value, String> {
    let mut logs = Vec::new();

    if req.remove_orphans {
        let scan = cleanup_scan()?;
        let all_orphans = scan
            .get("orphans")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str())
                    .map(|item| item.to_string())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let selected = req.selected_orphans.unwrap_or_else(|| all_orphans.clone());
        let targets = all_orphans
            .into_iter()
            .filter(|name| selected.contains(name) && safe_package_name(name))
            .collect::<Vec<_>>();

        if targets.is_empty() {
            logs.push("==> No orphaned packages selected.".to_string());
        } else {
            logs.push(format!("==> Removing orphans: {}", targets.join(" ")));
            let mut command = vec![
                "pacman".to_string(),
                "-Rns".to_string(),
                "--noconfirm".to_string(),
            ];
            command.extend(targets);
            let result = run_sudo_command(command, req.password.clone())?;
            if result.code == 0 {
                logs.push("Orphans removed successfully.".to_string());
            } else {
                logs.push(format!("Failed to remove orphans: {}", result.stderr));
            }
        }
    }

    if req.clear_system_cache {
        logs.push("==> Clearing system pacman cache...".to_string());
        let command = vec![
            "pacman".to_string(),
            "-Scc".to_string(),
            "--noconfirm".to_string(),
        ];
        let result = run_sudo_command(command, req.password.clone())?;
        if result.code == 0 {
            logs.push("System cache cleared.".to_string());
        } else {
            logs.push(format!("Failed to clear system cache: {}", result.stderr));
        }
    }

    if req.clear_aur_cache {
        let home = std::env::var("HOME").unwrap_or_default();
        let selected = req.selected_aur_caches.unwrap_or_default();
        let cache_root = std::path::PathBuf::from(home).join(".cache/yay");

        if selected.is_empty() {
            logs.push("==> No AUR cache directories selected.".to_string());
        } else {
            for cache_name in selected.iter().filter(|name| safe_package_name(name)) {
                let path = cache_root.join(cache_name);
                logs.push(format!("==> Clearing AUR cache for {}...", cache_name));
                if let Err(err) = std::fs::remove_dir_all(&path) {
                    logs.push(format!("Failed to clear {}: {}", cache_name, err));
                }
            }
            logs.push("AUR cache cleanup finished.".to_string());
        }
    }

    Ok(serde_json::json!({ "success": true, "logs": logs }))
}

#[tauri::command]
fn run_sudo_command(
    command: Vec<String>,
    password: Option<String>,
) -> Result<SudoResult, String> {
    if command.is_empty() {
        return Err("empty command".to_string());
    }

    let mut cmd = std::process::Command::new(&command[0]);
    if command.len() > 1 {
        cmd.args(&command[1..]);
    }

    // If password is provided, try to run with sudo -S
    let output = if let Some(pw) = password {
        let mut sudo_cmd = std::process::Command::new("sudo");
        sudo_cmd.arg("-S");
        sudo_cmd.arg("-p").arg("");
        sudo_cmd.arg(&command[0]);
        if command.len() > 1 {
            sudo_cmd.args(&command[1..]);
        }
        sudo_cmd
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let mut child = sudo_cmd
            .spawn()
            .map_err(|e| format!("failed to spawn sudo: {}", e))?;
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            let _ = stdin.write_all(format!("{}\n", pw).as_bytes());
        }
        child
            .wait_with_output()
            .map_err(|e| format!("failed to wait sudo: {}", e))?
    } else {
        cmd.output()
            .map_err(|e| format!("failed to spawn: {}", e))?
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let code = output.status.code().unwrap_or(-1);

    Ok(SudoResult {
        stdout,
        stderr,
        code,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            search,
            get_package,
            simulate_build,
            system_health,
            system_stats,
            installed_packages,
            cleanup_scan,
            cleanup_execute,
            run_sudo_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
