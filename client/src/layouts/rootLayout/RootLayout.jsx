import './rootLayout.css'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { SignedIn, ClerkProvider, UserButton } from "@clerk/clerk-react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

const queryClient = new QueryClient()

const RootLayout = () => {
  const location = useLocation();
  const isDashboardPage = location.pathname.includes('/dashboard');
  
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <QueryClientProvider client={queryClient}>
        <div className='rootLayout'>
          {/* Only render header on non-dashboard pages */}
          {!isDashboardPage && (
            <header>
              <Link to="/" className='logo'>
                <img src="/logo.png" alt="" />
                <span>DrugMate</span>
              </Link>
              <div className='user'>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </header>
          )}
          <main className={isDashboardPage ? 'dashboard-main' : ''}>
            <Outlet />
          </main>
        </div>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default RootLayout;