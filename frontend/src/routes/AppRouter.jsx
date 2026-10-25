import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UserRegisterPage from '../pages/user/UserRegisterPage'
import UserLoginPage from '../pages/user/UserLoginPage'
import FoodPartnerRegisterPage from '../pages/foodPartner/FoodPartnerRegisterPage'
import FoodPartnerLoginPage from '../pages/foodPartner/FoodPartnerLoginPage'
import '../styles/theme.css'
import Home from '../pages/general/Home'
import FoodPartnerDashboard from '../pages/food-Partner/FoodPartnerDashboard'
import Profile from '../pages/food-Partner/Profile'
import UserAccount from '../pages/user/UserAccount'


const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/user/register" element={<UserRegisterPage />} />
        <Route path="/user/login" element={<UserLoginPage />} />
        <Route path="/food-partner/register" element={<FoodPartnerRegisterPage />} />
        <Route path="/food-partner/login" element={<FoodPartnerLoginPage />} />
        <Route path="/" element={<Home />} />
        <Route path="/create-food/*" element={<FoodPartnerDashboard />} />
        <Route path="/food-partner/dashboard/*" element={<FoodPartnerDashboard />} />
        <Route path="/food-partner/profile" element={<Profile />} />
        <Route path="/food-partner/profile/:partnerId" element={<Profile />} />
        <Route path="/account/*" element={<UserAccount />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  )
}

export default AppRouter
