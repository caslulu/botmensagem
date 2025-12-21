import React from 'react';

export const HowToGuide: React.FC = () => (
  <div className="space-y-6">
    <section className="card p-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Como usar o Insurance Helper</h2>
      <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-3">
        <li><b className="text-slate-800 dark:text-slate-200">Selecione um operador:</b> Escolha ou cadastre um perfil para acessar os módulos.</li>
        <li><b className="text-slate-800 dark:text-slate-200">WhatsApp Automação:</b> Inicie/parar envios automáticos, gerencie mensagens e acompanhe logs em tempo real.</li>
        <li><b className="text-slate-800 dark:text-slate-200">RTA Automático:</b> Preencha o formulário e gere o PDF do RTA para veículos.</li>
        <li><b className="text-slate-800 dark:text-slate-200">Preço Automático:</b> Gere imagens de preço preenchendo os campos e envie para o Trello.</li>
        <li><b className="text-slate-800 dark:text-slate-200">Cotações:</b> Visualize, atualize e exclua cotações salvas.</li>
        <li><b className="text-slate-800 dark:text-slate-200">Integração Trello:</b> Crie cards rapidamente, anexe arquivos e envie observações.</li>
      </ul>
    </section>
    <section className="card p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Dicas rápidas</h3>
      <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-3">
        <li>Use a barra lateral para navegar entre os módulos.</li>
        <li>Perfis administradores têm acesso a todos os módulos.</li>
        <li>Os formulários validam campos obrigatórios automaticamente.</li>
        <li>Os arquivos gerados são salvos na pasta Downloads do seu computador.</li>
        <li>Em caso de erro, verifique os logs ou tente novamente.</li>
      </ul>
    </section>
  </div>
);
