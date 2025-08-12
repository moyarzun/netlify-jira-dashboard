import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import TasksPage from "./pages/tasks/TasksPage";
import { JiraProvider } from "./contexts/JiraContext";
import UsersPage from "./pages/users/UsersPage"; // New import
import StatusesPage from "./pages/statuses/StatusesPage"; // New import

function App() {
  return (
    <JiraProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            {/* New nested routes for settings */}
            <Route path="settings">
              <Route path="users" element={<UsersPage />} />
              <Route path="statuses" element={<StatusesPage />} />
            </Route>
            {/* Otras rutas anidadas aquí */}
          </Route>
        </Routes>
      </Router>
    </JiraProvider>
  );
}

export default App;