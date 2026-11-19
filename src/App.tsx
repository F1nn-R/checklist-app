import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { BottomNav } from './components/ui';
import Today from './pages/Today';
import AllTasks from './pages/AllTasks';
import TaskDetail from './pages/TaskDetail';
import TaskEdit from './pages/TaskEdit';
import Groups from './pages/Groups';
import Settings from './pages/Settings';

const TABS = ['/', '/all', '/groups', '/settings'];

function Shell() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/all" element={<AllTasks />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/task/new" element={<TaskEdit key="new" />} />
        <Route path="/task/:id" element={<TaskDetail />} />
        <Route path="/task/:id/edit" element={<TaskEdit />} />
        <Route path="*" element={<Today />} />
      </Routes>
      {TABS.includes(pathname) && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
