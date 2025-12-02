import React from 'react';
import { WhatsAppAutomationControl } from '../modules/whatsapp/WhatsAppAutomationControl';
import { RtaForm } from '../modules/rta/RtaForm';
import { PriceForm } from '../modules/price/PriceForm';
import { QuotesList } from '../modules/quotes/QuotesList';
import { TrelloForm } from '../modules/trello/TrelloForm';
import { HowToGuide } from '../modules/howto/HowToGuide';

export const RtaView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">RTA Automático</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Formulário e geração de PDF do RTA.</p>
    <RtaForm />
  </section>
);

export const WhatsAppAutomationView: React.FC<{
  profileId: string | null;
  profileName: string | null;
  isAdmin: boolean;
}> = ({ profileId, profileName, isAdmin }) => {
  return <WhatsAppAutomationControl profileId={profileId} profileName={profileName} isAdmin={isAdmin} />;
};


export const TrelloView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">Integração Trello</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Formulário para criar cards e anexar arquivos no Trello.</p>
    <TrelloForm />
  </section>
);

export const QuotesView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">Cotações</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Lista e gerenciamento de cotações salvas.</p>
    <QuotesList />
  </section>
);

export const PriceView: React.FC = () => (
  <section className="card p-6 mb-6">
    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">Preço Automático</h2>
    <p className="text-slate-500 dark:text-slate-300 mb-4">Geração de imagens de preço e envio ao Trello.</p>
    <PriceForm />
  </section>
);

export const HowToView: React.FC = () => <HowToGuide />;
