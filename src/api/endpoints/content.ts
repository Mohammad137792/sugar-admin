import client from "../client";
import type { ApiResponse, ContentItem, PaginatedResponse } from "../../types";

export const contentApi = {
  list: (page = 1, limit = 20) =>
    client.get<PaginatedResponse<ContentItem>>("/content", { params: { page, limit } }),

  get: (id: string) =>
    client.get<ApiResponse<ContentItem>>(`/content/${id}`),

  create: (payload: Partial<ContentItem>) =>
    client.post<ApiResponse<ContentItem>>("/content", payload),

  update: (id: string, payload: Partial<ContentItem>) =>
    client.put<ApiResponse<ContentItem>>(`/content/${id}`, payload),

  delete: (id: string) =>
    client.delete<ApiResponse<null>>(`/content/${id}`),
};
