import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <main class="page-enter auth-page">
      <div class="auth-card card">
        <h1>Create account</h1>
        <p class="subtitle">Join us for a smoother shopping experience</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input class="form-control" formControlName="name" placeholder="Your name" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" formControlName="email" placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" class="form-control" formControlName="phone" placeholder="03XX-XXXXXXX" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" formControlName="password" placeholder="Min 6 characters" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input type="password" class="form-control" formControlName="confirmPassword" placeholder="Repeat password" />
          </div>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating...' : 'Create Account' }}
          </button>
        </form>

        <p class="footer-text">
          Already have an account? <a routerLink="/auth/login">Sign in</a>
        </p>
      </div>
    </main>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 68px); display: flex; align-items: center; justify-content: center;
      padding: 2rem 1rem; background: linear-gradient(160deg, var(--color-blush), var(--color-cream));
    }
    .auth-card { width: 100%; max-width: 420px; padding: 2.5rem 2rem; }
    h1 { font-size: 1.75rem; margin-bottom: 0.35rem; text-align: center; }
    .subtitle { text-align: center; color: var(--color-text-muted); margin-bottom: 1.75rem; }
    .error { color: var(--color-danger); font-size: 0.9rem; margin-bottom: 1rem; }
    .footer-text { text-align: center; margin-top: 1.25rem; font-size: 0.9rem; color: var(--color-text-muted); }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatch });

  private passwordMatch(group: AbstractControl) {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    return p === c ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      if (this.form.hasError('mismatch')) this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { name, email, phone, password, confirmPassword } = this.form.getRawValue();

    this.auth.register({ name, email, phone, password, confirmPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Account created successfully');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Registration failed. Please try again.');
        this.toast.error('Registration failed');
      }
    });
  }
}