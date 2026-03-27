use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Requirement::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Requirement::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Requirement::ReqId)
                            .string_len(32)
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Requirement::Title).string().not_null())
                    .col(ColumnDef::new(Requirement::Status).string_len(32).not_null())
                    .col(ColumnDef::new(Requirement::Priority).string_len(32).not_null())
                    .col(ColumnDef::new(Requirement::Owner).string_len(64).not_null())
                    .col(ColumnDef::new(Requirement::Effort).double().not_null())
                    .col(ColumnDef::new(Requirement::PlanMonth).string_len(7).not_null())
                    .col(ColumnDef::new(Requirement::UpdatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Requirement::CreatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Requirement::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Requirement {
    Table,
    Id,
    ReqId,
    Title,
    Status,
    Priority,
    Owner,
    Effort,
    PlanMonth,
    UpdatedAt,
    CreatedAt,
}
