import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login.tsx';
import { AppContent } from './AppContent.tsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* AppContent owns every other path, including its own "*" -> NotFound;
          a route here after "/*" can never match, so there is only one. */}
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
}

export default App;
