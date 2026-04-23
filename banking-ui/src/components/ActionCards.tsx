import { CheckCircle, XCircle, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';
import { sendMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ActionCardProps {
  card: { type: string; data: any };
  onAction?: (result: string) => void;
}

export function AccountCreatedCard({ card }: ActionCardProps) {
  const d = card.data;
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mt-2 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <span className="font-semibold text-emerald-400">Account Created</span>
      </div>
      <div className="space-y-1 text-sm text-gray-300">
        <p><span className="text-gray-500">Account:</span> {d.accountNumber}</p>
        <p><span className="text-gray-500">Type:</span> {d.accountType}</p>
        <p><span className="text-gray-500">Balance:</span> ${Number(d.balance).toFixed(2)} {d.currency}</p>
        <p><span className="text-gray-500">Status:</span> {d.status}</p>
      </div>
    </div>
  );
}

export function ConfirmTransferCard({ card, onAction }: ActionCardProps) {
  const { sessionId } = useAuth();
  const d = card.data;

  const handleConfirm = async () => {
    if (!sessionId) return;
    try {
      const result = await sendMessage(
        `Yes, I confirm the transfer. Transaction ID: ${d.transaction_id}`,
        sessionId
      );
      onAction?.(result.response);
    } catch {
      onAction?.('Failed to confirm transfer.');
    }
  };

  const handleCancel = () => {
    onAction?.('Transfer cancelled by user.');
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-2 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <span className="font-semibold text-amber-400">Transfer Requires Confirmation</span>
      </div>
      <div className="space-y-1 text-sm text-gray-300 mb-3">
        <p><span className="text-gray-500">Amount:</span> ${Number(d.amount).toFixed(2)}</p>
        <p><span className="text-gray-500">Recipient:</span> {d.recipient_name}</p>
        <p><span className="text-gray-500">Risk Level:</span>
          <span className={`ml-1 font-semibold ${d.risk_level === 'HIGH' ? 'text-red-400' : 'text-amber-400'}`}>
            {d.risk_level}
          </span>
        </p>
        {d.risk_reasons && (
          <div className="mt-2">
            <p className="text-gray-500">Risk Factors:</p>
            <ul className="list-disc list-inside text-gray-400 ml-2">
              {d.risk_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={handleConfirm}
          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
          <ShieldCheck className="w-4 h-4" /> Confirm
        </button>
        <button onClick={handleCancel}
          className="flex items-center gap-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors">
          <XCircle className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}

export function RiskWarningCard({ card }: ActionCardProps) {
  const d = card.data;
  const levelColor = d.risk_level === 'HIGH' ? 'text-red-400' : d.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400';
  const borderColor = d.risk_level === 'HIGH' ? 'border-red-500/30' : d.risk_level === 'MEDIUM' ? 'border-amber-500/30' : 'border-emerald-500/30';
  const bgColor = d.risk_level === 'HIGH' ? 'bg-red-500/10' : d.risk_level === 'MEDIUM' ? 'bg-amber-500/10' : 'bg-emerald-500/10';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 mt-2 animate-fade-in`}>
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-blue-400" />
        <span className="font-semibold text-blue-400">Risk Assessment</span>
      </div>
      <div className="space-y-1 text-sm text-gray-300">
        <p><span className="text-gray-500">Risk Level:</span> <span className={`font-bold ${levelColor}`}>{d.risk_level}</span></p>
        <p><span className="text-gray-500">Confidence:</span> {(d.confidence * 100).toFixed(1)}%</p>
        {d.reasons && (
          <div className="mt-2">
            <p className="text-gray-500">Factors:</p>
            <ul className="list-disc list-inside text-gray-400 ml-2">
              {d.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ActionCardRenderer({ card, onAction }: ActionCardProps) {
  switch (card.type) {
    case 'account_created': return <AccountCreatedCard card={card} />;
    case 'confirm_transfer': return <ConfirmTransferCard card={card} onAction={onAction} />;
    case 'risk_warning': return <RiskWarningCard card={card} />;
    default: return null;
  }
}
