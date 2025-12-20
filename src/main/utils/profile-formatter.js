const fs = require('fs');
const path = require('path');
const { DEFAULT_AVATAR_TOKEN } = require('../constants/profile');
const PathResolver = require('../automation/utils/path-resolver');

function formatProfileForRenderer(profile) {
  if (!profile) {
    return null;
  }

  let thumbnailData = null;
  const { imagePath } = profile;
  const hasCustomImage = imagePath && imagePath !== DEFAULT_AVATAR_TOKEN;

  let resolvedImagePath = null;
  if (hasCustomImage) {
    const candidates = [];
    const direct = PathResolver.resolve(imagePath);
    if (direct) candidates.push(direct);

    // Se veio salvo relativo, tente dentro do diretório de dados do app.
    const userData = PathResolver.getUserDataDir();
    if (userData) {
      candidates.push(path.join(userData, imagePath));
      candidates.push(path.join(userData, 'profiles', path.basename(imagePath)));
    }

    resolvedImagePath = candidates.find(candidate => fs.existsSync(candidate)) || null;

    if (resolvedImagePath) {
      try {
        const imageBuffer = fs.readFileSync(resolvedImagePath);
        const mimeType = resolvedImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        thumbnailData = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      } catch (error) {
        console.error(`Erro ao carregar imagem para ${profile.name}:`, error);
      }
    }
  }

  return {
    id: profile.id,
    name: profile.name,
    message: profile.message,
    imagePath: hasCustomImage ? (resolvedImagePath || imagePath) : null,
    thumbnail: thumbnailData,
    isAdmin: !!profile.isAdmin
  };
}

module.exports = { formatProfileForRenderer };
