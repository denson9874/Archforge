use crate::models::{AurPackage, AurPackageWire, AurRpcPackage, AurRpcResponse};
use crate::state::AppState;

const SEARCH_KEYWORDS: &[&str] = &[
    "browser", "editor", "terminal", "desktop", "audio", "video", "docker", "rust", "python",
    "node", "gtk", "qt", "nvidia", "wayland", "font", "theme",
];

pub struct AurSearch;

impl AurSearch {
    pub fn search(state: &AppState, query: &str, limit: Option<usize>) -> Vec<AurPackage> {
        let limit = limit.unwrap_or(50);
        let query_lower = query.to_lowercase();

        let mut results: Vec<_> = if query_lower.trim().is_empty() {
            state.aur_index.clone()
        } else {
            state
                .aur_index
                .iter()
                .filter(|pkg| Self::matches_package(pkg, &query_lower))
                .cloned()
                .collect()
        };

        results.sort_by(|a, b| {
            let a_score = Self::calculate_relevance_score(a, &query_lower);
            let b_score = Self::calculate_relevance_score(b, &query_lower);
            b_score
                .partial_cmp(&a_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        results.into_iter().take(limit).collect()
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

    pub async fn live_search(query: &str) -> Result<Vec<AurRpcPackage>, String> {
        let query = query.trim();
        if query.is_empty() {
            return Ok(Vec::new());
        }

        let url = format!(
            "https://aur.archlinux.org/rpc/v5/search?arg={}&by=name-desc",
            url_encode(query)
        );
        let response = reqwest::Client::new()
            .get(url)
            .header("User-Agent", "ArchWeaver/1.0")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("AUR returned status {}", response.status()));
        }

        let payload = response
            .json::<AurRpcResponse>()
            .await
            .map_err(|e| e.to_string())?;
        Ok(payload.results)
    }

    pub async fn live_info(name: &str) -> Result<Option<AurRpcPackage>, String> {
        let url = format!(
            "https://aur.archlinux.org/rpc/v5/info?arg[]={}",
            url_encode(name)
        );
        let response = reqwest::Client::new()
            .get(url)
            .header("User-Agent", "ArchWeaver/1.0")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("AUR returned status {}", response.status()));
        }

        let payload = response
            .json::<AurRpcResponse>()
            .await
            .map_err(|e| e.to_string())?;
        Ok(payload.results.into_iter().next())
    }

    pub async fn fetch_pkgbuild(name: &str) -> Result<String, String> {
        let url = format!(
            "https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h={}",
            url_encode(name)
        );
        let response = reqwest::Client::new()
            .get(url)
            .header("User-Agent", "ArchWeaver/1.0")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("AUR returned status {}", response.status()));
        }

        response.text().await.map_err(|e| e.to_string())
    }

    pub async fn broadened_live_index() -> Vec<AurPackage> {
        use futures::stream::{FuturesUnordered, StreamExt};
        use std::collections::HashSet;

        let mut packages = Vec::new();
        let mut seen = HashSet::new();
        let mut search_tasks = FuturesUnordered::new();

        for keyword in SEARCH_KEYWORDS {
            let keyword = keyword.to_string();
            search_tasks.push(async move { (keyword.clone(), Self::live_search(&keyword).await) });
        }

        while let Some((keyword, result)) = search_tasks.next().await {
            if let Ok(results) = result {
                for package in results.into_iter().map(AurPackage::from) {
                    if seen.insert(package.name.to_lowercase()) {
                        packages.push(package);
                    }
                }
            } else {
                eprintln!("[AurSearch] broadened index search failed for '{}', continuing.", keyword);
            }
        }

        packages.sort_by(|a, b| {
            b.popularity
                .partial_cmp(&a.popularity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        if packages.len() > 30_000 {
            packages.truncate(30_000);
        }

        packages
    }

    pub fn wire_results(packages: &[AurPackage]) -> Vec<AurPackageWire> {
        packages.iter().map(AurPackageWire::from).collect()
    }

    fn matches_package(pkg: &AurPackage, query: &str) -> bool {
        let pkg_name_lower = pkg.name.to_lowercase();
        let pkg_desc_lower = pkg.description.to_lowercase();

        if pkg_name_lower.contains(query) || pkg_desc_lower.contains(query) {
            return true;
        }

        query
            .split_whitespace()
            .all(|term| pkg_name_lower.contains(term) || pkg_desc_lower.contains(term))
    }

    fn calculate_relevance_score(pkg: &AurPackage, query: &str) -> f64 {
        if query.trim().is_empty() {
            return pkg.popularity * 10.0 + (pkg.num_votes as f64) * 0.1;
        }

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
}

fn url_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![b as char]
            }
            _ => format!("%{:02X}", b).chars().collect(),
        })
        .collect()
}
