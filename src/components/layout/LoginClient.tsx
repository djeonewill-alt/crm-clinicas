"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Preencha email e senha.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          setErrorMessage("Email ou senha incorretos.");
        } else if (error.message === "Email not confirmed") {
          setErrorMessage("Email não confirmado. Fale com o administrador.");
        } else {
          setErrorMessage(error.message);
        }

        setLoading(false);
        return;
      }

      router.replace("/comercial/trabalho");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro de conexão. Tente novamente."
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-5 text-[var(--text)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-3xl">✦</div>
          <h1 className="text-2xl font-semibold text-[var(--accent)]">
            CRM Estética
          </h1>
          <p className="mt-1 text-sm text-[var(--text3)]">
            Acesse sua conta
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-[var(--border2)] bg-[var(--bg2)] p-6"
        >
          <div className="mb-4">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
              Email
            </label>
            <input
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="mb-5">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
              Senha
            </label>
            <input
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--accent)]"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--accent2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          <p className="mt-5 text-center text-xs text-[var(--text3)]">
            Use o mesmo login cadastrado no Supabase.
          </p>
        </form>
      </div>
    </div>
  );
}
