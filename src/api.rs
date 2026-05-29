use actix_web::{web, HttpResponse, Responder};
use parking_lot::RwLock;
use std::sync::Arc;
use crate::models::*;
use crate::state::AppState;
use crate::aur::AurSearch;
use crate::health::SystemHealth;
use chrono::Utc;
use uuid::Uuid;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .route("/health", web::get().to(health_check))
            .route("/search", web::post().to(search_packages))
            .route("/package/{name}", web::get().to(get_package_detail))
            .route("/build", web::post().to(simulate_build))
            .route("/system-health", web::get().to(get_system_health))
            .route("/install", web::post().to(install_package))
            .route("/upgrade", web::post().to(upgrade_package))
            .route("/remove", web::post().to(remove_package))
            .route("/suggestions", web::get().to(get_suggestions))
    );
}

async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": Utc::now(),
    }))
}

async fn search_packages(
    state: web::Data<Arc<RwLock<AppState>>>,
    req: web::Json<SearchRequest>,
) -> impl Responder {
    let state_guard = state.read();
    let results = AurSearch::search(&state_guard, &req.query, req.limit);
    let total = results.len();

    HttpResponse::Ok().json(SearchResponse { results, total })
}

async fn get_package_detail(
    state: web::Data<Arc<RwLock<AppState>>>,
    path: web::Path<String>,
) -> impl Responder {
    let package_name = path.into_inner();
    let state_guard = state.read();

    match AurSearch::get_package(&state_guard, &package_name) {
        Some(package) => {
            let dependencies = extract_dependencies(&package.description);
            HttpResponse::Ok().json(PackageDetailResponse {
                package: Some(package),
                dependencies: dependencies.clone(),
                make_dependencies: vec!["gcc".to_string(), "make".to_string()],
            })
        }
        None => HttpResponse::NotFound().json(ErrorResponse::new("Package not found")),
    }
}

async fn simulate_build(
    state: web::Data<Arc<RwLock<AppState>>>,
    req: web::Json<BuildSimulatorRequest>,
) -> impl Responder {
    let mut state_guard = state.write();
    
    let package = match AurSearch::get_package(&state_guard, &req.package_name) {
        Some(pkg) => pkg,
        None => {
            return HttpResponse::NotFound()
                .json(ErrorResponse::new("Package not found"));
        }
    };

    let process_id = Uuid::new_v4().to_string();
    let start_time = Utc::now();

    let steps = vec![
        BuildStep {
            step: "Resolving dependencies".to_string(),
            status: "completed".to_string(),
            message: format!("Found 3 runtime dependencies for {}", package.name),
            timestamp: Utc::now(),
        },
        BuildStep {
            step: "Downloading sources".to_string(),
            status: "completed".to_string(),
            message: "Downloaded 1.2 MB from upstream".to_string(),
            timestamp: Utc::now(),
        },
        BuildStep {
            step: "Verifying checksums".to_string(),
            status: "completed".to_string(),
            message: "SHA256 verification: OK".to_string(),
            timestamp: Utc::now(),
        },
        BuildStep {
            step: "Compiling".to_string(),
            status: "completed".to_string(),
            message: "Build completed successfully".to_string(),
            timestamp: Utc::now(),
        },
        BuildStep {
            step: "Creating package".to_string(),
            status: "completed".to_string(),
            message: format!("{}-1.tar.zst", package.name),
            timestamp: Utc::now(),
        },
    ];

    let duration_ms = (Utc::now() - start_time).num_milliseconds() as u64;

    // Record active process
    state_guard.active_processes.insert(
        process_id.clone(),
        crate::models::ProcessInfo {
            id: process_id,
            package_name: req.package_name.clone(),
            status: "completed".to_string(),
            started_at: Utc::now(),
        },
    );

    HttpResponse::Ok().json(BuildSimulatorResponse {
        package_name: req.package_name.clone(),
        steps,
        success: true,
        duration_ms,
    })
}

async fn get_system_health() -> impl Responder {
    let health = SystemHealth::collect();
    HttpResponse::Ok().json(health)
}

async fn install_package(
    state: web::Data<Arc<RwLock<AppState>>>,
    req: web::Json<PackageOperationRequest>,
) -> impl Responder {
    let state_guard = state.read();
    
    if AurSearch::get_package(&state_guard, &req.package_name).is_some() {
        HttpResponse::Ok().json(PackageOperationResponse {
            success: true,
            message: format!("Successfully installed {}", req.package_name),
            package_name: req.package_name.clone(),
        })
    } else {
        HttpResponse::NotFound().json(ErrorResponse::new("Package not found"))
    }
}

async fn upgrade_package(
    state: web::Data<Arc<RwLock<AppState>>>,
    req: web::Json<PackageOperationRequest>,
) -> impl Responder {
    let state_guard = state.read();
    
    if AurSearch::get_package(&state_guard, &req.package_name).is_some() {
        HttpResponse::Ok().json(PackageOperationResponse {
            success: true,
            message: format!("Successfully upgraded {}", req.package_name),
            package_name: req.package_name.clone(),
        })
    } else {
        HttpResponse::NotFound().json(ErrorResponse::new("Package not found"))
    }
}

async fn remove_package(
    state: web::Data<Arc<RwLock<AppState>>>,
    req: web::Json<PackageOperationRequest>,
) -> impl Responder {
    let state_guard = state.read();
    
    if AurSearch::get_package(&state_guard, &req.package_name).is_some() {
        HttpResponse::Ok().json(PackageOperationResponse {
            success: true,
            message: format!("Successfully removed {}", req.package_name),
            package_name: req.package_name.clone(),
        })
    } else {
        HttpResponse::NotFound().json(ErrorResponse::new("Package not found"))
    }
}

async fn get_suggestions(
    state: web::Data<Arc<RwLock<AppState>>>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let partial_name = query
        .get("q")
        .map(|s| s.as_str())
        .unwrap_or("");

    let state_guard = state.read();
    let suggestions = AurSearch::get_suggestions(&state_guard, partial_name);

    HttpResponse::Ok().json(serde_json::json!({
        "suggestions": suggestions,
    }))
}

fn extract_dependencies(description: &str) -> Vec<String> {
    // Simple heuristic: look for common dependency patterns
    let mut deps = vec![];
    
    let keywords = ["python", "node", "rust", "gcc", "make", "cmake", "qt5", "gtk", "libc"];
    for keyword in &keywords {
        if description.to_lowercase().contains(keyword) {
            deps.push(keyword.to_string());
        }
    }
    
    deps
}
