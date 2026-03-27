# PPLOps

研发团队主管个人 DevOps 桌面端（Tauri 2 + React + TypeScript + Vite + SeaORM + SQLite）。

详见仓库根目录 [architecture.md](architecture.md)（若已纳入版本控制）。

## 开发

```bash
npm install
npm run dev
```

`dev` 脚本为 `tauri dev` 时，`beforeDevCommand` 必须只启动前端（本仓库为 `npm run dev:web`），不能再用 `npm run dev`，否则会递归调用 Tauri。

仅前端（不启动 Tauri 窗口）：

```bash
npm run dev:web
```

## 代码风格

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## 构建

```bash
npm run build
npm run tauri build
```

Windows 上若 NSIS 安装包下载超时，可稍后重试 `tauri build`；`src-tauri/target/release/pplops.exe` 在 Rust 编译成功后即可找到。

## 技术栈概要

- 前端：React 19、Ant Design、Tailwind CSS 4、Zustand、React Router、ECharts、dnd-kit
- 后端：`src-tauri`（Rust），SeaORM + SQLite（数据目录见应用内设置说明，默认在用户 AppData 下 `data/pplops.db`）

## 推荐 IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
