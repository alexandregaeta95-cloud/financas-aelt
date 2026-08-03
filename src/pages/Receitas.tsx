import React from 'react';
import Consultas from './Consultas';

export type ReceitasPageProps = React.ComponentProps<typeof Consultas>;

export const ReceitasPage: React.FC<ReceitasPageProps> = (props) => {
  return <Consultas {...props} initialSubTab="receitas" />;
};

export default ReceitasPage;
