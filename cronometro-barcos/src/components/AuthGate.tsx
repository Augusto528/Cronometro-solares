
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  cadastrarUsuario,
  entrarUsuario,
  obterSessaoAtual,
  recuperarSenha,
  observarSessao,
} from "../lib/auth";

type AuthGateProps = {
  children: ReactNode;
};

type AuthMode = "login" | "cadastro" | "recuperacao";

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [modo, setModo] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    const subscription = observarSessao((novaSessao) => {
      if (ativo) {
        setSession(novaSessao);
        setCarregando(false);
      }
    });

    obterSessaoAtual()
      .then((sessaoAtual) => {
        if (ativo) {
          setSession(sessaoAtual);
          setCarregando(false);
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível verificar sua sessão."
          );
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function enviarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setEnviando(true);

    try {
      if (modo === "cadastro") {
        const resultado = await cadastrarUsuario(email, senha);

        if (resultado.precisaConfirmarEmail) {
          setMensagem(
            "Conta criada. Confira seu e-mail e confirme o cadastro antes de entrar."
          );
        } else {
          setMensagem("Cadastro realizado com sucesso.");
        }
      } else if (modo === "login") {
        await entrarUsuario(email, senha);
      } else {
        await recuperarSenha(email);
        setMensagem(
          "Se o endereço estiver cadastrado, você receberá instruções para recuperar a senha."
        );
      }
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado."
      );
    } finally {
      setEnviando(false);
    }
  }

  const estilos = `
    .rt-auth-screen {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #0b1020;
      color: #f1f5f9;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .rt-auth-card {
      width: 100%;
      max-width: 420px;
      padding: 32px;
      border: 1px solid #29334a;
      border-radius: 18px;
      background: #111a2e;
      box-shadow: 0 24px 70px #0005;
    }
    .rt-auth-brand {
      margin: 0 0 8px;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -1px;
    }
    .rt-auth-subtitle {
      margin: 0 0 26px;
      color: #9caec9;
      line-height: 1.5;
    }
    .rt-auth-label {
      display: block;
      margin: 16px 0 7px;
      font-size: 13px;
      color: #cbd5e1;
    }
    .rt-auth-input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 13px;
      border: 1px solid #35425c;
      border-radius: 9px;
      outline: none;
      background: #0b1222;
      color: #f8fafc;
      font: inherit;
    }
    .rt-auth-input:focus {
      border-color: #60a5fa;
    }
    .rt-auth-button {
      width: 100%;
      margin-top: 22px;
      padding: 12px;
      border: 0;
      border-radius: 9px;
      background: #3b82f6;
      color: white;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .rt-auth-button:disabled {
      opacity: .6;
      cursor: wait;
    }
    .rt-auth-links {
      display: grid;
      gap: 12px;
      margin-top: 22px;
      text-align: center;
    }
    .rt-auth-link {
      padding: 0;
      border: 0;
      background: transparent;
      color: #93c5fd;
      font: inherit;
      cursor: pointer;
    }
    .rt-auth-message {
      margin-top: 16px;
      padding: 11px;
      border-radius: 8px;
      background: #12352b;
      color: #bbf7d0;
      font-size: 14px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .rt-auth-error {
      margin-top: 16px;
      padding: 11px;
      border-radius: 8px;
      background: #451d2a;
      color: #fecdd3;
      font-size: 14px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .rt-auth-loading {
      color: #cbd5e1;
      text-align: center;
    }
  `;

  if (carregando) {
    return (
      <div className="rt-auth-screen">
        <style>{estilos}</style>
        <p className="rt-auth-loading">Verificando sessão do RaceTime...</p>
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  const titulo =
    modo === "login"
      ? "Entrar"
      : modo === "cadastro"
        ? "Criar conta"
        : "Recuperar senha";

  const descricao =
    modo === "login"
      ? "Entre para acessar suas salas e provas."
      : modo === "cadastro"
        ? "Crie sua conta para participar de uma sala."
        : "Informe seu e-mail para receber as instruções de recuperação.";

  return (
    <div className="rt-auth-screen">
      <style>{estilos}</style>

      <main className="rt-auth-card">
        <h1 className="rt-auth-brand">RaceTime</h1>
        <p className="rt-auth-subtitle">{descricao}</p>

        <h2>{titulo}</h2>

        <form onSubmit={enviarFormulario}>
          <label className="rt-auth-label" htmlFor="rt-email">
            E-mail
          </label>
          <input
            id="rt-email"
            className="rt-auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {modo !== "recuperacao" && (
            <>
              <label className="rt-auth-label" htmlFor="rt-senha">
                Senha
              </label>
              <input
                id="rt-senha"
                className="rt-auth-input"
                type="password"
                autoComplete={
                  modo === "cadastro" ? "new-password" : "current-password"
                }
                minLength={8}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
              />
            </>
          )}

          <button
            className="rt-auth-button"
            type="submit"
            disabled={enviando}
          >
            {enviando ? "Aguarde..." : titulo}
          </button>
        </form>

        {mensagem && <div className="rt-auth-message">{mensagem}</div>}
        {erro && <div className="rt-auth-error">{erro}</div>}

        <div className="rt-auth-links">
          {modo === "login" && (
            <>
              <button
                className="rt-auth-link"
                type="button"
                onClick={() => {
                  setModo("cadastro");
                  setMensagem("");
                  setErro("");
                }}
              >
                Criar uma conta
              </button>
              <button
                className="rt-auth-link"
                type="button"
                onClick={() => {
                  setModo("recuperacao");
                  setMensagem("");
                  setErro("");
                }}
              >
                Esqueci minha senha
              </button>
            </>
          )}

          {modo !== "login" && (
            <button
              className="rt-auth-link"
              type="button"
              onClick={() => {
                setModo("login");
                setMensagem("");
                setErro("");
              }}
            >
              Voltar para o login
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
