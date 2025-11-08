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
    // Validar estrutura básica
    if (!profile || !profile.id) {
      throw new Error('Perfil inválido informado para automação.');
    }

    // Resolver e validar caminho da imagem
    const resolvedImagePath = PathResolver.resolve(profile.imagePath);
    PathResolver.validate(
      resolvedImagePath,
      `Imagem do perfil ${profile.name} não encontrada em ${resolvedImagePath}`
    );

    // Validar mensagem
    const trimmedMessage = (profile.message ?? '').toString().trim();
    if (!trimmedMessage) {
      throw new Error(`Mensagem do perfil ${profile.name} não pode ser vazia.`);
    }

    // Resolver caminho da sessão
    const resolvedSessionDir = PathResolver.resolve(profile.sessionDir);

    // Retornar perfil preparado
    return {
      ...profile,
      imagePath: resolvedImagePath,
      message: trimmedMessage,
      sessionDir: resolvedSessionDir,
      sendLimit: profile.sendLimit || 200
    };
  }
}

module.exports = ProfileValidator;
