// Configuração global de suporte
export const SUPPORT_CONFIG = {
  whatsappNumber: '5511999999999', // Atualizar com número real
  supportHours: '08:00 - 22:00',
  supportEmail: 'suporte@asbrasil.com.br',
  
  // Mensagens pré-formatadas para WhatsApp
  getWhatsAppUrl: (role: string, issue?: string) => {
    const baseUrl = `https://wa.me/${SUPPORT_CONFIG.whatsappNumber}`;
    const message = issue 
      ? `Olá! Sou ${role} e preciso de ajuda com: ${issue}`
      : `Olá! Sou ${role} e preciso de suporte.`;
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
};
