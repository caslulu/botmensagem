import React from 'react';
import { WhatsAppAutomationControl } from './WhatsAppAutomationControl';

export type WhatsAppAutomationViewProps = {
  profileId: string | null;
  profileName: string | null;
  isAdmin: boolean;
};

export const WhatsAppAutomationView: React.FC<WhatsAppAutomationViewProps> = ({
  profileId,
  profileName,
  isAdmin
}) => (
  <WhatsAppAutomationControl
    profileId={profileId}
    profileName={profileName}
    isAdmin={isAdmin}
  />
);
