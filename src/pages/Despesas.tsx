import React from 'react';
import TransactionsTab from '../modules/financeiro/components/TransactionsTab';

export type DespesasPageProps = React.ComponentProps<typeof TransactionsTab>;

export const DespesasPage: React.FC<DespesasPageProps> = (props) => {
  return <TransactionsTab {...props} forcedFilter="DESPESA" />;
};

export default DespesasPage;
