const fs = require('fs');

/**
 * Normaliza uma mensagem lida do banco para o renderer.
 */
function formatMessageForRenderer(message) {
  if (!message) {
    return null;
  }

  let thumbnailData = null;
  const imagePath = message.image_path;

  if (imagePath && fs.existsSync(imagePath)) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      thumbnailData = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.error(`Erro ao carregar imagem da mensagem ${message.id}:`, error);
    }
  }

  return {
    id: message.id,
    profileId: message.profile_id,
    text: message.text,
    imagePath,
    thumbnail: thumbnailData,
    isSelected: message.is_selected === 1,
    createdAt: message.created_at,
    updatedAt: message.updated_at
  };
}

module.exports = { formatMessageForRenderer };
