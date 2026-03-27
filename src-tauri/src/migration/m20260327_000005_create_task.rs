use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Task::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Task::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Task::TaskId)
                            .string_len(32)
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Task::RequirementId).integer().not_null())
                    .col(ColumnDef::new(Task::Title).string().not_null())
                    .col(ColumnDef::new(Task::Status).string_len(32).not_null())
                    .col(ColumnDef::new(Task::Priority).string_len(32).not_null())
                    .col(ColumnDef::new(Task::Owner).string_len(64).not_null())
                    .col(ColumnDef::new(Task::PlannedHours).double().not_null())
                    .col(ColumnDef::new(Task::ActualHours).double().not_null())
                    .col(ColumnDef::new(Task::DueDate).string_len(10).not_null())
                    .col(ColumnDef::new(Task::Content).text().not_null())
                    .col(ColumnDef::new(Task::UpdatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Task::CreatedAt).big_integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_requirement_id")
                            .from(Task::Table, Task::RequirementId)
                            .to(Requirement::Table, Requirement::Id)
                            .on_delete(ForeignKeyAction::Restrict)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Task::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Task {
    Table,
    Id,
    TaskId,
    RequirementId,
    Title,
    Status,
    Priority,
    Owner,
    PlannedHours,
    ActualHours,
    DueDate,
    Content,
    UpdatedAt,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Requirement {
    Table,
    Id,
}
