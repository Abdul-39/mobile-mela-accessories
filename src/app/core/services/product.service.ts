import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Product,
  Category,
  ProductFilter,
  PagedResult
} from '../models';

const MOCK_CATEGORIES: Category[] = [];

const MOCK_PRODUCTS: Product[] = [];

@Injectable({ providedIn: 'root' })
export class ProductService {

  private http = inject(HttpClient);

  /**
   * Real API is enabled.
   */
  private useMock = false;

  private readonly STORAGE_KEY = 'luxe_products_v1';
  private readonly CAT_STORAGE_KEY = 'luxe_categories_v1';

  private products: Product[] = this.loadProducts();
  private categories: Category[] = this.loadCategories();

  // ============================================================
  // LOCAL STORAGE
  // ============================================================

  private loadProducts(): Product[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as Product[];

        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    return [...MOCK_PRODUCTS];
  }

  private loadCategories(): Category[] {
    try {
      const raw = localStorage.getItem(this.CAT_STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as Category[];

        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    return [...MOCK_CATEGORIES];
  }

  private persist(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.products)
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  private persistCategories(): void {
    try {
      localStorage.setItem(
        this.CAT_STORAGE_KEY,
        JSON.stringify(this.categories)
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';
  }

  // ============================================================
  // CATEGORIES
  // ============================================================

  getCategories(): Observable<Category[]> {

    if (this.useMock) {

      const withCounts = this.categories.map(c => ({
        ...c,
        productCount: this.products.filter(
          p =>
            p.categoryId === c.id &&
            p.isActive
        ).length
      }));

      return of(withCounts).pipe(delay(150));
    }

    return this.http
      .get<any>(`${environment.apiUrl}/categories`)
      .pipe(
        map(r => r?.data ?? r ?? []),
        map(data => Array.isArray(data) ? data : []),
        catchError(error => {
          console.error(
            'Failed to load categories:',
            error
          );

          return of([]);
        })
      );
  }

  createCategory(
    data: Partial<Category>
  ): Observable<Category> {

    if (!this.useMock) {

      return this.http
        .post<any>(
          `${environment.apiUrl}/categories`,
          data
        )
        .pipe(
          map(r => r?.data ?? r)
        );
    }

    const id =
      Math.max(
        0,
        ...this.categories.map(c => c.id)
      ) + 1;

    const name =
      data.name || 'New Category';

    const cat: Category = {
      id,
      name,
      slug: this.slugify(name) + '-' + id,
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      isActive: data.isActive !== false,
      productCount: 0
    };

    this.categories = [
      ...this.categories,
      cat
    ];

    this.persistCategories();

    return of(cat).pipe(delay(300));
  }

  updateCategory(
    id: number,
    data: Partial<Category>
  ): Observable<Category | null> {

    if (!this.useMock) {

      return this.http
        .put<any>(
          `${environment.apiUrl}/categories/${id}`,
          data
        )
        .pipe(
          map(r => r?.data ?? r)
        );
    }

    const idx =
      this.categories.findIndex(
        c => c.id === id
      );

    if (idx < 0) {
      return of(null).pipe(delay(200));
    }

    const existing =
      this.categories[idx];

    const updated: Category = {
      ...existing,
      name:
        data.name ??
        existing.name,

      slug:
        data.name
          ? this.slugify(data.name) + '-' + id
          : existing.slug,

      description:
        data.description ??
        existing.description,

      imageUrl:
        data.imageUrl ??
        existing.imageUrl,

      isActive:
        data.isActive ??
        existing.isActive
    };

    this.categories =
      this.categories.map(c =>
        c.id === id
          ? updated
          : c
      );

    this.persistCategories();

    this.products =
      this.products.map(p =>
        p.categoryId === id
          ? {
              ...p,
              categoryName: updated.name
            }
          : p
      );

    this.persist();

    return of(updated).pipe(delay(300));
  }

  deleteCategory(
    id: number
  ): Observable<boolean> {

    if (!this.useMock) {

      return this.http
        .delete<any>(
          `${environment.apiUrl}/categories/${id}`
        )
        .pipe(
          map(r => r?.success !== false)
        );
    }

    const hasProducts =
      this.products.some(
        p => p.categoryId === id
      );

    if (hasProducts) {

      this.categories =
        this.categories.map(c =>
          c.id === id
            ? {
                ...c,
                isActive: false
              }
            : c
        );

      this.persistCategories();

      return of(true).pipe(delay(250));
    }

    this.categories =
      this.categories.filter(
        c => c.id !== id
      );

    this.persistCategories();

    return of(true).pipe(delay(250));
  }

  // ============================================================
  // PRODUCTS
  // ============================================================

  getProducts(
    filter: ProductFilter = {}
  ): Observable<PagedResult<Product>> {

    // ----------------------------------------------------------
    // MOCK
    // ----------------------------------------------------------

    if (this.useMock) {

      let list = [...this.products];

      if (filter.search) {

        const q =
          filter.search.toLowerCase();

        list = list.filter(p =>
          p.name
            .toLowerCase()
            .includes(q) ||

          p.brand
            ?.toLowerCase()
            .includes(q) ||

          p.sku
            .toLowerCase()
            .includes(q)
        );
      }

      if (filter.categoryId) {

        list = list.filter(
          p =>
            p.categoryId ===
            filter.categoryId
        );
      }

      if (filter.minPrice != null) {

        list = list.filter(
          p =>
            (p.discountPrice ??
              p.price) >=
            filter.minPrice!
        );
      }

      if (filter.maxPrice != null) {

        list = list.filter(
          p =>
            (p.discountPrice ??
              p.price) <=
            filter.maxPrice!
        );
      }

      if (filter.inStockOnly) {

        list = list.filter(
          p => p.stockQuantity > 0
        );
      }

      switch (filter.sortBy) {

        case 'price_asc':

          list.sort(
            (a, b) =>
              (a.discountPrice ?? a.price) -
              (b.discountPrice ?? b.price)
          );

          break;

        case 'price_desc':

          list.sort(
            (a, b) =>
              (b.discountPrice ?? b.price) -
              (a.discountPrice ?? a.price)
          );

          break;

        case 'popular':

          list.sort(
            (a, b) =>
              b.averageRating -
              a.averageRating
          );

          break;

        default:

          list.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );
      }

      const page =
        filter.page || 1;

      const pageSize =
        filter.pageSize || 12;

      const start =
        (page - 1) * pageSize;

      const items =
        list.slice(
          start,
          start + pageSize
        );

      return of({
        items,
        totalCount: list.length,
        page,
        pageSize,
        totalPages:
          Math.ceil(
            list.length / pageSize
          ) || 1
      }).pipe(delay(250));
    }

    // ----------------------------------------------------------
    // REAL API
    // ----------------------------------------------------------

    let params =
      new HttpParams();

    Object.entries(filter).forEach(
      ([key, value]) => {

        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          params =
            params.set(
              key,
              String(value)
            );
        }

      }
    );

    return this.http
      .get<any>(
        `${environment.apiUrl}/products`,
        { params }
      )
      .pipe(

        map(response => {

          const data =
            response?.data ??
            response;

          /*
           * Support both:
           *
           * {
           *   data: {
           *     items: [...]
           *   }
           * }
           *
           * and:
           *
           * {
           *   items: [...]
           * }
           */

          if (
            data &&
            Array.isArray(data.items)
          ) {
            return data;
          }

          /*
           * Also support APIs that simply
           * return an array.
           */

          if (Array.isArray(data)) {

            return {
              items: data,
              totalCount: data.length,
              page:
                filter.page || 1,
              pageSize:
                filter.pageSize ||
                data.length,
              totalPages: 1
            };
          }

          /*
           * Empty fallback
           */

          return {
            items: [],
            totalCount: 0,
            page:
              filter.page || 1,
            pageSize:
              filter.pageSize || 12,
            totalPages: 1
          };

        }),

        catchError(error => {

          console.error(
            'Failed to load products:',
            error
          );

          return of({
            items: [],
            totalCount: 0,
            page:
              filter.page || 1,
            pageSize:
              filter.pageSize || 12,
            totalPages: 1
          });

        })
      );
  }

  // ============================================================
  // PRODUCT BY ID
  // ============================================================

  getProductById(
    id: number
  ): Observable<Product | null> {

    if (this.useMock) {

      return of(
        this.products.find(
          p => p.id === id
        ) || null
      ).pipe(delay(150));
    }

    return this.http
      .get<any>(
        `${environment.apiUrl}/products/${id}`
      )
      .pipe(

        map(response =>
          response?.data ?? response
        ),

        catchError(error => {

          console.error(
            'Failed to load product:',
            error
          );

          return of(null);
        })
      );
  }

  // ============================================================
  // PRODUCT BY SLUG
  // ============================================================

  getProductBySlug(
    slug: string
  ): Observable<Product | null> {

    if (this.useMock) {

      const product =
        this.products.find(
          p => p.slug === slug
        ) || null;

      return of(product)
        .pipe(delay(200));
    }

    /*
     * Swagger confirms:
     *
     * GET /api/products/slug/{slug}
     */

    return this.http
      .get<any>(
        `${environment.apiUrl}/products/slug/${encodeURIComponent(slug)}`
      )
      .pipe(

        map(response =>
          response?.data ?? response
        ),

        catchError(error => {

          console.error(
            'Failed to load product by slug:',
            error
          );

          return of(null);
        })
      );
  }

  // ============================================================
  // FEATURED PRODUCTS
  // ============================================================

  getFeatured(): Observable<Product[]> {

    if (this.useMock) {

      return of(
        this.products.filter(
          p =>
            p.isFeatured &&
            p.isActive
        )
      ).pipe(delay(200));
    }

    /*
     * IMPORTANT:
     *
     * There is NO:
     *
     * GET /api/products/featured
     *
     * in your Swagger API.
     *
     * Therefore we use the existing
     * GET /api/products endpoint.
     *
     * We request a larger page and
     * filter featured products on the
     * frontend.
     */

    const params =
      new HttpParams()
        .set('page', '1')
        .set('pageSize', '100');

    return this.http
      .get<any>(
        `${environment.apiUrl}/products`,
        { params }
      )
      .pipe(

        map(response => {

          const data =
            response?.data ??
            response;

          const products: Product[] =
            Array.isArray(data)
              ? data
              : Array.isArray(data?.items)
                ? data.items
                : [];

          return products.filter(
            p =>
              p.isFeatured &&
              p.isActive
          );

        }),

        catchError(error => {

          console.error(
            'Failed to load featured products:',
            error
          );

          return of([]);
        })
      );
  }

  // ============================================================
  // RELATED PRODUCTS
  // ============================================================

  getRelated(
    productId: number,
    categoryId: number
  ): Observable<Product[]> {

    if (this.useMock) {

      return of(
        this.products
          .filter(
            p =>
              p.categoryId === categoryId &&
              p.id !== productId &&
              p.isActive
          )
          .slice(0, 4)
      ).pipe(delay(150));
    }

    /*
     * IMPORTANT:
     *
     * Your Swagger does NOT have:
     *
     * GET /api/products/{id}/related
     *
     * So we use the existing:
     *
     * GET /api/products
     *
     * and filter by category.
     */

    const params =
      new HttpParams()
        .set('categoryId', String(categoryId))
        .set('page', '1')
        .set('pageSize', '20');

    return this.http
      .get<any>(
        `${environment.apiUrl}/products`,
        { params }
      )
      .pipe(

        map(response => {

          const data =
            response?.data ??
            response;

          const products: Product[] =
            Array.isArray(data)
              ? data
              : Array.isArray(data?.items)
                ? data.items
                : [];

          return products
            .filter(
              p =>
                p.id !== productId &&
                p.isActive
            )
            .slice(0, 4);

        }),

        catchError(error => {

          console.error(
            'Failed to load related products:',
            error
          );

          return of([]);
        })
      );
  }

  // ============================================================
  // CREATE PRODUCT
  // ============================================================

  createProduct(
    data: Partial<Product> & {
      mainImageUrl?: string
    }
  ): Observable<Product> {

    if (!this.useMock) {

      return this.http
        .post<any>(
          `${environment.apiUrl}/products`,
          data
        )
        .pipe(
          map(r => r?.data ?? r)
        );
    }

    const cat =
      this.categories.find(
        c => c.id === data.categoryId
      );

    const id =
      Math.max(
        0,
        ...this.products.map(
          p => p.id
        )
      ) + 1;

    const name =
      data.name || 'Untitled';

    const imageUrl =
      data.mainImageUrl ||
      data.images?.[0]?.imageUrl ||
      '';

    const product: Product = {

      id,

      name,

      slug:
        this.slugify(name) +
        '-' +
        id,

      description:
        data.description || '',

      specifications:
        data.specifications || '',

      price:
        data.price ?? 0,

      discountPrice:
        data.discountPrice ?? null,

      stockQuantity:
        data.stockQuantity ?? 0,

      lowStockThreshold:
        data.lowStockThreshold ?? 5,

      sku:
        data.sku ||
        `SKU-${id}`,

      brand:
        data.brand || '',

      categoryId:
        data.categoryId || 10,

      categoryName:
        cat?.name ||
        'Other Accessories',

      isFeatured:
        !!data.isFeatured,

      isActive:
        data.isActive !== false,

      averageRating: 0,

      reviewCount: 0,

      images:
        imageUrl
          ? [{
              id: id * 10,
              productId: id,
              imageUrl,
              isMain: true,
              sortOrder: 0
            }]
          : [],

      colors:
        data.colors || [],

      createdAt:
        new Date().toISOString()
    };

    this.products = [
      product,
      ...this.products
    ];

    this.persist();

    return of(product)
      .pipe(delay(400));
  }

  // ============================================================
  // UPDATE PRODUCT
  // ============================================================

  updateProduct(
    id: number,
    data: Partial<Product> & {
      mainImageUrl?: string
    }
  ): Observable<Product | null> {

    if (!this.useMock) {

      return this.http
        .put<any>(
          `${environment.apiUrl}/products/${id}`,
          data
        )
        .pipe(
          map(r => r?.data ?? r)
        );
    }

    const idx =
      this.products.findIndex(
        p => p.id === id
      );

    if (idx < 0) {
      return of(null)
        .pipe(delay(200));
    }

    const existing =
      this.products[idx];

    const cat =
      this.categories.find(
        c =>
          c.id ===
          (data.categoryId ??
            existing.categoryId)
      );

    const existingImages =
      existing.images ?? [];

    const imageUrl =
      data.mainImageUrl ||
      existingImages.find(
        i => i.isMain
      )?.imageUrl ||
      '';

    const updated: Product = {

      ...existing,

      name:
        data.name ??
        existing.name,

      slug:
        data.name
          ? this.slugify(data.name) +
            '-' +
            id
          : existing.slug,

      description:
        data.description ??
        existing.description,

      specifications:
        data.specifications ??
        existing.specifications,

      price:
        data.price ??
        existing.price,

      discountPrice:
        data.discountPrice !== undefined
          ? data.discountPrice
          : existing.discountPrice,

      stockQuantity:
        data.stockQuantity ??
        existing.stockQuantity,

      lowStockThreshold:
        data.lowStockThreshold ??
        existing.lowStockThreshold,

      sku:
        data.sku ??
        existing.sku,

      brand:
        data.brand ??
        existing.brand,

      categoryId:
        data.categoryId ??
        existing.categoryId,

      categoryName:
        cat?.name ||
        existing.categoryName,

      isFeatured:
        data.isFeatured ??
        existing.isFeatured,

      isActive:
        data.isActive ??
        existing.isActive,

      colors:
        data.colors ??
        existing.colors,

      images:
        imageUrl
          ? [{
              id: id * 10,
              productId: id,
              imageUrl,
              isMain: true,
              sortOrder: 0
            }]
          : existingImages
    };

    this.products =
      this.products.map(p =>
        p.id === id
          ? updated
          : p
      );

    this.persist();

    return of(updated)
      .pipe(delay(400));
  }

  // ============================================================
  // DELETE PRODUCT
  // ============================================================

  deleteProduct(
    id: number
  ): Observable<boolean> {

    if (!this.useMock) {

      return this.http
        .delete<any>(
          `${environment.apiUrl}/products/${id}`
        )
        .pipe(
          map(
            r => r?.success !== false
          )
        );
    }

    this.products =
      this.products.filter(
        p => p.id !== id
      );

    this.persist();

    return of(true)
      .pipe(delay(250));
  }

  // ============================================================
  // UPLOAD PRODUCT IMAGE
  // ============================================================

  uploadImage(
    file: File
  ): Observable<{ imageUrl: string }> {

    if (this.useMock) {

      return new Observable(
        observer => {

          const reader =
            new FileReader();

          reader.onload = () => {

            observer.next({
              imageUrl:
                reader.result as string
            });

            observer.complete();
          };

          reader.onerror = () => {
            observer.error(
              reader.error
            );
          };

          reader.readAsDataURL(file);
        }
      );
    }

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    /*
     * Swagger confirms:
     *
     * POST /api/products/upload
     */

    return this.http
      .post<{ imageUrl: string }>(
        `${environment.apiUrl}/products/upload`,
        formData
      );
  }
}
