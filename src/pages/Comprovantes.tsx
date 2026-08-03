import React from 'react';
import { DocumentScannerView } from '../modules/documents';

export type ComprovantesPageProps = React.ComponentProps<typeof DocumentScannerView>;

export const ComprovantesPage: React.FC<ComprovantesPageProps> = (props) => {
  return <DocumentScannerView {...props} />;
};

export default ComprovantesPage;
