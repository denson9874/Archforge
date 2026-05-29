mod state;
mod aur;
mod api;
mod models;
mod health;

use actix_web::{web, App, HttpServer, middleware};
use parking_lot::RwLock;
use std::sync::Arc;
use state::AppState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let app_state = Arc::new(RwLock::new(AppState::new()));

    log::info!("Starting ArchWeaver Rust backend server on 0.0.0.0:3001");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(app_state.clone()))
            .wrap(middleware::Logger::default())
            .configure(api::configure_routes)
    })
    .bind("0.0.0.0:3001")?
    .run()
    .await
}
