import { Routes, Route } from 'react-router-dom'
import Login from '../frontend/Login/Login.jsx'
import Home from '../frontend/Home/Home.jsx'
import CreateAccountPage from '../frontend/Login/CreateAccountPage.jsx'
import Visitor from '../frontend/Visitor/Visitor.jsx'
import Membership from '../frontend/Membership/Membership.jsx'
import Exhibits from '../frontend/Exhibits/Exhibits.jsx'
import SpaceExhibit from '../frontend/_SpaceExhibit/_SpaceExhibit.jsx'
import NaturalExhibit from '../frontend/_NaturalExhibit/_NaturalExhibit.jsx'
import AncientExhibit from '../frontend/_AncientExhibit/AncientExhibit.jsx'
import Giftshop from '../frontend/Giftshop/Giftshop.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/create-account" element={<CreateAccountPage/>} />
      <Route path="/login" element={<Login/>} />
      <Route path="/dashboard" element={<Visitor/>} />
      <Route path="/membership" element={<Membership/>} />
      <Route path="/exhibits" element={<Exhibits/>} />
      <Route path="/giftshop" element={<Giftshop/>} />
      <Route path="/exhibits/space" element={<SpaceExhibit/>} />
      <Route path="/exhibits/natural" element={<NaturalExhibit/>} />
      <Route path="/exhibits/ancient" element={<AncientExhibit/>} />
    </Routes>
  )
}

export default App
