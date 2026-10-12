/**
 * Типи даних застосунку. Описують контракт із mock-API (MSW) так само, як це
 * робила б схема реального бекенду, тому заміна mock-API на справжній сервер
 * не потребує правок у компонентах.
 */

export type Role = 'manager' | 'analyst' | 'admin';

export const ROLE_LABELS: Record<Role, string> = {
  manager: 'Менеджер',
  analyst: 'Аналітик',
  admin: 'Адміністратор',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  manager: 'Власні замовлення, прогноз і перерахунок',
  analyst: 'Додатково розділ «Аналітика»: метрики моделі та важливість ознак',
  admin: 'Керування користувачами й ролями',
};

export const ROLE_OPTIONS: readonly Role[] = ['manager', 'analyst', 'admin'];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type OrderStatus = 'new' | 'in_progress' | 'negotiation' | 'at_risk' | 'won' | 'lost';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Нове',
  in_progress: 'В роботі',
  negotiation: 'Погодження умов',
  at_risk: 'Під загрозою',
  won: 'Виграно',
  lost: 'Втрачено',
};

export type OrderSortBy = 'createdAt' | 'amount';
export type OrderSortDir = 'asc' | 'desc';

export interface Customer {
  id: string;
  name: string;
  industry: string;
  /** Клас клієнта: 1 - стратегічний, 3 - новий. */
  tier: 1 | 2 | 3;
}

export interface ForecastFactor {
  code: string;
  label: string;
  value: string;
  /** Внесок ознаки у логарифм шансів: додатний підвищує ймовірність. */
  contribution: number;
  direction: 'up' | 'down';
  /** Частка внеску в загальній вазі факторів, 0..1. */
  weight: number;
}

export interface ForecastHistoryEntry {
  id: string;
  at: string;
  fromProbability: number;
  toProbability: number;
  source: 'auto' | 'manual';
  author: string;
  note: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  managerId: string;
  managerName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  itemsCount: number;
  createdAt: string;
  expectedCloseDate: string;
  updatedAt: string;
  probability: number;
  forecastUpdatedAt: string;
  factors: ForecastFactor[];
  history: ForecastHistoryEntry[];
}

export interface OrdersResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface CustomersResponse {
  items: Customer[];
}

export type MetricFormat = 'percent' | 'number';

export interface ModelKpi {
  key: string;
  label: string;
  value: number;
  format: MetricFormat;
  hint: string;
}

export interface FeatureImportance {
  feature: string;
  label: string;
  importance: number;
}

export interface MetricTrendPoint {
  period: string;
  rocAuc: number;
  f1: number;
  precision: number;
}

export interface AnalyticsResponse {
  modelVersion: string;
  trainedAt: string;
  sampleSize: number;
  kpis: ModelKpi[];
  featureImportance: FeatureImportance[];
  trend: MetricTrendPoint[];
}

export type UserStatus = 'active' | 'blocked';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string;
  ordersCount: number;
}

export interface UsersResponse {
  items: UserAccount[];
}

export interface UpdateUserRoleResponse {
  user: UserAccount;
  message: string;
}

export interface ErrorResponse {
  message: string;
}
