use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Db(#[from] sea_orm::DbErr),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Msg(String),
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ErrorPayload {
    pub message: String,
}

impl From<AppError> for ErrorPayload {
    fn from(e: AppError) -> Self {
        ErrorPayload {
            message: e.to_string(),
        }
    }
}
