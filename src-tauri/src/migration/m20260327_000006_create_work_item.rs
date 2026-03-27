use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(WorkItem::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WorkItem::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(WorkItem::ItemId)
                            .string_len(32)
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(WorkItem::Kind).string_len(16).not_null())
                    .col(ColumnDef::new(WorkItem::ParentId).integer())
                    .col(ColumnDef::new(WorkItem::Title).string().not_null())
                    .col(ColumnDef::new(WorkItem::Status).string_len(32).not_null())
                    .col(ColumnDef::new(WorkItem::Priority).string_len(32).not_null())
                    .col(ColumnDef::new(WorkItem::Owner).string_len(64).not_null())
                    .col(ColumnDef::new(WorkItem::Content).text().not_null())
                    .col(ColumnDef::new(WorkItem::Effort).double())
                    .col(ColumnDef::new(WorkItem::PlanMonth).string_len(7))
                    .col(ColumnDef::new(WorkItem::PlannedHours).double())
                    .col(ColumnDef::new(WorkItem::ActualHours).double())
                    .col(ColumnDef::new(WorkItem::DueDate).string_len(10))
                    .col(ColumnDef::new(WorkItem::UpdatedAt).big_integer().not_null())
                    .col(ColumnDef::new(WorkItem::CreatedAt).big_integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_work_item_parent_id")
                            .from(WorkItem::Table, WorkItem::ParentId)
                            .to(WorkItem::Table, WorkItem::Id)
                            .on_delete(ForeignKeyAction::Restrict)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(WorkItem::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum WorkItem {
    Table,
    Id,
    ItemId,
    Kind,
    ParentId,
    Title,
    Status,
    Priority,
    Owner,
    Content,
    Effort,
    PlanMonth,
    PlannedHours,
    ActualHours,
    DueDate,
    UpdatedAt,
    CreatedAt,
}
