use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

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
