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
#[serde(rename_all = "PascalCase")]
pub struct AurPackageWire {
    pub name: String,
    pub version: String,
    pub description: String,
    #[serde(default)]
    pub num_votes: i32,
    #[serde(default)]
    pub popularity: f64,
    #[serde(default)]
    pub maintainer: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub first_submitted: i64,
    #[serde(default)]
    pub last_modified: i64,
    #[serde(default)]
    pub out_of_date: Option<i64>,
    #[serde(default)]
    pub depends: Vec<String>,
    #[serde(default)]
    pub make_depends: Vec<String>,
    #[serde(default)]
    pub license: Vec<String>,
}

impl From<&AurPackage> for AurPackageWire {
    fn from(pkg: &AurPackage) -> Self {
        Self {
            name: pkg.name.clone(),
            version: pkg.version.clone(),
            description: pkg.description.clone(),
            num_votes: pkg.num_votes,
            popularity: pkg.popularity,
            maintainer: pkg.maintainer.clone(),
            url: pkg.url.clone(),
            first_submitted: pkg.first_submitted.timestamp(),
            last_modified: pkg.last_modified.timestamp(),
            out_of_date: None,
            depends: Vec::new(),
            make_depends: Vec::new(),
            license: vec!["GPL".to_string()],
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct AurRpcResponse {
    #[serde(default)]
    pub results: Vec<AurRpcPackage>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AurRpcPackage {
    pub name: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub num_votes: i32,
    #[serde(default)]
    pub popularity: f64,
    #[serde(default)]
    pub maintainer: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub first_submitted: Option<i64>,
    #[serde(default)]
    pub last_modified: Option<i64>,
    #[serde(default)]
    pub out_of_date: Option<i64>,
    #[serde(default)]
    pub depends: Vec<String>,
    #[serde(default)]
    pub make_depends: Vec<String>,
    #[serde(default)]
    pub license: Vec<String>,
}

impl From<AurRpcPackage> for AurPackage {
    fn from(pkg: AurRpcPackage) -> Self {
        let now = Utc::now().timestamp();
        Self {
            name: pkg.name.clone(),
            version: empty_fallback(pkg.version, "local"),
            description: pkg.description,
            num_votes: pkg.num_votes,
            popularity: pkg.popularity,
            maintainer: pkg.maintainer.unwrap_or_else(|| "orphan".to_string()),
            last_modified: timestamp_to_utc(pkg.last_modified.unwrap_or(now)),
            first_submitted: timestamp_to_utc(pkg.first_submitted.unwrap_or(now - 31_536_000)),
            url: pkg
                .url
                .unwrap_or_else(|| format!("https://aur.archlinux.org/packages/{}", pkg.name)),
        }
    }
}

impl From<AurRpcPackage> for AurPackageWire {
    fn from(pkg: AurRpcPackage) -> Self {
        Self {
            name: pkg.name.clone(),
            version: empty_fallback(pkg.version, "local"),
            description: pkg.description,
            num_votes: pkg.num_votes,
            popularity: pkg.popularity,
            maintainer: pkg.maintainer.unwrap_or_else(|| "orphan".to_string()),
            url: pkg
                .url
                .unwrap_or_else(|| format!("https://aur.archlinux.org/packages/{}", pkg.name)),
            first_submitted: pkg.first_submitted.unwrap_or_else(|| Utc::now().timestamp() - 31_536_000),
            last_modified: pkg.last_modified.unwrap_or_else(|| Utc::now().timestamp()),
            out_of_date: pkg.out_of_date,
            depends: pkg.depends,
            make_depends: pkg.make_depends,
            license: if pkg.license.is_empty() {
                vec!["GPL".to_string()]
            } else {
                pkg.license
            },
        }
    }
}

fn timestamp_to_utc(timestamp: i64) -> DateTime<Utc> {
    DateTime::from_timestamp(timestamp, 0).unwrap_or_else(Utc::now)
}

fn empty_fallback(value: String, fallback: &str) -> String {
    if value.trim().is_empty() {
        fallback.to_string()
    } else {
        value
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct AurSearchQuery {
    pub q: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SearchResponse<T = AurPackage> {
    pub results: Vec<T>,
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

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageInstallRequest {
    pub name: String,
    pub version: Option<String>,
    pub repo: Option<String>,
    pub description: Option<String>,
    pub size: Option<String>,
    pub maintainer: Option<String>,
    pub license: Option<String>,
    pub url: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageNameRequest {
    pub name: String,
    pub pw: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RollbackRequest {
    pub name: String,
    pub target_version: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupScanResponse {
    pub orphans: Vec<String>,
    pub orphans_size: String,
    pub system_cache_size: String,
    pub aur_cache_size: String,
    pub aur_cache_files: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupExecuteRequest {
    pub remove_orphans: bool,
    pub clear_system_cache: bool,
    pub clear_aur_cache: bool,
    pub selected_orphans: Option<Vec<String>>,
    pub selected_aur_caches: Option<Vec<String>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PackageOperationResponse {
    pub success: bool,
    pub message: String,
    #[serde(rename = "packageName", skip_serializing_if = "Option::is_none")]
    pub package_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub package: Option<InstalledPackage>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub details: Option<String>,
}

impl ErrorResponse {
    pub fn new(error: &str) -> Self {
        Self {
            error: error.to_string(),
            details: None,
        }
    }

    pub fn with_details(error: &str, details: &str) -> Self {
        Self {
            error: error.to_string(),
            details: Some(details.to_string()),
        }
    }
}
