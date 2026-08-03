export const safeJsonParse = (val: any, fallback: any = []) => {
  if (!val || val === 'undefined' || val === 'null') return fallback;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch (e) {
    console.warn("Erro ao fazer JSON.parse:", e);
    return fallback;
  }
};

export const safeParse = safeJsonParse;
