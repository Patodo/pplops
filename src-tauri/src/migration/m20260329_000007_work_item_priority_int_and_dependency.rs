use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("PRAGMA foreign_keys = OFF;").await?;

        conn.execute_unprepared("ALTER TABLE work_item RENAME TO work_item_old;")
            .await?;

        conn.execute_unprepared(
            r#"
            CREATE TABLE work_item (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                item_id TEXT NOT NULL UNIQUE,
                kind TEXT NOT NULL,
                parent_id INTEGER,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 32768,
                owner TEXT NOT NULL,
                content TEXT NOT NULL,
                effort REAL,
                plan_month TEXT,
                planned_hours REAL,
                actual_hours REAL,
                due_date TEXT,
                updated_at BIGINT NOT NULL,
                created_at BIGINT NOT NULL,
                FOREIGN KEY (parent_id) REFERENCES work_item(id) ON DELETE RESTRICT ON UPDATE CASCADE
            )
            "#,
        )
        .await?;

        conn.execute_unprepared(
            r#"
            INSERT INTO work_item (
                id, item_id, kind, parent_id, title, status, priority,
                owner, content, effort, plan_month, planned_hours, actual_hours,
                due_date, updated_at, created_at
            )
            SELECT
                id, item_id, kind, parent_id, title, status,
                CASE TRIM(priority)
                    WHEN 'critical' THEN 0
                    WHEN 'high' THEN 16384
                    WHEN 'medium' THEN 32768
                    WHEN 'low' THEN 49152
                    ELSE 32768
                END,
                owner, content, effort, plan_month, planned_hours, actual_hours,
                due_date, updated_at, created_at
            FROM work_item_old
            "#,
        )
        .await?;

        conn.execute_unprepared("DROP TABLE work_item_old;").await?;

        conn.execute_unprepared(
            r#"
            CREATE TABLE work_item_dependency (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                predecessor_id INTEGER NOT NULL,
                successor_id INTEGER NOT NULL,
                created_at BIGINT NOT NULL,
                UNIQUE(predecessor_id, successor_id),
                CHECK(predecessor_id != successor_id),
                FOREIGN KEY (predecessor_id) REFERENCES work_item(id) ON DELETE CASCADE,
                FOREIGN KEY (successor_id) REFERENCES work_item(id) ON DELETE CASCADE
            )
            "#,
        )
        .await?;

        conn.execute_unprepared("PRAGMA foreign_keys = ON;").await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS work_item_dependency;")
            .await?;

        conn.execute_unprepared("PRAGMA foreign_keys = OFF;").await?;
        conn.execute_unprepared("ALTER TABLE work_item RENAME TO work_item_new;")
            .await?;

        conn.execute_unprepared(
            r#"
            CREATE TABLE work_item (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                item_id TEXT NOT NULL UNIQUE,
                kind TEXT NOT NULL,
                parent_id INTEGER,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                owner TEXT NOT NULL,
                content TEXT NOT NULL,
                effort REAL,
                plan_month TEXT,
                planned_hours REAL,
                actual_hours REAL,
                due_date TEXT,
                updated_at BIGINT NOT NULL,
                created_at BIGINT NOT NULL,
                FOREIGN KEY (parent_id) REFERENCES work_item(id) ON DELETE RESTRICT ON UPDATE CASCADE
            )
            "#,
        )
        .await?;

        conn.execute_unprepared(
            r#"
            INSERT INTO work_item (
                id, item_id, kind, parent_id, title, status, priority,
                owner, content, effort, plan_month, planned_hours, actual_hours,
                due_date, updated_at, created_at
            )
            SELECT
                id, item_id, kind, parent_id, title, status,
                CASE
                    WHEN priority <= 8192 THEN 'critical'
                    WHEN priority <= 24576 THEN 'high'
                    WHEN priority <= 40960 THEN 'medium'
                    ELSE 'low'
                END,
                owner, content, effort, plan_month, planned_hours, actual_hours,
                due_date, updated_at, created_at
            FROM work_item_new
            "#,
        )
        .await?;

        conn.execute_unprepared("DROP TABLE work_item_new;").await?;
        conn.execute_unprepared("PRAGMA foreign_keys = ON;").await?;

        Ok(())
    }
}
