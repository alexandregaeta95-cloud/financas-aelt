import React from 'react';
import { AssistantDashboardView } from '../modules/assistant';

export type AssistenteIAPageProps = React.ComponentProps<typeof AssistantDashboardView>;

export const AssistenteIAPage: React.FC<AssistenteIAPageProps> = (props) => {
  return <AssistantDashboardView {...props} />;
};

export default AssistenteIAPage;
