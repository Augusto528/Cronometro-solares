
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { supabase } from "../lib/supabase";
import { RoomProvider } from "../lib/RoomContext";
import {
  criarSala,
  entrarNaSala,
  listarSalas,
  type Room,
} from "../lib/rooms";

export default function RoomGate({
  children,
}: {
  children: ReactNode;
}) {
  const [salas, setSalas] = useState<Room[]>([]);
  const [salaSelecionada, setSalaSelecionada] = useState("");
  const [nomeSala, setNomeSala] = useState("");
  const [codigoSala, setCodigoSala] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mostrarPainel, setMostrarPainel] = useState(true);

  const carregarSalas = useCallback(async () => {
    setErro("");

    try {
      const lista = await listarSalas();
      setSalas(lista);

      setSalaSelecionada((atual) => {
        if (atual && lista.some((sala) => sala.id === atual)) {
          return atual;
        }

        return lista[0]?.id ?? "";
      });
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as salas."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarSalas();
  }, [carregarSalas]);

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setEnviando(true);

    try {
      const novaSala = await criarSala(nomeSala);
      setNomeSala("");
      await carregarSalas();
      setSalaSelecionada(novaSala.id);
      setMensagem(`Sala criada. Código de acesso: ${novaSala.code}`);
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Falha ao criar a sala."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setEnviando(true);

    try {
      await entrarNaSala(codigoSala);
      setCodigoSala("");
      await carregarSalas();
      setMensagem("Você entrou na sala com sucesso.");
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Falha ao entrar na sala."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function sairDaConta() {
    setErro("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErro(error.message);
    }
  }

  const salaAtual = salas.find((sala) => sala.id === salaSelecionada);

  const estilos = `
    .rt-room-screen {
      min-height: 100vh;
      box-sizing: border-box;
      padding: 28px 18px;
      background: #0b1020;
      color: #f1f5f9;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .rt-room-wrap {
      max-width: 850px;
      margin: 0 auto;
    }
    .rt-room-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 28px;
    }
    .rt-room-title {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
    }
    .rt-room-muted {
      color: #9caec9;
      line-height: 1.5;
    }
    .rt-room-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }
    .rt-room-card {
      padding: 22px;
      border: 1px solid #29334a;
      border-radius: 14px;
      background: #111a2e;
    }
    .rt-room-card h2 {
      margin-top: 0;
      font-size: 18px;
    }
    .rt-room-label {
      display: block;
      margin: 14px 0 7px;
      color: #cbd5e1;
      font-size: 13px;
    }
    .rt-room-input, .rt-room-select {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 12px;
      border: 1px solid #35425c;
      border-radius: 8px;
      background: #0b1222;
      color: #f8fafc;
      font: inherit;
    }
    .rt-room-button {
      padding: 11px 14px;
      border: 0;
      border-radius: 8px;
      background: #3b82f6;
      color: white;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .rt-room-button:disabled {
      opacity: .6;
      cursor: wait;
    }
    .rt-room-button-secondary {
      border: 1px solid #35425c;
      background: #172238;
    }
    .rt-room-button-full {
      width: 100%;
      margin-top: 16px;
    }
    .rt-room-message {
      margin: 16px 0;
      padding: 12px;
      border-radius: 8px;
      background: #12352b;
      color: #bbf7d0;
      overflow-wrap: anywhere;
    }
    .rt-room-error {
      margin: 16px 0;
      padding: 12px;
      border-radius: 8px;
      background: #451d2a;
      color: #fecdd3;
      overflow-wrap: anywhere;
    }
    .rt-room-list {
      display: grid;
      gap: 10px;
      margin-top: 16px;
    }
    .rt-room-item {
      padding: 14px;
      border: 1px solid #35425c;
      border-radius: 9px;
      background: #0b1222;
      cursor: pointer;
      text-align: left;
      color: #f1f5f9;
    }
    .rt-room-item-selected {
      border-color: #60a5fa;
      background: #172b49;
    }
    .rt-room-code {
      margin-top: 8px;
      color: #93c5fd;
      font-size: 13px;
    }
    .rt-room-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 18px;
    }
    @media (max-width: 480px) {
      .rt-room-topbar {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `;

  if (salaAtual && !mostrarPainel) {
    return (
      <RoomProvider room={salaAtual}>
        <div className="rt-room-active">
          <style>{estilos}</style>
          <div style={{
            padding: "10px 16px",
            background: "#111a2e",
            color: "#cbd5e1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 13,
          }}>
            <span>
              Sala: <strong>{salaAtual.name}</strong>
              {" · "}
              Função: <strong>{salaAtual.role === "admin" ? "Administrador" : "Operador"}</strong>
            </span>
            <button
              className="rt-room-button rt-room-button-secondary"
              onClick={() => setMostrarPainel(true)}
            >
              Trocar sala
            </button>
          </div>
          {children}
        </div>
      </RoomProvider>
    );
  }

  return (
    <div className="rt-room-screen">
      <style>{estilos}</style>

      <div className="rt-room-wrap">
        <header className="rt-room-topbar">
          <div>
            <h1 className="rt-room-title">RaceTime</h1>
            <p className="rt-room-muted">
              Escolha uma sala ou crie uma nova para sua equipe.
            </p>
          </div>

          <button
            className="rt-room-button rt-room-button-secondary"
            onClick={() => void sairDaConta()}
          >
            Sair da conta
          </button>
        </header>

        {erro && <div className="rt-room-error">{erro}</div>}
        {mensagem && <div className="rt-room-message">{mensagem}</div>}

        <section className="rt-room-card">
          <h2>Minhas salas</h2>

          {carregando ? (
            <p className="rt-room-muted">Carregando salas...</p>
          ) : salas.length === 0 ? (
            <p className="rt-room-muted">
              Você ainda não participa de nenhuma sala. Crie uma ou entre usando um código.
            </p>
          ) : (
            <>
              <label className="rt-room-label" htmlFor="rt-sala-select">
                Selecione uma sala
              </label>
              <select
                id="rt-sala-select"
                className="rt-room-select"
                value={salaSelecionada}
                onChange={(event) => setSalaSelecionada(event.target.value)}
              >
                {salas.map((sala) => (
                  <option key={sala.id} value={sala.id}>
                    {sala.name} — {sala.role === "admin" ? "Administrador" : "Operador"}
                  </option>
                ))}
              </select>

              {salaAtual && (
                <div className="rt-room-list">
                  <button
                    className={`rt-room-item ${salaAtual.id === salaSelecionada ? "rt-room-item-selected" : ""}`}
                    onClick={() => setSalaSelecionada(salaAtual.id)}
                  >
                    <strong>{salaAtual.name}</strong>
                    <div className="rt-room-code">
                      Código de acesso: {salaAtual.code}
                    </div>
                    <div className="rt-room-muted">
                      Função: {salaAtual.role === "admin" ? "Administrador" : "Operador"}
                    </div>
                  </button>
                </div>
              )}

              <button
                className="rt-room-button rt-room-button-full"
                disabled={!salaAtual}
                onClick={() => setMostrarPainel(false)}
              >
                Abrir sala selecionada
              </button>
            </>
          )}
        </section>

        <div className="rt-room-grid" style={{ marginTop: 16 }}>
          <section className="rt-room-card">
            <h2>Criar sala</h2>
            <p className="rt-room-muted">
              Você será o administrador da sala e poderá compartilhar o código com os operadores.
            </p>

            <form onSubmit={criar}>
              <label className="rt-room-label" htmlFor="rt-nome-sala">
                Nome da sala
              </label>
              <input
                id="rt-nome-sala"
                className="rt-room-input"
                value={nomeSala}
                onChange={(event) => setNomeSala(event.target.value)}
                maxLength={100}
                placeholder="Ex.: Regata de sábado"
                required
              />
              <button
                className="rt-room-button rt-room-button-full"
                type="submit"
                disabled={enviando}
              >
                {enviando ? "Aguarde..." : "Criar sala"}
              </button>
            </form>
          </section>

          <section className="rt-room-card">
            <h2>Entrar em uma sala</h2>
            <p className="rt-room-muted">
              Digite o código compartilhado pelo administrador.
            </p>

            <form onSubmit={entrar}>
              <label className="rt-room-label" htmlFor="rt-codigo-sala">
                Código de acesso
              </label>
              <input
                id="rt-codigo-sala"
                className="rt-room-input"
                value={codigoSala}
                onChange={(event) => setCodigoSala(event.target.value.toUpperCase())}
                maxLength={8}
                placeholder="Ex.: A1B2C3D4"
                required
              />
              <button
                className="rt-room-button rt-room-button-full"
                type="submit"
                disabled={enviando}
              >
                {enviando ? "Aguarde..." : "Entrar na sala"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
