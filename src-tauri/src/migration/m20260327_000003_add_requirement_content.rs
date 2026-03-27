use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Requirement::Table)
                    .add_column(
                        ColumnDef::new(Requirement::Content)
                            .text()
                            .not_null()
                            .default(""),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Requirement::Table)
                    .drop_column(Requirement::Content)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Requirement {
    Table,
    Content,
}
