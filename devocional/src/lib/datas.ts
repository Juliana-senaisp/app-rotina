// Data local do celular no formato "aaaa-mm-dd".
export function dataLocal(d: Date = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Dia anterior a uma data "aaaa-mm-dd".
export function diaAnterior(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return dataLocal(new Date(ano, mes - 1, dia - 1));
}
