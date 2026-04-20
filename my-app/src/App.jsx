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
import ExhibitDetail from '../frontend/ExhibitDetail/ExhibitDetail.jsx'
import Giftshop from '../frontend/Giftshop/Giftshop.jsx'
import CartPage from '../frontend/Cart/Cart.jsx'
import Admin from '../frontend/Portals/Admin/Admin.jsx'
import GiftShopPortal from '../frontend/Portals/GiftShopManager/GiftShopPortal.jsx'
import CuratorPortal from '../frontend/Portals/Curator/CuratorPortal.jsx'
import Tickets from '../frontend/Tickets/Tickets.jsx'

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
      <Route path="/tickets" element={<Tickets/>} />
      <Route path="/cart" element={<CartPage/>} />
      <Route path="/admin" element={<Admin/>} />
      <Route path="/giftshop-portal" element={<GiftShopPortal/>} />
      <Route path="/curator-portal" element={<CuratorPortal/>} />
      <Route path="/exhibits/space" element={<SpaceExhibit/>} />
      <Route path="/exhibits/natural" element={<NaturalExhibit/>} />
      <Route path="/exhibits/ancient" element={<AncientExhibit/>} />
      <Route path="/exhibits/:id" element={<ExhibitDetail/>} />
    </Routes>
  )
}

export default App
