/**
 * Validador de perfil
 */

const PathResolver = require('./utils/path-resolver');

class ProfileValidator {
  /**
   * Valida e prepara um perfil para automação
   * @param {Object} profile - Perfil a ser validado
   * @returns {Object} Perfil validado e preparado
   * @throws {Error} Se o perfil for inválido
   */
  static validate(profile) {
    if (!profile || !profile.id) {
      throw new Error('Perfil inválido informado para automação.');
    }

    let preparedImagePath = null;
    const resolvedImagePath = PathResolver.resolve(profile.imagePath);
    if (resolvedImagePath) {
      try {
        PathResolver.validate(
          resolvedImagePath,
          `Imagem do perfil ${profile.name} não encontrada em ${resolvedImagePath}`
        );
        preparedImagePath = resolvedImagePath;
      } catch (error) {
        console.warn(`[Automation][ProfileValidator] ${error.message}. Mensagem será enviada sem imagem.`);
      }
    } else if (profile?.imagePath) {
      console.warn(`[Automation][ProfileValidator] Caminho da imagem inválido para ${profile.name}. Mensagem será enviada sem imagem.`);
    }

    const trimmedMessage = (profile.message ?? '').toString().trim();
    if (!trimmedMessage) {
      throw new Error(`Mensagem do perfil ${profile.name} não pode ser vazia.`);
    }

    const resolvedSessionDir =
      PathResolver.resolve(profile.sessionDir) ||
      PathResolver.getProfileSessionDir(profile.id);

    return {
      ...profile,
      imagePath: preparedImagePath,
      message: trimmedMessage,
      sessionDir: resolvedSessionDir,
      sendLimit: profile.sendLimit || 200
    };
  }
}

module.exports = ProfileValidator;
