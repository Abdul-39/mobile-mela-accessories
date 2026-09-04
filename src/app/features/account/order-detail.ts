import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { Order, OrderStatus } from '../../core/models';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { FooterComponent } from '../../layout/footer/footer';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-account-order-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <app-navbar />
    <main class="page-enter">
      <div class="container">
        <nav class="breadcrumb">
          <a routerLink="/account">Account</a>
          <span>/</span>
          <a routerLink="/account/orders">Orders</a>
          <span>/</span>
          <span>{{ order()?.orderNumber || '...' }}</span>
        </nav>

        @if (loading()) {
          <div class="skeleton" style="height: 360px; border-radius: var(--radius-lg);"></div>
        } @else if (!order()) {
          <div class="empty-state">
            <h3>Order not found</h3>
            <a routerLink="/account/orders" class="btn btn-primary">Back to Orders</a>
          </div>
        } @else {
          <div class="header">
            <div>
              <h1>{{ order()!.orderNumber }}</h1>
              <p class="muted">Placed {{ order()!.orderDate | date:'dd MMM yyyy, HH:mm' }}</p>
            </div>
            <span class="status large" [attr.data-status]="order()!.orderStatus">{{ order()!.orderStatus }}</span>
          </div>

          @if (countdown()) {
            <div class="countdown-banner">
              <div>
                <p class="cd-title">You can still cancel this order</p>
                <p class="cd-sub">Cancellation window closes in</p>
              </div>
              <div class="cd-clock">{{ countdown() }}</div>
              <button type="button" class="btn btn-outline btn-sm"
                      [disabled]="cancelling()"
                      (click)="cancel()">
                {{ cancelling() ? 'Cancelling...' : 'Cancel Order' }}
              </button>
            </div>
          }

          <!-- Timeline -->
          <section class="card timeline-card">
            <h2>Order Timeline</h2>
            <div class="timeline">
              @for (step of timelineSteps; track step.status; let i = $index) {
                <div class="tl-step" [class.done]="isDone(step.status)" [class.current]="order()!.orderStatus === step.status"
                     [class.cancelled]="order()!.orderStatus === 'Cancelled' && step.status === 'Cancelled'">
                  <div class="dot"></div>
                  @if (i < timelineSteps.length - 1) { <div class="line"></div> }
                  <div class="tl-label">
                    <strong>{{ step.label }}</strong>
                    @if (order()!.orderStatus === step.status) {
                      <span class="now">Current</span>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <div class="grid">
            <section class="card">
              <h2>Items</h2>
              @for (item of order()!.items; track item.id) {
                <div class="item-row">
                  @if (item.productImage) {
                    <img [src]="item.productImage" [alt]="item.productName" />
                  }
                  <div class="info">
                    <p class="name">{{ item.productName }}</p>
                    <p class="meta">Rs. {{ item.unitPrice | number }} × {{ item.quantity }}</p>
                  </div>
                  <span class="sub">Rs. {{ item.subtotal | number }}</span>
                </div>
              }
              <div class="totals">
                <div class="row"><span>Subtotal</span><span>Rs. {{ order()!.subtotal | number }}</span></div>
                <div class="row"><span>Delivery</span><span>Rs. {{ order()!.deliveryCharges | number }}</span></div>
                @if (order()!.discount > 0) {
                  <div class="row"><span>Discount</span><span>− Rs. {{ order()!.discount | number }}</span></div>
                }
                <div class="row total"><span>Total</span><span>Rs. {{ order()!.total | number }}</span></div>
              </div>
            </section>

            <div class="side">
              <section class="card">
                <h2>Delivery Address</h2>
                <p>{{ order()!.customerName }}</p>
                <p>{{ order()!.address }}</p>
                <p>{{ order()!.area ? order()!.area + ', ' : '' }}{{ order()!.city }}</p>
                @if (order()!.postalCode) { <p>{{ order()!.postalCode }}</p> }
                <p class="muted">{{ order()!.phone }}</p>
              </section>
              <section class="card">
                <h2>Payment</h2>
                <p>{{ order()!.paymentMethod === 'CashOnDelivery' ? 'Cash on Delivery' : order()!.paymentMethod }}</p>
                <p class="muted">Status: {{ order()!.paymentStatus }}</p>
              </section>
            </div>
          </div>

          <!-- Reviews: only when Delivered -->
          @if (order()!.orderStatus === 'Delivered') {
            <section class="card reviews-card">
              <h2>Rate your products</h2>
              <p class="muted" style="margin-bottom: 1rem;">Share your experience — it helps other customers.</p>
              @for (item of order()!.items; track item.productId) {
                <div class="review-item">
                  <div class="review-head">
                    @if (item.productImage) {
                      <img [src]="item.productImage" [alt]="item.productName" />
                    }
                    <strong>{{ item.productName }}</strong>
                  </div>
                  @if (reviewedIds().has(item.productId)) {
                    <p class="reviewed-ok">✓ Thank you — your review was submitted.</p>
                  } @else {
                    <div class="stars-pick">
                      @for (s of [1,2,3,4,5]; track s) {
                        <button type="button" class="star-btn"
                          [class.on]="(ratings()[item.productId] || 0) >= s"
                          (click)="setRating(item.productId, s)">★</button>
                      }
                    </div>
                    <textarea class="form-control" rows="2"
                      placeholder="Optional comment…"
                      [ngModel]="comments()[item.productId] || ''"
                      (ngModelChange)="setComment(item.productId, $event)"></textarea>
                    <button type="button" class="btn btn-primary btn-sm"
                      [disabled]="submittingId() === item.productId || !(ratings()[item.productId])"
                      (click)="submitReview(item.productId)">
                      {{ submittingId() === item.productId ? 'Submitting…' : 'Submit review' }}
                    </button>
                  }
                </div>
              }
            </section>
          }
        }
      </div>
    </main>
    <app-footer />
  `,
  styles: [`
    .container { padding: 1.5rem 1.25rem 4rem; max-width: 960px; }
    .breadcrumb { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .breadcrumb a { color: var(--color-text-muted); }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1.25rem; gap: 1rem; flex-wrap: wrap;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.2rem; }
    .muted { color: var(--color-text-muted); font-size: 0.9rem; }

    .countdown-banner {
      display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
      background: linear-gradient(135deg, var(--color-blush), #fff);
      border: 1.5px solid var(--color-primary-light); border-radius: var(--radius-lg);
      padding: 1rem 1.25rem; margin-bottom: 1.5rem;
    }
    .cd-title { font-weight: 600; margin-bottom: 0.15rem; }
    .cd-sub { font-size: 0.85rem; color: var(--color-text-muted); }
    .cd-clock {
      font-size: 1.35rem; font-weight: 700; color: var(--color-primary-dark);
      font-variant-numeric: tabular-nums; margin-left: auto;
    }

    .card { background: white; border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: var(--shadow-card); margin-bottom: 1.25rem; }
    .card h2 { font-size: 1.05rem; font-family: var(--font-body); margin-bottom: 1rem; }

    .timeline { display: flex; flex-direction: column; gap: 0; }
    .tl-step { display: grid; grid-template-columns: 24px 1fr; gap: 0 0.85rem; position: relative; min-height: 48px; }
    .dot {
      width: 14px; height: 14px; border-radius: 50%; background: var(--color-border);
      border: 2px solid var(--color-border); margin-top: 4px; z-index: 1; justify-self: center;
    }
    .tl-step.done .dot { background: var(--color-success); border-color: var(--color-success); }
    .tl-step.current .dot {
      background: var(--color-primary); border-color: var(--color-primary);
      box-shadow: 0 0 0 4px rgba(232, 160, 191, 0.35);
    }
    .tl-step.cancelled .dot { background: var(--color-danger); border-color: var(--color-danger); }
    .line {
      position: absolute; left: 11px; top: 20px; bottom: -4px; width: 2px;
      background: var(--color-border);
    }
    .tl-step.done .line { background: var(--color-success); }
    .tl-label { padding-bottom: 1rem; }
    .tl-label strong { font-size: 0.95rem; }
    .now {
      margin-left: 0.5rem; font-size: 0.75rem; font-weight: 600;
      color: var(--color-primary-dark); background: var(--color-blush);
      padding: 0.15rem 0.45rem; border-radius: var(--radius-full);
    }

    .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.25rem; }
    .item-row {
      display: flex; gap: 0.75rem; align-items: center; padding: 0.65rem 0;
      border-bottom: 1px solid var(--color-border);
    }
    .item-row img {
      width: 56px; height: 56px; border-radius: var(--radius-sm); object-fit: cover;
      background: var(--color-blush);
    }
    .item-row .name { font-weight: 500; font-size: 0.95rem; }
    .item-row .meta { font-size: 0.85rem; color: var(--color-text-muted); }
    .item-row .sub { margin-left: auto; font-weight: 500; white-space: nowrap; }
    .totals { margin-top: 1rem; max-width: 260px; margin-left: auto; }
    .totals .row { display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.95rem; }
    .totals .total { font-weight: 600; font-size: 1.1rem; padding-top: 0.5rem; border-top: 1px solid var(--color-border); }

    .status {
      display: inline-block; padding: 0.25rem 0.7rem; border-radius: var(--radius-full);
      font-size: 0.8rem; font-weight: 600;
    }
    .status.large { font-size: 0.9rem; padding: 0.35rem 0.9rem; }
    .status[data-status="Pending"] { background: #fff3e0; color: #e65100; }
    .status[data-status="Confirmed"], .status[data-status="Processing"], .status[data-status="Packed"] { background: #e3f2fd; color: #1565c0; }
    .status[data-status="Shipped"], .status[data-status="OutForDelivery"] { background: #f3e5f5; color: #7b1fa2; }
    .status[data-status="Delivered"] { background: #e8f5e9; color: #2e7d32; }
    .status[data-status="Cancelled"] { background: #fce4ec; color: #c62828; }

    .reviews-card .review-item {
      padding: 1rem 0; border-bottom: 1px solid var(--color-border);
    }
    .reviews-card .review-item:last-child { border-bottom: none; }
    .review-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .review-head img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
    .stars-pick { margin-bottom: 0.5rem; }
    .star-btn {
      background: none; border: none; font-size: 1.4rem; color: #d1d5db; cursor: pointer;
      padding: 0 0.15rem; line-height: 1;
    }
    .star-btn.on { color: #d4a017; }
    .reviews-card textarea { width: 100%; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--color-border); font: inherit; }
    .btn-sm { padding: 0.4rem 0.9rem; font-size: 0.85rem; }
    .reviewed-ok { color: #047857; font-size: 0.9rem; margin: 0.25rem 0 0; }

    @media (max-width: 700px) {
      .grid { grid-template-columns: 1fr; }
      .cd-clock { margin-left: 0; width: 100%; }
    }
  `]
})
export class AccountOrderDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  order = signal<Order | null>(null);
  loading = signal(true);
  cancelling = signal(false);
  countdown = signal('');

  ratings = signal<Record<number, number>>({});
  comments = signal<Record<number, string>>({});
  reviewedIds = signal<Set<number>>(new Set());
  submittingId = signal<number | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;

  timelineSteps: { status: OrderStatus; label: string }[] = [
    { status: 'Pending', label: 'Order Placed' },
    { status: 'Confirmed', label: 'Confirmed' },
    { status: 'Processing', label: 'Processing' },
    { status: 'Packed', label: 'Packed' },
    { status: 'Shipped', label: 'Shipped' },
    { status: 'OutForDelivery', label: 'Out for Delivery' },
    { status: 'Delivered', label: 'Delivered' }
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = +(params.get('id') || 0);
      this.loading.set(true);
      this.orderService.getOrder(id).subscribe(o => {
        this.order.set(o);
        this.loading.set(false);
        this.tick();
      });
    });
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  setRating(productId: number, rating: number): void {
    this.ratings.update(m => ({ ...m, [productId]: rating }));
  }

  setComment(productId: number, text: string): void {
    this.comments.update(m => ({ ...m, [productId]: text }));
  }

  submitReview(productId: number): void {
    const rating = this.ratings()[productId];
    if (!rating) {
      this.toast.error('Please select a star rating');
      return;
    }
    this.submittingId.set(productId);
    this.http
      .post(`${environment.apiUrl}/reviews`, {
        productId,
        rating,
        comment: (this.comments()[productId] || '').trim() || null
      })
      .subscribe({
        next: () => {
          this.submittingId.set(null);
          this.reviewedIds.update(s => new Set(s).add(productId));
          this.toast.success('Review submitted — thank you!');
        },
        error: (err) => {
          this.submittingId.set(null);
          const msg = err?.error?.message || 'Could not submit review. You may have already reviewed this product.';
          this.toast.error(msg);
          if (err?.status === 409) {
            this.reviewedIds.update(s => new Set(s).add(productId));
          }
        }
      });
  }

  isDone(status: OrderStatus): boolean {
    const o = this.order();
    if (!o || o.orderStatus === 'Cancelled') return false;
    const flow = this.timelineSteps.map(s => s.status);
    const currentIdx = flow.indexOf(o.orderStatus as OrderStatus);
    const stepIdx = flow.indexOf(status);
    return currentIdx > stepIdx;
  }

  cancel(): void {
    const o = this.order();
    if (!o) return;
    if (!confirm(`Cancel order ${o.orderNumber}?`)) return;
    const reason = this.pickReason();
    if (reason === null) return;
    this.cancelling.set(true);
    this.orderService.cancelOrder(o.id, reason).subscribe(res => {
      this.cancelling.set(false);
      if (res.success) {
        this.order.set({ ...o, orderStatus: 'Cancelled', canCancel: false });
        this.countdown.set('');
      } else {
        alert(res.message);
      }
    });
  }

  private pickReason(): string | null {
    const reasons = [
      'Changed mind',
      'Found better price',
      'Ordered by mistake',
      'Delivery too slow',
      'Wrong item / details',
      'Payment issue',
      'Other'
    ];
    const choice = prompt(
      'Why are you cancelling?\n' + reasons.map((r, i) => `${i + 1}. ${r}`).join('\n') + '\n\nEnter number (1-7):'
    );
    if (!choice) return null;
    const idx = parseInt(choice, 10) - 1;
    if (idx >= 0 && idx < reasons.length) {
      if (reasons[idx] === 'Other') {
        return prompt('Please describe the reason:') || 'Other';
      }
      return reasons[idx];
    }
    return choice.trim() || 'Other';
  }

  private tick(): void {
    const o = this.order();
    if (!o) return;
    const ms = this.orderService.getRemainingMs(o);
    this.countdown.set(ms > 0 ? this.orderService.formatCountdown(ms) : '');
  }
}
