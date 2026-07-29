"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export default function LogoutButton() {
    const router = useRouter()
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: logout,
        onSuccess: () => {
            queryClient.clear();
            router.push("/login");
        }
    })

    return (
        <button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
            {mutation.isPending ? "Logging out..." : "Log out"}
        </button>
    );
}