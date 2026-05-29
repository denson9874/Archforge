use crate::models::AurPackage;
use crate::state::AppState;
use regex::Regex;

const SEARCH_KEYWORDS: &[&str] = &[
    "lib", "bin", "git", "cli", "python", "node", "desktop", "driver", 
    "theme", "editor", "tool", "nvidia", "kernel", "font", "audio", 
    "video", "docker", "rust", "go", "game", "plasma", "gnome", "amd",
    "intel", "wayland", "x11", "window", "manager", "terminal", "shell",
];

pub struct AurSearch;

impl AurSearch {
    pub fn search(state: &AppState, query: &str, limit: Option<usize>) -> Vec<AurPackage> {
        let limit = limit.unwrap_or(50);
        let query_lower = query.to_lowercase();

        let mut results: Vec<_> = state
            .aur_index
            .iter()
            .filter(|pkg| {
                Self::matches_package(&pkg, &query_lower)
            })
            .map(|pkg| pkg.clone())
            .collect();

        results.sort_by(|a, b| {
            let a_score = Self::calculate_relevance_score(&a, &query_lower);
            let b_score = Self::calculate_relevance_score(&b, &query_lower);
            b_score.partial_cmp(&a_score).unwrap_or(std::cmp::Ordering::Equal)
        });

        results.into_iter().take(limit).collect()
    }

    fn matches_package(pkg: &AurPackage, query: &str) -> bool {
        let pkg_name_lower = pkg.name.to_lowercase();
        let pkg_desc_lower = pkg.description.to_lowercase();

        // Exact name match
        if pkg_name_lower.contains(query) {
            return true;
        }

        // Description contains query
        if pkg_desc_lower.contains(query) {
            return true;
        }

        // Split query into terms and check if any match
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

        // Exact name match (highest priority)
        if pkg_name_lower == query {
            score += 1000.0;
        }

        // Name starts with query
        if pkg_name_lower.starts_with(query) {
            score += 500.0;
        }

        // Name contains query as word boundary
        if pkg_name_lower.contains(query) {
            score += 300.0;
        }

        // Description contains query
        if pkg_desc_lower.contains(query) {
            score += 100.0;
        }

        // Boost by popularity
        score += pkg.popularity * 10.0;

        // Boost by votes
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
