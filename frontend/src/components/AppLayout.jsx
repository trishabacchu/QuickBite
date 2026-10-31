import { Outlet } from 'react-router-dom';
import { CartConflictModal } from './CartConflictModal.jsx';
import { Footer } from './Footer.jsx';
import { Navbar } from './Navbar.jsx';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartConflictModal />
    </div>
  );
}
