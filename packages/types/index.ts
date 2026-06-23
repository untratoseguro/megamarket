// Tipos compartidos entre web y api
// Se expanden en fases posteriores

export type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export type HealthResponse = {
  status: "ok";
  app: string;
  version: string;
  environment: string;
};
