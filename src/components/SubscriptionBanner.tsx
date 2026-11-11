import React, { useState } from 'react';
import { Language } from '../types';
import { useAccount } from '../account/AccountContext';
import { daysLeft, subscriptionStatus } from '../account/access';
import { Clock, X } from 'lucide-react';

/** Days before the end of a subscription when the reminder appears */
export const REMINDER_DAYS = 3;
const DISMISS_KEY = 'kg_tender_calc_reminder_dismissed_v1';

const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Reminder under the header: the subscription ends soon, or has ended while paid access is on. */
export const SubscriptionBanner: React.FC<{ lang: Language }> = ({ lang }) => {
  const account = useAccount();
  const [dismissed, setDismissed] = useState<string | null>(readDismissed);
  const L = (ky: string, ru: string) => (lang === 'ky' ? ky : ru);

  const paidUntil = account.access.paidUntil;
  if (!account.configured || !account.user || !paidUntil) return null;

  const status = subscriptionStatus(paidUntil);
  const left = daysLeft(paidUntil);
  const endingSoon = status === 'active' && left <= REMINDER_DAYS;
  const ended = status === 'expired' && account.access.paywallEnabled;
  // Hidden for this end date once closed; a new end date shows it again
  if ((!endingSoon && !ended) || dismissed === paidUntil) return null;

  const dismiss = () => {
    setDismissed(paidUntil);
    try {
      sessionStorage.setItem(DISMISS_KEY, paidUntil);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`border-b text-xs no-print ${ended ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`} role="status">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3">
        <Clock className={`w-4 h-4 shrink-0 ${ended ? 'text-rose-600' : 'text-amber-600'}`} />
        <span className="flex-1">
          {ended
            ? L(`Жазылуу ${formatDate(paidUntil)} бүттү.`, `Подписка закончилась ${formatDate(paidUntil)}.`)
            : L(
                `Жазылуу ${left} күндөн кийин бүтөт (${formatDate(paidUntil)} чейин).`,
                `Подписка заканчивается через ${left} дн. (до ${formatDate(paidUntil)}).`
              )}
        </span>
        <button
          type="button"
          onClick={() => account.openAccount()}
          className={`px-3 py-1 rounded-md font-semibold text-white cursor-pointer shrink-0 ${ended ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'}`}
        >
          {L('Узартуу', 'Продлить')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={L('Жабуу', 'Скрыть напоминание')}
          className="p-1 rounded hover:bg-black/5 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
