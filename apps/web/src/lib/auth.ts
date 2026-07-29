import { apiRequest } from "@/lib/api";
import type { User } from "@/types/auth";
import type { SignupValues, LoginValues } from "@/schemas/auth";

export function signup(data: SignupValues): Promise<User> {
    return apiRequest<User>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function login(data: LoginValues): Promise<User> {
    return apiRequest<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function logout(): Promise<void> {
    return apiRequest<void>("/api/auth/logout", {
        method: "POST",
    });
}

export function getCurrentUser(): Promise<User> {
    return apiRequest<User>("/api/auth/me");
}