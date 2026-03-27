pub mod m20260101_000001_create_member;
pub mod m20260327_000002_create_requirement;
pub mod m20260327_000003_add_requirement_content;

use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260101_000001_create_member::Migration),
            Box::new(m20260327_000002_create_requirement::Migration),
            Box::new(m20260327_000003_add_requirement_content::Migration),
        ]
    }
}
