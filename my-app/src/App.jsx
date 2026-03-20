import { Routes, Route } from 'react-router-dom'
import './App.css'
import Login from '../frontend/Login/Login.jsx'
import Home from '../frontend/Home/Home.jsx'
import CreateAccountPage from '../frontend/Login/CreateAccountPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/create-account" element={<CreateAccountPage/>} />
      <Route path="/login" element={<Login/>} />
    </Routes>
  )
}

export default App
