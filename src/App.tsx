import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { featureRouteDescriptors } from "@/app/featureRegistry";

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/boards" replace />} />
            {featureRouteDescriptors.map((f) => (
              <Route key={f.id} path="" element={<></>}>
                {f.renderRoutes()}
              </Route>
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
