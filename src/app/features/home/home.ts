import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../core/services/product.service';
import { Product, Category } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { FooterComponent } from '../../layout/footer/footer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ProductCardComponent, NavbarComponent, FooterComponent],
  template: `
    <app-navbar />
    <main class="page-enter">
      <!-- Hero -->
      <section class="hero">
        <div class="container hero-inner">
          <div class="hero-content">
            <p class="eyebrow">Premium Mobile Accessories</p>
            <h1>Accessories That<br/>Complete Your Style</h1>
            <p class="lead">Discover elegant cases, chargers, earphones and more — curated for the modern you.</p>
            <div class="hero-actions">
              <a routerLink="/shop" class="btn btn-primary btn-lg">Shop Now</a>
              <a routerLink="/categories" class="btn btn-outline btn-lg">Browse Categories</a>
            </div>
          </div>
          <div class="hero-visual">
            <div class="hero-blob"></div>
            <img src="/logo.jpeg.png" alt="Mobile Mela - Mobile Accessories Store" />
          </div>
        </div>
      </section>

      <!-- Signature Products Slider (below logo) -->
      @if (slides().length > 0) {
        <section class="signature-slider">
          <div class="container">
            <div class="section-header slider-header">
              <div>
                <p class="eyebrow">Hand-picked</p>
                <h2>Signature Collection</h2>
              </div>
              <a routerLink="/shop" class="see-all">View all →</a>
            </div>

            <div class="slider-wrap">
              <button type="button" class="nav prev" (click)="prev()" aria-label="Previous">‹</button>

              <div class="slider-viewport">
                <div class="slider-track" [style.transform]="'translateX(-' + (slideIndex() * 100) + '%)'">
                  @for (p of slides(); track p.id) {
                    <a class="slide" [routerLink]="['/products', p.slug]">
                      <div class="slide-img-wrap">
                        <img [src]="productImage(p)" [alt]="p.name" loading="lazy" />
                        <span class="badge">Signature</span>
                      </div>
                      <div class="slide-info">
                        <h3>{{ p.name }}</h3>
                        <p class="price">
                          @if (p.discountPrice) {
                            <span class="now">Rs. {{ p.discountPrice | number }}</span>
                            <span class="was">Rs. {{ p.price | number }}</span>
                          } @else {
                            <span class="now">Rs. {{ p.price | number }}</span>
                          }
                        </p>
                        <span class="cta">View product →</span>
                      </div>
                    </a>
                  }
                </div>
              </div>

              <button type="button" class="nav next" (click)="next()" aria-label="Next">›</button>
            </div>

            <div class="dots">
              @for (p of slides(); track p.id; let i = $index) {
                <button type="button" class="dot" [class.active]="slideIndex() === i"
                  (click)="goTo(i)" [attr.aria-label]="'Slide ' + (i + 1)"></button>
              }
            </div>
          </div>
        </section>
      }

      <!-- Categories -->
      <section class="section categories">
        <div class="container">
          <div class="section-header">
            <h2>Shop by Category</h2>
            <a routerLink="/shop" class="see-all">View all →</a>
          </div>
          <div class="category-grid">
            @for (cat of categories(); track cat.id) {
              <a [routerLink]="['/shop']" [queryParams]="{category: cat.id}" class="category-card">
                <span class="cat-icon">{{ catIcons[cat.slug] || '✦' }}</span>
                <span class="cat-name">{{ cat.name }}</span>
              </a>
            }
          </div>
        </div>
      </section>

      <!-- Featured grid -->
      <section class="section featured">
        <div class="container">
          <div class="section-header">
            <h2>Featured Products</h2>
            <a routerLink="/shop" class="see-all">See all →</a>
          </div>
          @if (loading()) {
            <div class="product-grid">
              @for (i of [1,2,3,4]; track i) {
                <div class="skeleton" style="height: 360px; border-radius: var(--radius-lg);"></div>
              }
            </div>
          } @else {
            <div class="product-grid">
              @for (p of featured(); track p.id) {
                <app-product-card [product]="p" />
              }
            </div>
          }
        </div>
      </section>

      <!-- Why Choose Us -->
      <section class="section why-us">
        <div class="container">
          <h2 class="text-center">Why Choose Us</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">✓</div>
              <h3>Quality Products</h3>
              <p>Carefully selected accessories that look beautiful and last longer.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🚚</div>
              <h3>Fast Delivery</h3>
              <p>Quick and reliable delivery so you can enjoy your new accessories sooner.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🔒</div>
              <h3>Secure Ordering</h3>
              <p>Safe checkout and transparent order tracking from start to finish.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">↩</div>
              <h3>Easy Returns</h3>
              <p>Hassle-free returns and cancellations within the allowed period.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Promo Banner -->
      <section class="promo">
        <div class="container promo-inner">
          <h2>Upgrade Your Setup — Shop Accessories You Love</h2>
          <p>Free delivery on orders over Rs. 3,000</p>
          <a routerLink="/shop" class="btn btn-primary btn-lg">Explore Collection</a>
        </div>
      </section>
    </main>
    <app-footer />
  `,
  styles: [`
    .hero {
      padding: 3.5rem 0 4rem;
      background: linear-gradient(160deg, var(--color-blush) 0%, var(--color-cream) 55%, #fff 100%);
      overflow: hidden;
    }
    .hero-inner {
      display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;
    }
    .eyebrow {
      font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em;
      color: var(--color-primary-dark); font-weight: 600; margin-bottom: 0.75rem;
    }
    .hero h1 {
      font-size: clamp(2.2rem, 4.5vw, 3.4rem);
      margin-bottom: 1rem;
      line-height: 1.15;
      color: #d979a3;
    }
    .lead { font-size: 1.1rem; color: var(--color-text-muted); margin-bottom: 1.75rem; max-width: 420px; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .hero-visual { position: relative; display: flex; justify-content: center; }
    .hero-blob {
      position: absolute; width: 320px; height: 320px; border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary-light), var(--color-accent));
      opacity: 0.45; filter: blur(40px); z-index: 0;
    }
    .hero-visual img {
      position: relative; z-index: 1; max-width: 380px; border-radius: var(--radius-xl);
      box-shadow: var(--shadow-hover);
    }

    /* ===== Signature Slider ===== */
    .signature-slider {
      padding: 2.5rem 0 3rem;
      background: #fff;
      border-bottom: 1px solid var(--color-border, #f3e8ee);
    }
    .slider-header { margin-bottom: 1.5rem; }
    .slider-header h2 { font-size: 1.75rem; color: #d979a3; margin: 0; }
    .slider-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .slider-viewport {
      flex: 1;
      overflow: hidden;
      border-radius: 20px;
    }
    .slider-track {
      display: flex;
      transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .slide {
      flex: 0 0 100%;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 0;
      background: linear-gradient(135deg, #fdf2f8 0%, #fff7ed 50%, #f5f3ff 100%);
      min-height: 280px;
      text-decoration: none;
      color: inherit;
      overflow: hidden;
    }
    .slide-img-wrap {
      position: relative;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
    }
    .slide-img-wrap img {
      width: 100%;
      height: 100%;
      max-height: 340px;
      object-fit: cover;
      display: block;
    }
    .badge {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: #d979a3;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
    }
    .slide-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 2rem 2.25rem;
    }
    .slide-info h3 {
      font-size: 1.45rem;
      margin: 0 0 0.75rem;
      color: #1f2937;
      line-height: 1.3;
    }
    .price { margin-bottom: 1.25rem; }
    .price .now {
      font-size: 1.35rem;
      font-weight: 700;
      color: #d979a3;
      margin-right: 0.5rem;
    }
    .price .was {
      font-size: 0.95rem;
      color: #9ca3af;
      text-decoration: line-through;
    }
    .cta {
      font-weight: 600;
      color: var(--color-primary-dark, #be185d);
      font-size: 0.95rem;
    }
    .slide:hover .cta { text-decoration: underline; }

    .nav {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 1px solid var(--color-border, #e5e7eb);
      background: #fff;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #374151;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: background 0.2s, color 0.2s;
    }
    .nav:hover {
      background: #d979a3;
      color: #fff;
      border-color: #d979a3;
    }
    .dots {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1.15rem;
    }
    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      border: none;
      background: #e5e7eb;
      cursor: pointer;
      padding: 0;
      transition: background 0.2s, transform 0.2s;
    }
    .dot.active {
      background: #d979a3;
      transform: scale(1.25);
    }

    .section { padding: 4rem 0; }
    .section-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 1.75rem;
    }
    .section-header h2 {
      font-size: 1.75rem;
      color: #d979a3;
    }
    .see-all { font-weight: 500; font-size: 0.95rem; }
    .text-center {
      text-align: center;
      margin-bottom: 2rem;
      color: #d979a3;
    }

    .category-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;
    }
    .category-card {
      display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
      padding: 1.25rem 0.75rem; background: white; border-radius: var(--radius-md);
      box-shadow: var(--shadow-card); transition: all 0.25s ease; text-align: center;
    }
    .category-card:hover {
      transform: translateY(-3px); box-shadow: var(--shadow-hover);
      color: var(--color-primary-dark);
    }
    .cat-icon { font-size: 1.6rem; }
    .cat-name { font-size: 0.9rem; font-weight: 500; color: var(--color-text); }

    .why-us { background: white; }
    .features-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem;
    }
    .feature-card {
      text-align: center; padding: 1.75rem 1.25rem;
      border-radius: var(--radius-lg); background: var(--color-cream);
    }
    .feature-icon {
      width: 52px; height: 52px; margin: 0 auto 1rem; border-radius: 50%;
      background: var(--color-primary-light); display: flex; align-items: center;
      justify-content: center; font-size: 1.3rem;
    }
    .feature-card h3 { font-size: 1.1rem; margin-bottom: 0.4rem; font-family: var(--font-body); }
    .feature-card p { font-size: 0.9rem; color: var(--color-text-muted); }

    .promo {
      padding: 4rem 0; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent-dark) 100%);
      color: white; text-align: center;
    }
    .promo h2 { color: white; font-size: 1.9rem; margin-bottom: 0.5rem; }
    .promo p { opacity: 0.9; margin-bottom: 1.5rem; }
    .promo .btn-primary {
      background: white; color: var(--color-primary-dark);
    }

    @media (max-width: 900px) {
      .hero-inner { grid-template-columns: 1fr; text-align: center; }
      .lead { margin-left: auto; margin-right: auto; }
      .hero-actions { justify-content: center; }
      .hero-visual { order: -1; }
      .hero-visual img { max-width: 280px; }
      .slide { grid-template-columns: 1fr; min-height: auto; }
      .slide-img-wrap { min-height: 200px; max-height: 240px; }
      .slide-img-wrap img { max-height: 240px; }
      .slide-info { padding: 1.25rem 1.5rem 1.5rem; }
      .nav { width: 36px; height: 36px; font-size: 1.25rem; }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);

  featured = signal<Product[]>([]);
  /** First 3–4 featured products for the signature slider */
  slides = signal<Product[]>([]);
  slideIndex = signal(0);
  categories = signal<Category[]>([]);
  loading = signal(true);

  private autoTimer: ReturnType<typeof setInterval> | null = null;

  catIcons: Record<string, string> = {
    'phone-cases': '📱',
    'chargers': '🔌',
    'cables': '🔗',
    'earphones': '🎧',
    'power-banks': '🔋',
    'smart-watches': '⌚',
    'mobile-stands': '📐',
    'screen-protectors': '🛡️',
    'car-accessories': '🚗',
    'other': '✨'
  };

  ngOnInit(): void {
    // Featured section = Featured checkbox only
    this.productService.getFeatured().subscribe(p => {
      this.featured.set(Array.isArray(p) ? p : []);
      this.loading.set(false);
    });
    // Signature slider = Signature checkbox only (max 4)
    this.productService.getSignature().subscribe(p => {
      const list = Array.isArray(p) ? p : [];
      const withImg = list.filter(x => !!this.productImage(x));
      this.slides.set((withImg.length ? withImg : list).slice(0, 4));
      this.startAuto();
    });
    this.productService.getCategories().subscribe(c => this.categories.set(c));
  }

  ngOnDestroy(): void {
    this.stopAuto();
  }

  productImage(p: Product): string {
    if (!p?.images?.length) return '';
    const main = p.images.find(i => i.isMain) || p.images[0];
    return main?.imageUrl || '';
  }

  next(): void {
    const n = this.slides().length;
    if (n < 2) return;
    this.slideIndex.update(i => (i + 1) % n);
    this.restartAuto();
  }

  prev(): void {
    const n = this.slides().length;
    if (n < 2) return;
    this.slideIndex.update(i => (i - 1 + n) % n);
    this.restartAuto();
  }

  goTo(i: number): void {
    this.slideIndex.set(i);
    this.restartAuto();
  }

  private startAuto(): void {
    this.stopAuto();
    if (this.slides().length < 2) return;
    this.autoTimer = setInterval(() => this.next(), 4500);
  }

  private stopAuto(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  private restartAuto(): void {
    this.startAuto();
  }
}
