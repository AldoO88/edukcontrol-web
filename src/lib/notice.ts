// Helper de feedback — normaliza el resultado de las mutaciones
// ({ success, message } de los hooks) al shape del banner de las
// páginas ({ ok, text }). Evita repetir el mapeo en cada pantalla.

export interface Notice {
  ok: boolean;
  text: string;
}

export function toNotice(result: { success: boolean; message: string }): Notice {
  return { ok: result.success, text: result.message };
}
