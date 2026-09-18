/** Rota da tela de impressão de um documento emitido. */
export function documentPrintPath(id: string): string {
  return `/documentos/${id}/imprimir`;
}
