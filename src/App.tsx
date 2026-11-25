import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Today from './pages/Today';
import AllTasks from './pages/AllTasks';
import TaskDetail from './pages/TaskDetail';
import TaskEdit from './pages/TaskEdit';
import Groups from './pages/Groups';
import Settings from './pages/Settings';
import PastDays from './pages/PastDays';
import { ShaderBackground } from './components/ShaderBackground';

function Shell() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/all" element={<AllTasks key="all" archived={false} />} />
        <Route path="/archived" element={<AllTasks key="archived" archived />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/past" element={<PastDays />} />
        <Route path="/task/new" element={<TaskEdit key="new" />} />
        <Route path="/task/:id" element={<TaskDetail />} />
        <Route path="/task/:id/edit" element={<TaskEdit />} />
        <Route path="*" element={<Today />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ShaderBackground />
      <Shell />
    </HashRouter>
  );
}
