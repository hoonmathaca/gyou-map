import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MapPage from './pages/MapPage'
import PlacePage from './pages/PlacePage'
import AddPage from './pages/AddPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/p/:id" element={<PlacePage />} />
        <Route path="/add" element={<AddPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  )
}
