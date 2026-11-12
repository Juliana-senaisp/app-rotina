import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { dataLocal } from "./dataLocal";
import {
  carregarDevocional,
  carregarEstado,
  carregarSemana,
  concluirDevocional,
  ofensivaAtual,
  salvarNome,
} from "./devocional";
import { ESTADO_INICIAL, type Devocional, type EstadoUsuario, type Semana } from "./tipos";

type Valor = {
  carregando: boolean;
  salvando: boolean;
  erro: string;
  estado: EstadoUsuario;
  devocional: Devocional | null;
  semana: Semana | null;
  respostas: string[];
  hoje: string;
  ofensiva: number;
  concluidoHoje: boolean;
  recarregar: (silencioso?: boolean) => Promise<void>;
  definirResposta: (indice: number, texto: string) => void;
  concluir: () => Promise<boolean>;
  atualizarNome: (nome: string) => Promise<void>;
};

const Contexto = createContext<Valor | null>(null);

export function useProgresso(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useProgresso precisa estar dentro do ProgressoProvider");
  return valor;
}

const chaveRascunho = (uid: string, id: string) => `rascunho:${uid}:${id}`;

export function ProgressoProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState<EstadoUsuario>(ESTADO_INICIAL);
  const [devocional, setDevocional] = useState<Devocional | null>(null);
  const [semana, setSemana] = useState<Semana | null>(null);
  const [respostas, setRespostas] = useState<string[]>([]);
  const [hoje, setHoje] = useState(dataLocal());
  const [rascunhoPronto, setRascunhoPronto] = useState(false);
  const idAtual = useRef<string | null>(null);

  const recarregar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCarregando(true);
      setErro("");
      setHoje(dataLocal());
      try {
        const est = await carregarEstado(uid);
        const dev = await carregarDevocional(est.ordemAtual);
        const sem = dev ? await carregarSemana(dev.semana) : null;

        setEstado(est);
        setDevocional(dev);
        setSemana(sem);

        // Quando o devocional muda, as respostas recomeçam vazias, com o
        // rascunho salvo no celular (se houver) recuperado em seguida.
        const novoId = dev?.id ?? null;
        if (novoId !== idAtual.current) {
          idAtual.current = novoId;
          setRascunhoPronto(false);
          setRespostas(dev ? dev.perguntas.map(() => "") : []);
          if (dev) {
            try {
              const salvo = await AsyncStorage.getItem(chaveRascunho(uid, dev.id));
              const lista = salvo ? JSON.parse(salvo) : null;
              if (Array.isArray(lista) && idAtual.current === dev.id) {
                setRespostas(
                  dev.perguntas.map((_, i) => (typeof lista[i] === "string" ? lista[i] : ""))
                );
              }
            } catch {
              // sem rascunho legível: segue com as respostas vazias
            }
          }
          setRascunhoPronto(true);
        }
      } catch {
        setErro("Não foi possível carregar. Verifique a conexão e tente de novo.");
      } finally {
        setCarregando(false);
      }
    },
    [uid]
  );

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Ao voltar para o app (por exemplo, no dia seguinte), atualiza os dados.
  useEffect(() => {
    const assinatura = AppState.addEventListener("change", (s) => {
      if (s === "active") recarregar(true);
    });
    return () => assinatura.remove();
  }, [recarregar]);

  // Guarda as respostas no celular enquanto a pessoa digita (rascunho).
  useEffect(() => {
    if (!devocional || !rascunhoPronto) return;
    const chave = chaveRascunho(uid, devocional.id);
    const temporizador = setTimeout(() => {
      if (respostas.some((r) => r.trim() !== "")) {
        AsyncStorage.setItem(chave, JSON.stringify(respostas)).catch(() => {});
      } else {
        AsyncStorage.removeItem(chave).catch(() => {});
      }
    }, 500);
    return () => clearTimeout(temporizador);
  }, [respostas, devocional, rascunhoPronto, uid]);

  const definirResposta = useCallback((indice: number, texto: string) => {
    setRespostas((atual) => atual.map((r, i) => (i === indice ? texto : r)));
  }, []);

  const concluir = useCallback(async (): Promise<boolean> => {
    if (!devocional) return false;
    setSalvando(true);
    setErro("");
    try {
      await concluirDevocional(uid, devocional, respostas.map((r) => r.trim()));
      await AsyncStorage.removeItem(chaveRascunho(uid, devocional.id)).catch(() => {});
      await recarregar(true);
      return true;
    } catch (e) {
      if (e instanceof Error && e.message === "JA_CONCLUIDO") {
        await recarregar(true);
        return true;
      }
      setErro("Não foi possível salvar. Verifique a conexão e tente de novo.");
      return false;
    } finally {
      setSalvando(false);
    }
  }, [uid, devocional, respostas, recarregar]);

  const atualizarNome = useCallback(
    async (nome: string) => {
      const limpo = nome.trim();
      await salvarNome(uid, limpo);
      setEstado((e) => ({ ...e, nome: limpo }));
    },
    [uid]
  );

  const ofensiva = ofensivaAtual(estado, hoje);
  const concluidoHoje =
    estado.ultimaConclusaoData !== null && estado.ultimaConclusaoData >= hoje;

  return (
    <Contexto.Provider
      value={{
        carregando,
        salvando,
        erro,
        estado,
        devocional,
        semana,
        respostas,
        hoje,
        ofensiva,
        concluidoHoje,
        recarregar,
        definirResposta,
        concluir,
        atualizarNome,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}
