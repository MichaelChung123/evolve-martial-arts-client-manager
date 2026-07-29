import LoginForm from "@/components/auth/login-form";


export default function LoginPage() {
    return (
        <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                <section>
                    <LoginForm />
                </section>
            </div>
        </main>
    );
}