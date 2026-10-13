
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export async function cadastrarUsuario(
  email: string,
  senha: string
) {
  const emailNormalizado = email.trim().toLowerCase();

  if (!emailNormalizado || !emailNormalizado.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }

  if (senha.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: emailNormalizado,
    password: senha,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
    precisaConfirmarEmail: data.user !== null && data.session === null,
  };
}

export async function entrarUsuario(
  email: string,
  senha: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function sairUsuario(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function recuperarSenha(email: string): Promise<void> {
  const emailNormalizado = email.trim().toLowerCase();

  if (!emailNormalizado || !emailNormalizado.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    emailNormalizado
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function obterSessaoAtual(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export function observarSessao(
  callback: (session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session);
    }
  );

  return data.subscription;
}
