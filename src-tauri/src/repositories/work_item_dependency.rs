use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, EntityTrait, QueryFilter, Set,
};

use crate::models::work_item_dependency::{ActiveModel, Column, Entity};

pub async fn list_edges_within_set<C: ConnectionTrait>(
    db: &C,
    child_ids: &[i32],
) -> Result<Vec<(i32, i32)>, sea_orm::DbErr> {
    if child_ids.is_empty() {
        return Ok(vec![]);
    }
    let rows = Entity::find()
        .filter(Column::PredecessorId.is_in(child_ids.to_vec()))
        .filter(Column::SuccessorId.is_in(child_ids.to_vec()))
        .all(db)
        .await?;
    Ok(rows
        .into_iter()
        .map(|m| (m.predecessor_id, m.successor_id))
        .collect())
}

pub async fn delete_touching_children<C: ConnectionTrait>(
    db: &C,
    child_ids: &[i32],
) -> Result<(), sea_orm::DbErr> {
    if child_ids.is_empty() {
        return Ok(());
    }
    let ids = child_ids.to_vec();
    Entity::delete_many()
        .filter(
            Condition::any()
                .add(Column::PredecessorId.is_in(ids.clone()))
                .add(Column::SuccessorId.is_in(ids)),
        )
        .exec(db)
        .await?;
    Ok(())
}

pub async fn insert_edges<C: ConnectionTrait>(
    db: &C,
    edges: &[(i32, i32)],
    created_at: i64,
) -> Result<(), sea_orm::DbErr> {
    for (pred, succ) in edges {
        let m = ActiveModel {
            predecessor_id: Set(*pred),
            successor_id: Set(*succ),
            created_at: Set(created_at),
            ..Default::default()
        };
        m.insert(db).await?;
    }
    Ok(())
}
