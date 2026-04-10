import React from 'react';

export const HowToGuide: React.FC = () => (
  <div className="space-y-6">
    <section className="card p-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Como usar o Insurance Helper</h2>
      <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-3">
        <li><b className="text-slate-800 dark:text-slate-200">Selecione um operador:</b> escolha um perfil existente ou cadastre um novo para acessar os módulos. O sistema aceita até 10 perfis.</li>
        <li><b className="text-slate-800 dark:text-slate-200">Enviar mensagem automática:</b> disponível para administradores. Escolha a mensagem ativa do perfil, ajuste o limite de envios e acompanhe os logs em tempo real.</li>
        <li><b className="text-slate-800 dark:text-slate-200">RTA automático:</b> selecione a seguradora, preencha os dados do cliente, veículo e título e gere o PDF final na pasta Downloads.</li>
        <li><b className="text-slate-800 dark:text-slate-200">Cotações:</b> sincronize a fila do Trello, crie um novo card no próprio painel e rode a automação de cotação quando o item já tiver espelho local no app.</li>
        <li><b className="text-slate-800 dark:text-slate-200">Preço automático:</b> carregue uma cotação salva ou preencha manualmente os campos para gerar a imagem de preço em PNG na pasta Downloads.</li>
        <li><b className="text-slate-800 dark:text-slate-200">Perfil e configurações:</b> edite seu perfil atual e, se você for admin, gerencie todos os perfis cadastrados.</li>
      </ul>
    </section>
    <section className="card p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Dicas rápidas</h3>
      <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-3">
        <li>Use a barra lateral para navegar entre módulos operacionais, conteúdo de apoio e área da conta.</li>
        <li>Somente administradores podem iniciar disparos automáticos no WhatsApp.</li>
        <li>Cada perfil possui sessão própria do WhatsApp e limite de envios configurável; o padrão atual é 200 grupos.</li>
        <li>Os arquivos gerados por RTA e Preço automático são salvos na pasta Downloads do computador.</li>
        <li>A automação de cotações disponível hoje atende Progressive e Liberty.</li>
        <li>Se o Trello não responder, a tela de cotações continua mostrando o espelho salvo localmente.</li>
      </ul>
    </section>
  </div>
);
