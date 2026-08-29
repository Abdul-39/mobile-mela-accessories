import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

/** Customer store only — no admin routes (admin runs on a separate app/server). */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'shop',
    loadComponent: () => import('./features/products/product-list/product-list').then(m => m.ProductListComponent)
  },
  {
    path: 'products/:slug',
    loadComponent: () => import('./features/products/product-details/product-details').then(m => m.ProductDetailsComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout').then(m => m.CheckoutComponent)
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then(m => m.RegisterComponent)
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadChildren: () => import('./features/account/account.routes').then(m => m.ACCOUNT_ROUTES)
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./features/wishlist/wishlist').then(m => m.WishlistComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then(m => m.ContactComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then(m => m.AboutComponent)
  },
  { path: '**', redirectTo: '' }
];
