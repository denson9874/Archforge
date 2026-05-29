use actix_web::{test, web, App};
use archweaver_server::{api, state::AppState};
use parking_lot::RwLock;
use serde_json::{json, Value};
use std::sync::Arc;

#[actix_web::test]
async fn health_endpoint_returns_ok() {
    let app_state = Arc::new(RwLock::new(AppState::new()));
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(app_state))
            .configure(api::configure_routes),
    )
    .await;

    let req = test::TestRequest::get().uri("/api/health").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["status"], "healthy");
    assert_eq!(body["service"], "archweaver-rust");
}

#[actix_web::test]
async fn search_endpoint_returns_seeded_package() {
    let app_state = Arc::new(RwLock::new(AppState::new()));
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(app_state))
            .configure(api::configure_routes),
    )
    .await;

    let payload = json!({"query": "spotify", "limit": 5});
    let req = test::TestRequest::post()
        .uri("/api/search")
        .insert_header(("Content-Type", "application/json"))
        .set_payload(payload.to_string())
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body: Value = test::read_body_json(resp).await;
    let results = body["results"].as_array().expect("results array expected");
    assert!(!results.is_empty());
    assert_eq!(results[0]["Name"], "spotify");
}

#[actix_web::test]
async fn aur_info_endpoint_returns_package() {
    let app_state = Arc::new(RwLock::new(AppState::new()));
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(app_state))
            .configure(api::configure_routes),
    )
    .await;

    let req = test::TestRequest::get().uri("/api/aur/info?name=spotify").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["Name"], "spotify");
}

#[actix_web::test]
async fn system_health_endpoint_returns_ok() {
    let app_state = Arc::new(RwLock::new(AppState::new()));
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(app_state))
            .configure(api::configure_routes),
    )
    .await;

    let req = test::TestRequest::get().uri("/api/system-health").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body: Value = test::read_body_json(resp).await;
    assert!(body.is_object());
}

#[actix_web::test]
async fn installed_packages_endpoint_returns_list() {
    let app_state = Arc::new(RwLock::new(AppState::new()));
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(app_state))
            .configure(api::configure_routes),
    )
    .await;

    let req = test::TestRequest::get().uri("/api/packages/installed").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body: Value = test::read_body_json(resp).await;
    let packages = body.as_array().expect("packages array expected");
    assert!(!packages.is_empty());
}

#[actix_web::test]
async fn aur_index_status_endpoint_returns_total() {
    let app_state = Arc::new(RwLock::new(AppState::new()));
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(app_state))
            .configure(api::configure_routes),
    )
    .await;

    let req = test::TestRequest::get().uri("/api/aur/index/status").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body: Value = test::read_body_json(resp).await;
    assert!(body["indexedCount"].as_u64().unwrap_or(0) > 0);
}
