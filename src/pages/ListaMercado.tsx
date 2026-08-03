import React from 'react';
import { GroceryListTab } from '../modules/mercado';

export type ListaMercadoPageProps = React.ComponentProps<typeof GroceryListTab>;

export const ListaMercadoPage: React.FC<ListaMercadoPageProps> = (props) => {
  return <GroceryListTab {...props} />;
};

export default ListaMercadoPage;
