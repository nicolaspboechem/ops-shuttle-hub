/**
 * Formata um número de telefone para exibição: (XX) XXXXX-XXXX
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  // Remove o prefixo 55 se existir
  const localDigits = digits.startsWith('55') ? digits.slice(2) : digits;
  
  if (localDigits.length === 11) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7)}`;
  } else if (localDigits.length === 10) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
  }
  
  return phone;
}

/**
 * Formata um número de telefone para o padrão internacional: +55XXXXXXXXXXX
 */
export function formatPhoneInternational(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('55')) {
    return `+${digits}`;
  }
  
  return `+55${digits}`;
}

/**
 * Valida se o telefone tem o formato correto (10-11 dígitos)
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Máscara de input para telefone
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : '';
  } else if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  } else {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
}
