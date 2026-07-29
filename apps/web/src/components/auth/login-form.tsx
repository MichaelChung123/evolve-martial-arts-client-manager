"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { type LoginValues, loginSchema } from "@/schemas/auth";

import { ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import Link from "next/link";

export default function LoginForm() {
    const { register, handleSubmit, setError, formState: { errors, isSubmitting }, } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
    const router = useRouter()

    const mutation = useMutation({
        mutationFn: login,
        onSuccess: () => {
            router.push("/");
        }
    })

    const onSubmit = async (data: LoginValues) => {
        try {
            await mutation.mutateAsync(data);
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                setError("root", { type: "server", message: error.message });
                return;
            }

            setError("root", { type: "server", message: "An unexpected error occurred. Please try again later." });
        }
    }

    const fieldClassName =
        "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

    const errorClassName =
        "mt-1 text-sm text-red-700";


    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-lg border border-zinc-200 bg-white p-6"
        >
            <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        Email
                    </span>

                    <input
                        type="email"
                        {...register("email")}
                        className={fieldClassName}
                    />

                    {errors.email && (
                        <p className={errorClassName}>
                            {errors.email.message}
                        </p>
                    )}
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        Password
                    </span>

                    <input
                        type="password"
                        {...register("password")}
                        className={fieldClassName}
                    />

                    {errors.password && (
                        <p className={errorClassName}>
                            {errors.password.message}
                        </p>
                    )}
                </label>
            </div>

            <Link href="/signup" className="text-sm text-blue-600 hover:underline">
                Need an account? Sign up
            </Link>

            {errors.root && (
                <div className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    {errors.root.message}
                </div>
            )}

            {mutation.isSuccess && (
                <div className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-800">
                    Login successful! Redirecting...
                </div>
            )}

            <div className="mt-6">
                <button
                    type="submit"
                    disabled={isSubmitting || mutation.isPending}
                    className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {mutation.isPending
                        ? "Logging in..."
                        : "Log in"}
                </button>
            </div>
        </form>
    )
};