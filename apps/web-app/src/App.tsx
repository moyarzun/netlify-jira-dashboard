import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import TasksPage from "./pages/tasks/TasksPage";
import { JiraProvider } from "./contexts/JiraContext";
import UsersPage from "./pages/users/UsersPage";
import StatusesPage from "./pages/statuses/StatusesPage";

function App() {
  return (
    <JiraProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="settings">
              <Route path="users" element={<UsersPage />} />
              <Route path="statuses" element={<StatusesPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </JiraProvider>
  );
}

export default App;