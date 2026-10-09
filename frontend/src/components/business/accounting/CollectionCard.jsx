import React from 'react';
import { useTranslation } from "react-i18next";

const formatMoney = (paise) => {
  const amount = Number(paise || 0) / 100;
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹${Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const CollectionRow = ({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  onClick,
}) => (
  <div className="overflow-hidden rounded-[14px] bg-slate-50/70 border border-slate-100/50 transition-all hover:bg-slate-50 hover:shadow-sm">
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex w-full items-center justify-between px-3.5 py-3 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : 'cursor-default'} disabled:opacity-100`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-7 w-7 flex items-center justify-center rounded-[8px] ${iconBg} ${iconColor} shadow-sm`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            {icon}
          </svg>
        </div>
        <span className="text-[13px] font-bold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-black text-slate-900">{value}</span>
        {onClick && (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-slate-400">
            <path d="M7 5l5 5-5 5" />
          </svg>
        )}
      </div>
    </button>
  </div>
);

const CollectionCard = ({ 
  title,
  totalCashPaise = 0,
  totalUpiPaise = 0,
  totalCardPaise = 0,
  totalUdhariPaise = 0,
  totalCollectedPaise = 0,
  onCashClick,
  onUpiClick,
  onCardClick,
  onUdhariClick,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
      <div>
        {title && <h2 className="text-[15px] font-black tracking-tight text-slate-900 mb-4">{title}</h2>}
        <div className="space-y-2.5">
          
          <CollectionRow
            icon={<rect x="2" y="6" width="20" height="12" rx="2" />}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
            label={t("manager.cash", "Cash")}
            value={formatMoney(totalCashPaise)}
            onClick={onCashClick}
          />

          <CollectionRow
            icon={<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />}
            iconBg="bg-blue-100"
            iconColor="text-blue-700"
            label={t("manager.upi", "UPI")}
            value={formatMoney(totalUpiPaise)}
            onClick={onUpiClick}
          />

          <CollectionRow
            icon={<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>}
            iconBg="bg-purple-100"
            iconColor="text-purple-700"
            label={t("manager.card", "Card")}
            value={formatMoney(totalCardPaise)}
            onClick={onCardClick}
          />

          <CollectionRow
            icon={<path d="M5 12h14" />}
            iconBg="bg-rose-100"
            iconColor="text-rose-600"
            label={t("manager.udhari", "Udhari")}
            value={formatMoney(totalUdhariPaise)}
            onClick={onUdhariClick}
          />

        </div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-[12px] bg-slate-50 px-4 py-3 border border-slate-100">
        <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">{t("manager.total", "Total")}</span>
        <span className="text-[16px] font-black text-slate-900">{formatMoney(totalCollectedPaise)}</span>
      </div>
    </div>
  );
};

export default CollectionCard;
