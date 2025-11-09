const fs = require('fs');

/**
 * Converte um perfil do backend para o formato esperado pelo renderer.
 */
function formatProfileForRenderer(profile) {
  if (!profile) {
    return null;
  }

  let thumbnailData = null;
  const { imagePath } = profile;

  if (imagePath && fs.existsSync(imagePath)) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      thumbnailData = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.error(`Erro ao carregar imagem para ${profile.name}:`, error);
    }
  }

  return {
    id: profile.id,
    name: profile.name,
    message: profile.message,
    imagePath,
    thumbnail: thumbnailData,
    isAdmin: !!profile.isAdmin
  };
}

module.exports = { formatProfileForRenderer };
