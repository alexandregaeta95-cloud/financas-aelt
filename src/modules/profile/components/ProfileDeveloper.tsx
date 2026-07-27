import React from 'react';
import DatabaseConsole from '../../../components/DatabaseConsole';
import { Transaction, RiskZone, Infraction } from '../../../types';

interface ProfileDeveloperProps {
  transactions?: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  riskZones?: RiskZone[];
  setRiskZones?: React.Dispatch<React.SetStateAction<RiskZone[]>>;
  infractions?: Infraction[];
  setInfractions?: React.Dispatch<React.SetStateAction<Infraction[]>>;
  nonAppealed?: any[];
  setNonAppealed?: React.Dispatch<React.SetStateAction<any[]>>;
  avatarUrl?: string;
  onAvatarChange?: (url: string) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileDeveloper: React.FC<ProfileDeveloperProps> = ({
  transactions = [],
  setTransactions = () => {},
  riskZones = [],
  setRiskZones = () => {},
  infractions = [],
  setInfractions = () => {},
  nonAppealed = [],
  setNonAppealed = () => {},
  avatarUrl = '',
  onAvatarChange = () => {},
  showAlert
}) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400">terminal</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Console do Desenvolvedor &amp; Banco</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">DEBUG MODE</span>
      </div>

      <DatabaseConsole
        transactions={transactions}
        setTransactions={setTransactions}
        riskZones={riskZones}
        setRiskZones={setRiskZones}
        infractions={infractions}
        setInfractions={setInfractions}
        nonAppealed={nonAppealed}
        setNonAppealed={setNonAppealed}
        avatarUrl={avatarUrl}
        onAvatarChange={onAvatarChange}
      />
    </section>
  );
};

export default React.memo(ProfileDeveloper);
