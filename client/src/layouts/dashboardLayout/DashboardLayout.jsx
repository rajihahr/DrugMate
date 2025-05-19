import { useEffect } from 'react'
import './dashboardLayout.css'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth, UserButton } from '@clerk/clerk-react'
import ChatList from '../../components/chatList/ChatList'

const DashboardLayout = () => {
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isLoaded && !userId) {
      navigate("/sign-in");
    }
  }, [isLoaded, userId, navigate]);
  
  if (!isLoaded) return "Loading...";
  
  return (
    <div className='dashboardLayout'>
      <div className="menu">
        <ChatList />
      </div>
      <div className="content">
        <div className="user-button-container">
          <UserButton />
        </div>
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout;