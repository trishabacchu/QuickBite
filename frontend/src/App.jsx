import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { ScrollToTop } from './components/ScrollToTop.jsx';
import { Addresses } from './pages/Addresses.jsx';
import { Auth } from './pages/Auth.jsx';
import { Cart } from './pages/Cart.jsx';
import { Checkout } from './pages/Checkout.jsx';
import { FoodDetail } from './pages/FoodDetail.jsx';
import { Home } from './pages/Home.jsx';
import { NotFound } from './pages/NotFound.jsx';
import { OrderDetail } from './pages/OrderDetail.jsx';
import { Orders } from './pages/Orders.jsx';
import { Profile } from './pages/Profile.jsx';
import { Restaurant } from './pages/Restaurant.jsx';

function protect(element) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="restaurants/:id" element={<Restaurant />} />
          <Route path="food/:id" element={<FoodDetail />} />
          <Route path="cart" element={protect(<Cart />)} />
          <Route path="checkout" element={protect(<Checkout />)} />
          <Route path="auth" element={<Auth />} />
          <Route path="orders" element={protect(<Orders />)} />
          <Route path="orders/:id" element={protect(<OrderDetail />)} />
          <Route path="profile" element={protect(<Profile />)} />
          <Route path="addresses" element={protect(<Addresses />)} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
