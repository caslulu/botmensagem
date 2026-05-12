import type { AutomationProfile, ValidatedAutomationProfile } from './types';
import PathResolver from './utils/path-resolver';

class ProfileValidator {
  static validate(profile: Partial<AutomationProfile> & { id: string; name: string }): ValidatedAutomationProfile {
    if (!profile || !profile.id) {
      throw new Error('Perfil inválido informado para automação.');
    }

    let preparedImagePath: string | null = null;
    const resolvedImagePath = PathResolver.resolve(profile.imagePath ?? null);
    if (resolvedImagePath) {
      try {
        PathResolver.validate(
          resolvedImagePath,
          `Imagem do perfil ${profile.name} não encontrada em ${resolvedImagePath}`
        );
        preparedImagePath = resolvedImagePath;
      } catch (error: any) {
        console.warn(`[Automation][ProfileValidator] ${error?.message}. Mensagem será enviada sem imagem.`);
      }
    } else if (profile?.imagePath) {
      console.warn(`[Automation][ProfileValidator] Caminho da imagem inválido para ${profile.name}. Mensagem será enviada sem imagem.`);
    }

    const trimmedMessage = (profile.message ?? '').toString().trim();
    if (!trimmedMessage) {
      throw new Error(`Mensagem do perfil ${profile.name} não pode ser vazia.`);
    }

    return {
      ...profile,
      imagePath: preparedImagePath,
      message: trimmedMessage,
      sendLimit: profile.sendLimit || 200
    } as ValidatedAutomationProfile;
  }
}

export default ProfileValidator;
