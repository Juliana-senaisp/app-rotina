import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export type Cartao = {
  id: string;
  nome: string;
  fechamento: number; // dia do mês em que a fatura fecha
  vencimento: number; // dia do mês em que a fatura vence
};

export type Gasto = {
  id: string;
  descricao: string;
  valorTotal: number; // em centavos
  parcelas: number;
  data: string; // 'AAAA-MM-DD' (data da compra)
  cartaoId: string;
};

export type Lancamento = {
  gasto: Gasto;
  cartao: Cartao;
  parcela: number;
  total: number;
  valor: number; // centavos
  ano: number;
  mes: number; // 0 a 11
  chave: string; // 'AAAA-MM'
};

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ---------- Dinheiro ----------

export function formatarReais(centavos: number) {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const inteiro = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const resto = String(abs % 100).padStart(2, '0');
  return `${negativo ? '-' : ''}R$ ${inteiro},${resto}`;
}

// Aceita "89,90", "89.90", "1.234,56" e "R$ 1234". Devolve centavos.
export function lerValor(texto: string): number | null {
  let t = texto.replace(/[^\d.,]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

// Divide o total em parcelas; os centavos que sobram vão para as primeiras.
export function valoresParcelas(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

// ---------- Datas ----------

export function textoBR(d: Date) {
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

// 'DD/MM/AAAA' ou 'DD/MM' (ano atual) -> 'AAAA-MM-DD'
export function lerDataBR(texto: string): string | null {
  const partes = texto.trim().split('/').map(p => p.trim());
  if (partes.length < 2 || partes.length > 3) return null;
  const dia = Number(partes[0]);
  const mes = Number(partes[1]);
  let ano = partes[2] ? Number(partes[2]) : new Date().getFullYear();
  if (partes[2] && partes[2].length === 2) ano += 2000;
  if (!Number.isInteger(dia) || !Number.isInteger(mes) || !Number.isInteger(ano)) return null;
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function dataCurta(iso: string) {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

export function chaveMes(ano: number, mes: number) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}`;
}

export function somarMeses(ano: number, mes: number, n: number) {
  const total = ano * 12 + mes + n;
  return { ano: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

export function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0).getDate();
}

export function rotuloMes(ano: number, mes: number) {
  return `${MESES[mes]} ${ano}`;
}

export function rotuloMesCurto(ano: number, mes: number) {
  return `${MESES[mes].slice(0, 3).toLowerCase()}/${ano}`;
}

// ---------- Faturas ----------

// Primeira fatura (mês de vencimento) em que a compra cai.
export function primeiraFatura(dataCompra: string, cartao: Cartao) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  let deslocamento = 0;
  if (dia > cartao.fechamento) deslocamento += 1; // comprou depois de fechar
  if (cartao.vencimento <= cartao.fechamento) deslocamento += 1; // vence no mês seguinte
  return somarMeses(ano, mes - 1, deslocamento);
}

// Uma linha por parcela, já no mês da fatura correspondente.
export function expandir(gastos: Gasto[], cartoes: Cartao[]): Lancamento[] {
  const porId = new Map(cartoes.map(c => [c.id, c]));
  const lista: Lancamento[] = [];
  for (const g of gastos) {
    const cartao = porId.get(g.cartaoId);
    if (!cartao) continue;
    const inicio = primeiraFatura(g.data, cartao);
    valoresParcelas(g.valorTotal, g.parcelas).forEach((valor, i) => {
      const { ano, mes } = somarMeses(inicio.ano, inicio.mes, i);
      lista.push({
        gasto: g, cartao, parcela: i + 1, total: g.parcelas,
        valor, ano, mes, chave: chaveMes(ano, mes),
      });
    });
  }
  return lista;
}

// ---------- Dados ----------

function useColecao<T extends { id: string }>(nome: string) {
  const [itens, setItens] = useState<T[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, nome),
      snap => {
        setItens(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as unknown as T)
        );
        setErro(null);
      },
      e => {
        console.error(`Erro ao ler ${nome}:`, e);
        setErro(e.message);
      }
    );
  }, [nome]);

  return { itens, erro };
}

export function useCartoes() {
  const { itens, erro } = useColecao<Cartao>('cartoes');
  return { cartoes: itens, erro };
}

export function useGastos() {
  const { itens, erro } = useColecao<Gasto>('gastos');
  return { gastos: itens, erro };
}