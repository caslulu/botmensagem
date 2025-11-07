const path = require('path');
const { getSelectedMessage } = require('./database');

const profiles = [
  {
    id: 'thiago',
    name: 'Thiago',
    sessionDir: path.join(process.cwd(), 'whatsapp_session_thiago'),
    imagePath: path.join(process.cwd(), 'imagem_thiago.jpg'),
    thumbnail: null,
    message: `🚨 *PARE DE PAGAR CARO NO SEGURO!* 🚨\n👉 Carro | Moto\n\n💰 *ECONOMIZE ATÉ 50% AGORA!*\n✅ As melhores taxas do mercado\n✅ Cotações rápidas, sem enrolação\n\n📋 *Aceitamos:*\n• Drivh\n• CNH brasileira\n• Passaporte\n• Habilitação estrangeira\n\n🧑‍💼 Thiago | Seu Corretor de Confiança\nFale comigo no WhatsApp e receba sua cotação em minutos:\n👉 https://wa.me/message/BMDAOE4YSM7HN1`
  },
  {
    id: 'debora',
    name: 'Debora',
    sessionDir: path.join(process.cwd(), 'whatsapp_session_debora'),
    imagePath: path.join(process.cwd(), 'imagem_debora.jpg'),
    thumbnail: null,
    message: `🔒 SEGURANÇA NO VOLANTE COMEÇA AQUI!\n� Seguro de carro, moto e casa\n\n�REDUZA SEU SEGURO EM ATÉ 50%, GARANTIMOS AS MELHORES TAXAS DO MERCADO\n\n� COTAÇÃO RÁPIDA E SEM BUROCRACIA!\nAceitamos: \n* CNH \n* Passaporte \n* Habilitação estrangeira\n\n👩🏻‍💼Débora | Corretora de Seguros\n📞 Clique aqui e peça sua cotação:\nhttps://wa.me/message/X4X7FBTDBF7RH1`
  }
];

function getProfiles() {
  return profiles;
}

function findProfileById(id) {
  const profile = profiles.find((p) => p.id === id);
  
  if (profile) {
    // Get the selected message from database
    const selectedMessage = getSelectedMessage(id);
    
    if (selectedMessage) {
      // Override with database values
      return {
        ...profile,
        message: selectedMessage.text,
        imagePath: selectedMessage.image_path || profile.imagePath
      };
    }
  }
  
  return profile;
}

module.exports = {
  getProfiles,
  findProfileById
};
