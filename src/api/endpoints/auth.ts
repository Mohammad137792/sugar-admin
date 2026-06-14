import client from "../client";
import type { ApiResponse, AuthTokens, LoginCredentials, User } from "../../types";

export const authApi = {
  login: (credentials: LoginCredentials) =>
    client.post<ApiResponse<{ user: User; tokens: AuthTokens }>>("/auth/login", credentials),

  logout: () => client.post("/auth/logout"),

  refreshToken: (refreshToken: string) =>
    client.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),

  me: () => client.get<ApiResponse<User>>("/auth/me"),
};
