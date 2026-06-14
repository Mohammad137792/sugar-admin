import client from "../client";
import type { ApiResponse, Stat } from "../../types";

export const reportsApi = {
  summary: () =>
    client.get<ApiResponse<{ stats: Stat[]; updatedAt: string }>>("/reports/summary"),

  detail: (from: string, to: string) =>
    client.get<ApiResponse<Stat[]>>("/reports/detail", { params: { from, to } }),
};
