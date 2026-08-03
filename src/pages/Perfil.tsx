import React from 'react';
import ProfileTab from '../modules/profile/components/ProfileTab';

export type PerfilPageProps = React.ComponentProps<typeof ProfileTab>;

export const PerfilPage: React.FC<PerfilPageProps> = (props) => {
  return <ProfileTab {...props} />;
};

export default PerfilPage;
