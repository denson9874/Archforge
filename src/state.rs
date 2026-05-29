use crate::models::{AurPackage, ProcessInfo};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[derive(Clone, Debug)]
pub struct AppState {
    pub aur_index: Vec<AurPackage>,
    pub aur_map: HashMap<String, usize>, // package name (lowercase) -> index
    pub cached_packages: Vec<String>,
    pub active_processes: HashMap<String, ProcessInfo>,
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
                description: "Visual Studio Code binary release with built-in telemetry disabled.".to_string(),
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
                description: "A proprietary music streaming service desktop client.".to_string(),
                num_votes: 4801,
                popularity: 32.5,
                maintainer: "Nico_0".to_string(),
                last_modified: Utc::now(),
                first_submitted: Utc::now(),
                url: "https://www.spotify.com".to_string(),
            },
            AurPackage {
                name: "google-chrome".to_string(),
                version: "125.0.6422.141-1".to_string(),
                description: "An ultra-secure, fast, and feature-rich browser designed by Google.".to_string(),
                num_votes: 3205,
                popularity: 25.1,
                maintainer: "allan".to_string(),
                last_modified: Utc::now(),
                first_submitted: Utc::now(),
                url: "https://www.google.com/chrome/".to_string(),
            },
            AurPackage {
                name: "slack-desktop".to_string(),
                version: "4.38.125-1".to_string(),
                description: "Slack Desktop client for Linux.".to_string(),
                num_votes: 985,
                popularity: 15.6,
                maintainer: "freswa".to_string(),
                last_modified: Utc::now(),
                first_submitted: Utc::now(),
                url: "https://slack.com/".to_string(),
            },
            AurPackage {
                name: "zoom".to_string(),
                version: "6.0.12503-1".to_string(),
                description: "Video conferencing client built for modern collaboration.".to_string(),
                num_votes: 645,
                popularity: 8.4,
                maintainer: "arch_user".to_string(),
                last_modified: Utc::now(),
                first_submitted: Utc::now(),
                url: "https://zoom.us".to_string(),
            },
            AurPackage {
                name: "brave-bin".to_string(),
                version: "1.66.118-1".to_string(),
                description: "Brave browser binary release focusing on privacy and speed.".to_string(),
                num_votes: 1420,
                popularity: 18.2,
                maintainer: "privacy_dev".to_string(),
                last_modified: Utc::now(),
                first_submitted: Utc::now(),
                url: "https://brave.com".to_string(),
            },
        ];

        for pkg in seeds {
            self.aur_map.insert(pkg.name.to_lowercase(), self.aur_index.len());
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
