use crate::models::{AurPackage, InstalledPackage, ProcessInfo};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Clone, Debug)]
pub struct AppState {
    pub aur_index: Vec<AurPackage>,
    pub aur_map: HashMap<String, usize>,
    pub installed_packages: Vec<InstalledPackage>,
    pub cached_packages: Vec<String>,
    pub active_processes: HashMap<String, ProcessInfo>,
    pub last_cache_update: DateTime<Utc>,
    pub is_indexing: bool,
    pub last_index_time: DateTime<Utc>,
    pub cache_path: PathBuf,
    pub simulated_orphans: Vec<String>,
    pub simulated_system_cache_size: String,
    pub simulated_aur_cache_files: Vec<String>,
}

impl AppState {
    pub fn new() -> Self {
        let cache_path = std::env::var_os("ARCHWEAVER_AUR_CACHE")
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                std::env::var_os("XDG_CACHE_HOME")
                    .map(PathBuf::from)
                    .or_else(|| {
                        std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".cache"))
                    })
                    .unwrap_or_else(std::env::temp_dir)
                    .join("archweaver")
                    .join("aur_index_cache.json")
            });
        Self::with_cache_path(cache_path)
    }

    pub fn with_cache_path(cache_path: PathBuf) -> Self {
        let mut state = AppState {
            aur_index: Vec::new(),
            aur_map: HashMap::new(),
            installed_packages: fallback_installed_packages(),
            cached_packages: Vec::new(),
            active_processes: HashMap::new(),
            last_cache_update: Utc::now(),
            is_indexing: false,
            last_index_time: Utc::now(),
            cache_path,
            simulated_orphans: vec![
                "lib32-gcc-libs".to_string(),
                "python-setuptools".to_string(),
                "rust-musl".to_string(),
            ],
            simulated_system_cache_size: "2.4 GB".to_string(),
            simulated_aur_cache_files: vec![
                "google-chrome".to_string(),
                "visual-studio-code-bin".to_string(),
                "spotify".to_string(),
            ],
        };

        if !state.load_cached_index() {
            state.load_seed_packages();
            let _ = state.persist_aur_index();
        }

        state
    }

    pub fn rebuild_aur_map(&mut self) {
        self.aur_map.clear();
        for (idx, pkg) in self.aur_index.iter().enumerate() {
            self.aur_map.insert(pkg.name.to_lowercase(), idx);
        }
    }

    pub fn upsert_aur_packages(&mut self, packages: Vec<AurPackage>) {
        for pkg in packages {
            let key = pkg.name.to_lowercase();
            if let Some(&idx) = self.aur_map.get(&key) {
                self.aur_index[idx] = pkg;
            } else {
                self.aur_map.insert(key, self.aur_index.len());
                self.aur_index.push(pkg);
            }
        }

        if self.aur_index.len() > 15_000 {
            self.aur_index.truncate(15_000);
            self.rebuild_aur_map();
        }

        self.last_index_time = Utc::now();
        let _ = self.persist_aur_index();
    }

    pub fn persist_aur_index(&self) -> Result<(), String> {
        if let Some(parent) = self.cache_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(&self.aur_index).map_err(|e| e.to_string())?;
        std::fs::write(&self.cache_path, json).map_err(|e| e.to_string())
    }

    fn load_cached_index(&mut self) -> bool {
        let Ok(content) = std::fs::read_to_string(&self.cache_path) else {
            return false;
        };
        let Ok(packages) = serde_json::from_str::<Vec<AurPackage>>(&content) else {
            return false;
        };
        if packages.is_empty() {
            return false;
        }
        self.aur_index = packages;
        self.rebuild_aur_map();
        self.last_index_time = Utc::now();
        true
    }

    fn load_seed_packages(&mut self) {
        self.aur_index = seed_packages();
        self.rebuild_aur_map();
        self.last_index_time = Utc::now();
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

fn seed_packages() -> Vec<AurPackage> {
    let now = Utc::now();
    vec![
        AurPackage {
            name: "visual-studio-code-bin".to_string(),
            version: "1.90.0-1".to_string(),
            description: "Visual Studio Code binary release with built-in telemetry disabled.".to_string(),
            num_votes: 5210,
            popularity: 48.2,
            maintainer: "danyisidori".to_string(),
            last_modified: now,
            first_submitted: now,
            url: "https://code.visualstudio.com/".to_string(),
        },
        AurPackage {
            name: "spotify".to_string(),
            version: "1.2.37.1118-2".to_string(),
            description: "A proprietary music streaming service desktop client.".to_string(),
            num_votes: 4801,
            popularity: 32.5,
            maintainer: "Nico_0".to_string(),
            last_modified: now,
            first_submitted: now,
            url: "https://www.spotify.com".to_string(),
        },
        AurPackage {
            name: "google-chrome".to_string(),
            version: "125.0.6422.141-1".to_string(),
            description: "An ultra-secure, fast, and feature-rich browser designed by Google.".to_string(),
            num_votes: 3205,
            popularity: 25.1,
            maintainer: "allan".to_string(),
            last_modified: now,
            first_submitted: now,
            url: "https://www.google.com/chrome/".to_string(),
        },
        AurPackage {
            name: "slack-desktop".to_string(),
            version: "4.38.125-1".to_string(),
            description: "Slack Desktop client for Linux.".to_string(),
            num_votes: 985,
            popularity: 15.6,
            maintainer: "freswa".to_string(),
            last_modified: now,
            first_submitted: now,
            url: "https://slack.com/".to_string(),
        },
        AurPackage {
            name: "zoom".to_string(),
            version: "6.0.12503-1".to_string(),
            description: "Video conferencing client built for modern collaboration.".to_string(),
            num_votes: 645,
            popularity: 8.4,
            maintainer: "arch_user".to_string(),
            last_modified: now,
            first_submitted: now,
            url: "https://zoom.us".to_string(),
        },
        AurPackage {
            name: "brave-bin".to_string(),
            version: "1.66.118-1".to_string(),
            description: "Brave browser binary release focusing on privacy and speed.".to_string(),
            num_votes: 1420,
            popularity: 18.2,
            maintainer: "privacy_dev".to_string(),
            last_modified: now,
            first_submitted: now,
            url: "https://brave.com".to_string(),
        },
    ]
}

fn fallback_installed_packages() -> Vec<InstalledPackage> {
    vec![
        InstalledPackage {
            name: "pacman".to_string(),
            version: "local".to_string(),
            repo: "core".to_string(),
            description: "Arch Linux package manager".to_string(),
            installed_at: Utc::now().to_rfc3339(),
            size: "Unknown".to_string(),
            health: "healthy".to_string(),
            health_details: None,
            maintainer: Some("Arch Linux".to_string()),
            license: Some("GPL".to_string()),
            url: Some("https://archlinux.org/pacman/".to_string()),
            has_update: Some(false),
            new_version: None,
            pinned_version: None,
            history: Some(Vec::new()),
        },
        InstalledPackage {
            name: "spotify".to_string(),
            version: "1.2.37.1118-2".to_string(),
            repo: "aur".to_string(),
            description: "A proprietary music streaming service desktop client.".to_string(),
            installed_at: Utc::now().to_rfc3339(),
            size: "45.0 MB".to_string(),
            health: "healthy".to_string(),
            health_details: None,
            maintainer: Some("Nico_0".to_string()),
            license: Some("custom:spotify".to_string()),
            url: Some("https://www.spotify.com".to_string()),
            has_update: Some(false),
            new_version: None,
            pinned_version: None,
            history: Some(vec!["1.2.37.1118-2".to_string()]),
        },
    ]
}
