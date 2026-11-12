import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";
import { dataLocal, diaAnterior } from "./datas";
import {
  ESTADO_INICIAL,
  type Conclusao,
  type Devocional,
  type EstadoUsuario,
  type Semana,
} from "./tipos";

export async function carregarEstado(uid: string): Promise<EstadoUsuario> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return ESTADO_INICIAL;
  return { ...ESTADO_INICIAL, ...(snap.data() as Partial<EstadoUsuario>) };
}

export async function salvarNome(uid: string, nome: string): Promise<void> {
  await setDoc(doc(db, "usuarios", uid), { nome }, { merge: true });
}

export async function carregarDevocional(ordem: number): Promise<Devocional | null> {
  const q = query(collection(db, "devocionais"), where("ordem", "==", ordem), limit(1));
  const res = await getDocs(q);
  return res.empty ? null : (res.docs[0].data() as Devocional);
}

export async function carregarSemana(numero: number): Promise<Semana | null> {
  const snap = await getDoc(doc(db, "semanas", String(numero)));
  return snap.exists() ? (snap.data() as Semana) : null;
}

export async function carregarSemanas(): Promise<Semana[]> {
  const res = await getDocs(query(collection(db, "semanas"), orderBy("numero")));
  return res.docs.map((d) => d.data() as Semana);
}

export async function carregarConclusoes(uid: string): Promise<Conclusao[]> {
  const res = await getDocs(collection(db, "usuarios", uid, "conclusoes"));
  return res.docs.map((d) => {
    const v = d.data();
    return { data: d.id, ordem: Number(v.ordem ?? 0), semana: Number(v.semana ?? 0) };
  });
}

// A ofensiva só vale se a última conclusão foi hoje ou ontem.
export function ofensivaAtual(estado: EstadoUsuario, hoje: string): number {
  const ultima = estado.ultimaConclusaoData;
  if (!ultima) return 0;
  return ultima === hoje || ultima === diaAnterior(hoje) ? estado.ofensiva : 0;
}

// Marca o devocional como feito: grava a conclusão do dia (com as respostas,
// que são opcionais) e avança o ponteiro do usuário. O próximo só libera no
// dia seguinte.
export async function concluirDevocional(
  uid: string,
  devocional: Devocional,
  respostas: string[]
): Promise<void> {
  const hoje = dataLocal();
  const refUsuario = doc(db, "usuarios", uid);
  const refConclusao = doc(db, "usuarios", uid, "conclusoes", hoje);

  await runTransaction(db, async (t) => {
    const snap = await t.get(refUsuario);
    const atual: EstadoUsuario = snap.exists()
      ? { ...ESTADO_INICIAL, ...(snap.data() as Partial<EstadoUsuario>) }
      : ESTADO_INICIAL;

    const jaConcluidoHoje =
      atual.ultimaConclusaoData !== null && atual.ultimaConclusaoData >= hoje;
    if (atual.ordemAtual !== devocional.ordem || jaConcluidoHoje) {
      throw new Error("JA_CONCLUIDO");
    }

    const ofensiva =
      atual.ultimaConclusaoData === diaAnterior(hoje) ? atual.ofensiva + 1 : 1;

    t.set(
      refUsuario,
      {
        ordemAtual: devocional.ordem + 1,
        ultimaConclusaoData: hoje,
        ofensiva,
        melhorOfensiva: Math.max(atual.melhorOfensiva, ofensiva),
      },
      { merge: true }
    );
    t.set(refConclusao, {
      ordem: devocional.ordem,
      devocionalId: devocional.id,
      semana: devocional.semana,
      dia: devocional.dia,
      respostas,
      concluidoEm: serverTimestamp(),
    });
  });
}
