pub mod m20260101_000001_create_member;
pub mod m20260327_000002_create_requirement;
pub mod m20260327_000003_add_requirement_content;
pub mod m20260327_000004_expand_member_fields;
pub mod m20260327_000005_create_task;
pub mod m20260327_000006_create_work_item;
pub mod m20260329_000007_work_item_priority_int_and_dependency;

use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260101_000001_create_member::Migration),
            Box::new(m20260327_000002_create_requirement::Migration),
            Box::new(m20260327_000003_add_requirement_content::Migration),
            Box::new(m20260327_000004_expand_member_fields::Migration),
            Box::new(m20260327_000005_create_task::Migration),
            Box::new(m20260327_000006_create_work_item::Migration),
            Box::new(m20260329_000007_work_item_priority_int_and_dependency::Migration),
        ]
    }
}
