import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable,
  of,
  delay,
  map,
  catchError
} from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  Product,
  Category,
  ProductFilter,
  PagedResult
} from '../models';

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_CATEGORIES: Category[] = [];

const MOCK_PRODUCTS: Product[] = [];

// ============================================================
// PRODUCT SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly http = inject(HttpClient);

  /**
   * Set to true only when using local/mock data.
   */
  private readonly useMock = false;

  private readonly STORAGE_KEY =
    'luxe_products_v1';

  private readonly CAT_STORAGE_KEY =
    'luxe_categories_v1';

  private products: Product[] =
    this.loadProducts();

  private categories: Category[] =
    this.loadCategories();

  // ============================================================
  // LOCAL STORAGE
  // ============================================================

  private loadProducts(): Product[] {

    try {

      const raw =
        localStorage.getItem(
          this.STORAGE_KEY
        );

      if (raw) {

        const parsed =
          JSON.parse(raw) as Product[];

        if (
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {
          return parsed;
        }
      }

    } catch (error) {

      console.warn(
        'Could not load products from localStorage:',
        error
      );
    }

    return [...MOCK_PRODUCTS];
  }

  private loadCategories(): Category[] {

    try {

      const raw =
        localStorage.getItem(
          this.CAT_STORAGE_KEY
        );

      if (raw) {

        const parsed =
          JSON.parse(raw) as Category[];

        if (
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {
          return parsed;
        }
      }

    } catch (error) {

      console.warn(
        'Could not load categories from localStorage:',
        error
      );
    }

    return [...MOCK_CATEGORIES];
  }

  private persist(): void {

    try {

      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.products)
      );

    } catch (error) {

      console.warn(
        'Could not persist products:',
        error
      );
    }
  }

  private persistCategories(): void {

    try {

      localStorage.setItem(
        this.CAT_STORAGE_KEY,
        JSON.stringify(this.categories)
      );

    } catch (error) {

      console.warn(
        'Could not persist categories:',
        error
      );
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private slugify(name: string): string {

    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      || 'product';
  }

  /**
   * Safely unwrap API responses.
   *
   * Supports:
   *
   * { data: {...} }
   *
   * and:
   *
   * {...}
   */
  private unwrap<T>(response: any): T {

    return (
      response?.data ??
      response
    ) as T;
  }

  /**
   * Normalize different product-list API formats
   * into the PagedResult<Product> structure.
   */
  private normalizePagedProducts(
    response: any,
    filter: ProductFilter
  ): PagedResult<Product> {

    const data =
      response?.data ??
      response;

    // ----------------------------------------------------------
    // API returns paginated object
    // ----------------------------------------------------------

    if (
      data &&
      Array.isArray(data.items)
    ) {

      const page =
        data.page ??
        filter.page ??
        1;

      const pageSize =
        data.pageSize ??
        filter.pageSize ??
        data.items.length ??
        12;

      const totalCount =
        data.totalCount ??
        data.items.length;

      const totalPages =
        data.totalPages ??
        (
          Math.ceil(
            totalCount /
            (pageSize || 1)
          ) || 1
        );

      return {

        items:
          data.items,

        totalCount,

        page,

        pageSize,

        totalPages
      };
    }

    // ----------------------------------------------------------
    // API returns a plain array
    // ----------------------------------------------------------

    if (Array.isArray(data)) {

      const page =
        filter.page || 1;

      const pageSize =
        filter.pageSize ||
        data.length ||
        12;

      return {

        items:
          data,

        totalCount:
          data.length,

        page,

        pageSize,

        totalPages:
          Math.ceil(
            data.length /
            pageSize
          ) || 1
      };
    }

    // ----------------------------------------------------------
    // Empty fallback
    // ----------------------------------------------------------

    return {

      items: [],

      totalCount: 0,

      page:
        filter.page || 1,

      pageSize:
        filter.pageSize || 12,

      totalPages: 1
    };
  }

  // ============================================================
  // CATEGORIES
  // ============================================================

  getCategories(): Observable<Category[]> {

    if (this.useMock) {

      const withCounts =
        this.categories.map(
          category => ({

            ...category,

            productCount:
              this.products.filter(
                product =>
                  product.categoryId ===
                    category.id &&
                  product.isActive
              ).length
          })
        );

      return of(withCounts)
        .pipe(delay(150));
    }

    return this.http
      .get<any>(
        `${environment.apiUrl}/categories`
      )
      .pipe(

        map(response =>
          this.unwrap<Category[]>(
            response
          )
        ),

        map(data =>
          Array.isArray(data)
            ? data
            : []
        ),

        catchError(error => {

          console.error(
            'Failed to load categories:',
            error
          );

          return of([]);
        })
      );
  }

  // ============================================================
  // CREATE CATEGORY
  // ============================================================

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

          map(response =>
            this.unwrap<Category>(
              response
            )
          )
        );
    }

    const id =
      Math.max(
        0,
        ...this.categories.map(
          category =>
            category.id
        )
      ) + 1;

    const name =
      data.name ||
      'New Category';

    const category: Category = {

      id,

      name,

      slug:
        this.slugify(name) +
        '-' +
        id,

      description:
        data.description ||
        '',

      imageUrl:
        data.imageUrl ||
        '',

      isActive:
        data.isActive !== false,

      productCount: 0
    };

    this.categories = [
      ...this.categories,
      category
    ];

    this.persistCategories();

    return of(category)
      .pipe(delay(300));
  }

  // ============================================================
  // UPDATE CATEGORY
  // ============================================================

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

          map(response =>
            this.unwrap<Category>(
              response
            )
          )
        );
    }

    const index =
      this.categories.findIndex(
        category =>
          category.id === id
      );

    if (index < 0) {

      return of(null)
        .pipe(delay(200));
    }

    const existing =
      this.categories[index];

    const updated: Category = {

      ...existing,

      name:
        data.name ??
        existing.name,

      slug:
        data.name
          ? this.slugify(
              data.name
            ) +
            '-' +
            id
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
      this.categories.map(
        category =>
          category.id === id
            ? updated
            : category
      );

    this.persistCategories();

    this.products =
      this.products.map(
        product =>
          product.categoryId === id
            ? {
                ...product,
                categoryName:
                  updated.name
              }
            : product
      );

    this.persist();

    return of(updated)
      .pipe(delay(300));
  }

  // ============================================================
  // DELETE CATEGORY
  // ============================================================

  deleteCategory(
    id: number
  ): Observable<boolean> {

    if (!this.useMock) {

      return this.http
        .delete<any>(
          `${environment.apiUrl}/categories/${id}`
        )
        .pipe(

          map(response =>
            response?.success !== false
          ),

          catchError(error => {

            console.error(
              'Failed to delete category:',
              error
            );

            return of(false);
          })
        );
    }

    const hasProducts =
      this.products.some(
        product =>
          product.categoryId === id
      );

    if (hasProducts) {

      this.categories =
        this.categories.map(
          category =>
            category.id === id
              ? {
                  ...category,
                  isActive: false
                }
              : category
        );

      this.persistCategories();

      return of(true)
        .pipe(delay(250));
    }

    this.categories =
      this.categories.filter(
        category =>
          category.id !== id
      );

    this.persistCategories();

    return of(true)
      .pipe(delay(250));
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

      let list = [
        ...this.products
      ];

      // Search

      if (filter.search) {

        const query =
          filter.search
            .toLowerCase()
            .trim();

        list =
          list.filter(
            product =>
              product.name
                .toLowerCase()
                .includes(query) ||

              product.sku
                .toLowerCase()
                .includes(query) ||

              (
                product.brand
                  ?.toLowerCase()
                  .includes(query) ??
                false
              )
          );
      }

      // Category

      if (
        filter.categoryId != null
      ) {

        list =
          list.filter(
            product =>
              product.categoryId ===
              filter.categoryId
          );
      }

      // Minimum price

      if (
        filter.minPrice != null
      ) {

        list =
          list.filter(
            product =>
              (
                product.discountPrice ??
                product.price
              ) >=
              filter.minPrice!
          );
      }

      // Maximum price

      if (
        filter.maxPrice != null
      ) {

        list =
          list.filter(
            product =>
              (
                product.discountPrice ??
                product.price
              ) <=
              filter.maxPrice!
          );
      }

      // In stock

      if (filter.inStockOnly) {

        list =
          list.filter(
            product =>
              product.stockQuantity > 0
          );
      }

      // Sorting

      switch (filter.sortBy) {

        case 'price_asc':

          list.sort(
            (a, b) =>
              (
                a.discountPrice ??
                a.price
              ) -
              (
                b.discountPrice ??
                b.price
              )
          );

          break;

        case 'price_desc':

          list.sort(
            (a, b) =>
              (
                b.discountPrice ??
                b.price
              ) -
              (
                a.discountPrice ??
                a.price
              )
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
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          );
      }

      // Pagination

      const page =
        filter.page || 1;

      const pageSize =
        filter.pageSize || 12;

      const start =
        (
          page - 1
        ) *
        pageSize;

      const items =
        list.slice(
          start,
          start + pageSize
        );

      return of({

        items,

        totalCount:
          list.length,

        page,

        pageSize,

        totalPages:
          Math.ceil(
            list.length /
            pageSize
          ) || 1

      }).pipe(
        delay(250)
      );
    }

    // ----------------------------------------------------------
    // REAL API
    // ----------------------------------------------------------

    let params =
      new HttpParams();

    Object.entries(filter)
      .forEach(
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
        {
          params
        }
      )
      .pipe(

        map(response =>
          this.normalizePagedProducts(
            response,
            filter
          )
        ),

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
          product =>
            product.id === id
        ) || null
      ).pipe(
        delay(150)
      );
    }

    return this.http
      .get<any>(
        `${environment.apiUrl}/products/${id}`
      )
      .pipe(

        map(response =>
          this.unwrap<Product | null>(
            response
          )
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
          item =>
            item.slug === slug
        ) || null;

      return of(product)
        .pipe(
          delay(200)
        );
    }

    return this.http
      .get<any>(
        `${environment.apiUrl}/products/slug/${encodeURIComponent(slug)}`
      )
      .pipe(

        map(response =>
          this.unwrap<Product | null>(
            response
          )
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
          product =>
            product.isFeatured &&
            product.isActive
        )
      ).pipe(
        delay(200)
      );
    }

    const params =
      new HttpParams()
        .set(
          'page',
          '1'
        )
        .set(
          'pageSize',
          '100'
        );

    return this.http
      .get<any>(
        `${environment.apiUrl}/products`,
        {
          params
        }
      )
      .pipe(

        map(response => {

          const data =
            response?.data ??
            response;

          const products: Product[] =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.items
                )
                ? data.items
                : [];

          return products.filter(
            product =>
              product.isFeatured &&
              product.isActive
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
            product =>
              product.categoryId ===
                categoryId &&
              product.id !==
                productId &&
              product.isActive
          )
          .slice(0, 4)
      ).pipe(
        delay(150)
      );
    }

    const params =
      new HttpParams()
        .set(
          'categoryId',
          String(categoryId)
        )
        .set(
          'page',
          '1'
        )
        .set(
          'pageSize',
          '20'
        );

    return this.http
      .get<any>(
        `${environment.apiUrl}/products`,
        {
          params
        }
      )
      .pipe(

        map(response => {

          const data =
            response?.data ??
            response;

          const products: Product[] =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.items
                )
                ? data.items
                : [];

          return products
            .filter(
              product =>
                product.id !==
                  productId &&
                product.isActive
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
      mainImageUrl?: string;
    }
  ): Observable<Product> {

    if (!this.useMock) {

      return this.http
        .post<any>(
          `${environment.apiUrl}/products`,
          data
        )
        .pipe(

          map(response =>
            this.unwrap<Product>(
              response
            )
          )
        );
    }

    const category =
      this.categories.find(
        item =>
          item.id ===
          data.categoryId
      );

    const id =
      Math.max(
        0,
        ...this.products.map(
          product =>
            product.id
        )
      ) + 1;

    const name =
      data.name ||
      'Untitled';

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
        data.description ||
        '',

      specifications:
        data.specifications ||
        '',

      price:
        data.price ??
        0,

      discountPrice:
        data.discountPrice ??
        null,

      stockQuantity:
        data.stockQuantity ??
        0,

      lowStockThreshold:
        data.lowStockThreshold ??
        5,

      sku:
        data.sku ||
        `SKU-${id}`,

      brand:
        data.brand ||
        '',

      categoryId:
        data.categoryId ??
        10,

      categoryName:
        category?.name ||
        'Other Accessories',

      isFeatured:
        !!data.isFeatured,

      isActive:
        data.isActive !== false,

      averageRating: 0,

      reviewCount: 0,

      images:
        imageUrl
          ? [
              {
                id:
                  id * 10,

                productId:
                  id,

                imageUrl,

                isMain:
                  true,

                sortOrder:
                  0
              }
            ]
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
      .pipe(
        delay(400)
      );
  }

  // ============================================================
  // UPDATE PRODUCT
  // ============================================================

  updateProduct(
    id: number,
    data: Partial<Product> & {
      mainImageUrl?: string;
    }
  ): Observable<Product | null> {

    if (!this.useMock) {

      return this.http
        .put<any>(
          `${environment.apiUrl}/products/${id}`,
          data
        )
        .pipe(

          map(response =>
            this.unwrap<Product | null>(
              response
            )
          )
        );
    }

    const index =
      this.products.findIndex(
        product =>
          product.id === id
      );

    if (index < 0) {

      return of(null)
        .pipe(
          delay(200)
        );
    }

    const existing =
      this.products[index];

    const category =
      this.categories.find(
        item =>
          item.id ===
          (
            data.categoryId ??
            existing.categoryId
          )
      );

    const existingImages =
      existing.images ?? [];

    const existingMainImage =
      existingImages.find(
        image =>
          image.isMain
      )?.imageUrl || '';

    const imageUrl =
      data.mainImageUrl ||
      existingMainImage;

    const updated: Product = {

      ...existing,

      name:
        data.name ??
        existing.name,

      slug:
        data.name
          ? this.slugify(
              data.name
            ) +
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
        data.discountPrice !==
        undefined
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
        category?.name ||
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
          ? [
              {
                id:
                  id * 10,

                productId:
                  id,

                imageUrl,

                isMain:
                  true,

                sortOrder:
                  0
              }
            ]
          : existingImages
    };

    this.products =
      this.products.map(
        product =>
          product.id === id
            ? updated
            : product
      );

    this.persist();

    return of(updated)
      .pipe(
        delay(400)
      );
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

          map(response =>
            response?.success !== false
          ),

          catchError(error => {

            console.error(
              'Failed to delete product:',
              error
            );

            return of(false);
          })
        );
    }

    const exists =
      this.products.some(
        product =>
          product.id === id
      );

    if (!exists) {

      return of(false)
        .pipe(
          delay(250)
        );
    }

    this.products =
      this.products.filter(
        product =>
          product.id !== id
      );

    this.persist();

    return of(true)
      .pipe(
        delay(250)
      );
  }

  // ============================================================
  // UPLOAD PRODUCT IMAGE
  // ============================================================

  uploadImage(
    file: File
  ): Observable<{
    imageUrl: string;
  }> {

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

          reader.readAsDataURL(
            file
          );
        }
      );
    }

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    return this.http
      .post<any>(
        `${environment.apiUrl}/products/upload`,
        formData
      )
      .pipe(

        map(response => {

          const data =
            response?.data ??
            response;

          return {

            imageUrl:
              data?.imageUrl ||
              ''

          };
        }),

        catchError(error => {

          console.error(
            'Failed to upload product image:',
            error
          );

          throw error;
        })
      );
  }
}
