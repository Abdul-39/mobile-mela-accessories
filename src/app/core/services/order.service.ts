
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  Order,
  OrderStatus,
  CreateOrderRequest
} from '../models';

import { ToastService } from './toast.service';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private toast = inject(ToastService);
  private http = inject(HttpClient);

  private readonly ordersUrl =
    `${environment.apiUrl}/orders`;

  /**
   * Create a real order in the backend.
   *
   * POST:
   * /api/orders
   */
  createOrder(
    payload: CreateOrderRequest
  ): Observable<Order> {

    return this.http
      .post<ApiEnvelope<Order> | Order>(
        this.ordersUrl,
        payload
      )
      .pipe(

        map(response => {

          console.log(
            'CREATE ORDER RESPONSE:',
            response
          );

          /*
           * Expected backend response:
           *
           * {
           *   success: true,
           *   message: "Order created successfully",
           *   data: { ...order }
           * }
           *
           * Also supports a direct Order response.
           */
          if (
            response &&
            typeof response === 'object' &&
            'data' in response &&
            response.data
          ) {
            return response.data;
          }

          return response as Order;
        }),

        map(order => {

          if (!order || !order.id) {

            throw new Error(
              'Backend did not return a valid order.'
            );
          }

          return order;
        }),

        catchError(error => {

          console.error(
            'CREATE ORDER ERROR:',
            error
          );

          const message =
            error?.error?.message ||
            error?.error?.errors?.[0] ||
            error?.message ||
            'Failed to place order.';

          this.toast.error(message);

          throw error;
        })
      );
  }

  /**
   * Get all orders belonging to
   * the currently logged-in customer.
   *
   * GET:
   * /api/orders/mine
   */
  getMyOrders(): Observable<Order[]> {

    return this.http
      .get<ApiEnvelope<Order[]> | Order[]>(
        `${this.ordersUrl}/mine`
      )
      .pipe(

        map(response => {

          console.log(
            'MY ORDERS RESPONSE:',
            response
          );

          if (
            response &&
            typeof response === 'object' &&
            'data' in response
          ) {

            return Array.isArray(response.data)
              ? response.data
              : [];
          }

          return Array.isArray(response)
            ? response
            : [];
        }),

        map(orders => {

          return [...orders].sort(
            (a, b) =>
              new Date(b.orderDate).getTime() -
              new Date(a.orderDate).getTime()
          );

        }),

        catchError(error => {

          console.error(
            'GET MY ORDERS ERROR:',
            error
          );

          const message =
            error?.error?.message ||
            'Could not load your orders.';

          this.toast.error(message);

          return of([]);
        })
      );
  }

  /**
   * Get one order by database ID.
   *
   * GET:
   * /api/orders/{id}
   */
  getOrder(
    id: number
  ): Observable<Order | null> {

    return this.http
      .get<ApiEnvelope<Order> | Order>(
        `${this.ordersUrl}/${id}`
      )
      .pipe(

        map(response => {

          console.log(
            'GET ORDER RESPONSE:',
            response
          );

          if (
            response &&
            typeof response === 'object' &&
            'data' in response &&
            response.data
          ) {

            return response.data;
          }

          return response as Order;
        }),

        catchError(error => {

          console.error(
            'GET ORDER ERROR:',
            error
          );

          return of(null);
        })
      );
  }

  /**
   * Cancel an order.
   *
   * POST:
   * /api/orders/{id}/cancel
   */
  cancelOrder(
    id: number,
    reason?: string
  ): Observable<{
    success: boolean;
    message: string;
  }> {

    return this.http
      .post<ApiEnvelope<Order>>(
        `${this.ordersUrl}/${id}/cancel`,
        {
          reason: reason || null
        }
      )
      .pipe(

        map(response => {

          if (response.success) {

            this.toast.success(
              response.message ||
              'Order cancelled successfully'
            );

          } else {

            this.toast.error(
              response.message ||
              'Cancellation failed'
            );
          }

          return {
            success: response.success,
            message: response.message
          };
        }),

        catchError(error => {

          console.error(
            'CANCEL ORDER ERROR:',
            error
          );

          const message =
            error?.error?.message ||
            'Cancellation failed';

          this.toast.error(message);

          return of({
            success: false,
            message
          });
        })
      );
  }

  /**
   * Returns remaining milliseconds
   * until the cancellation deadline.
   */
  getRemainingMs(
    order: Order
  ): number {

    if (!order.canCancel) {
      return 0;
    }

    const blocked: OrderStatus[] = [
      'Shipped',
      'OutForDelivery',
      'Delivered',
      'Cancelled',
      'Returned',
      'Refunded'
    ];

    if (
      blocked.includes(order.orderStatus)
    ) {
      return 0;
    }

    return Math.max(
      0,
      new Date(
        order.cancellationDeadline
      ).getTime() - Date.now()
    );
  }

  /**
   * Format cancellation countdown.
   */
  formatCountdown(
    ms: number
  ): string {

    if (ms <= 0) {
      return '';
    }

    const totalSec =
      Math.floor(ms / 1000);

    const hours =
      Math.floor(totalSec / 3600);

    const minutes =
      Math.floor(
        (totalSec % 3600) / 60
      );

    const seconds =
      totalSec % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }
}

