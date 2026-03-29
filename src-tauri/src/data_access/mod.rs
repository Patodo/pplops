//! 统一数据访问门面：根据「内存缓存模式」在 SQLite 与内存快照之间路由。
//! 新增读路径应经此层；写路径在 DB 成功后同步更新或失效缓存。

pub mod cache;
pub mod member;
pub mod work_item;

pub use cache::DataCache;
