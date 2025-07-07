import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import TasksPage from "./pages/tasks/TasksPage";
import { JiraProvider } from "./contexts/JiraContext";

function App() {
  return (
    <JiraProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            {/* Otras rutas anidadas aquí */}
          </Route>
        </Routes>
      </Router>
    </JiraProvider>
  );
}

export default App;
