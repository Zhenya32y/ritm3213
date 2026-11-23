import React, { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ResetStatsModalProps {
  isOpen: boolean;
  totalLogsCount: number;
  habitsCount: number;
  onClose: () => void;
  onConfirmReset: () => Promise<void> | void;
}

export const ResetStatsModal: React.FC<ResetStatsModalProps> = ({
  isOpen,
  totalLogsCount,
  habitsCount,
  onClose,
  onConfirmReset,
}) => {
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmedCheck(false);
      setConfirmText('');
      setResetting(false);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !resetting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, resetting, onClose]);

  if (!isOpen) return null;

  const normalizedInput = confirmText.trim().toUpperCase();
  const isWordMatched = normalizedInput === 'СБРОС' || normalizedInput === 'RESET';
  const canSubmit = confirmedCheck && isWordMatched && !resetting;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setResetting(true);
    setError('');
    try {
      await onConfirmReset();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось сбросить статистику. Попробуйте ещё раз.'
      );
      setResetting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B18]/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !resetting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-stats-title"
    >
      <div className="w-full max-w-md bg-white border border-[#E5E2DA] rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECEAE4]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#F9EBEE] text-[#B84A5E] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h2 id="reset-stats-title" className="text-base font-semibold text-[#1C1B18]">
              Полный сброс статистики
            </h2>
          </div>
          <button
            type="button"
            disabled={resetting}
            onClick={onClose}
            aria-label="Закрыть окно"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6E6A61] hover:text-[#1C1B18] hover:bg-[#F4F2ED] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          <div className="space-y-2 text-sm text-[#4A4740] leading-relaxed">
            <p>
              Это действие <strong className="text-[#1C1B18]">безвозвратно удалит</strong> всю
              историю выполнения за все месяцы:
            </p>
            <ul className="space-y-1 text-xs text-[#5C5952] bg-[#FAF9F6] border border-[#ECEAE4] rounded-lg p-3.5 font-mono tabular-nums">
              <li>· Отметок выполнения к удалению: {totalLogsCount}</li>
              <li>· Серии, проценты и все графики обнулятся</li>
              <li>· Список привычек ({habitsCount} шт.) сохранится</li>
            </ul>
          </div>

          {/* Extra confirmation step 1: Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedCheck}
              onChange={(e) => setConfirmedCheck(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#B84A5E] rounded cursor-pointer shrink-0"
            />
            <span className="text-xs text-[#2E2C27] leading-snug">
              Я понимаю, что все ежедневные отметки, серии и история графиков будут удалены без
              возможности восстановления.
            </span>
          </label>

          {/* Extra confirmation step 2: Type СБРОС */}
          <div>
            <label
              htmlFor="reset-confirm-input"
              className="block text-xs font-medium text-[#2E2C27] mb-1.5"
            >
              Для подтверждения введите слово{' '}
              <span className="font-mono font-semibold text-[#B84A5E]">СБРОС</span>
            </label>
            <input
              id="reset-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="СБРОС"
              autoComplete="off"
              className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1B18] placeholder:text-[#B5B0A6] focus:outline-none focus:border-[#B84A5E] focus:bg-white transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-[#B84A5E] bg-[#F9EBEE] px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ECEAE4]">
            <button
              type="button"
              disabled={resetting}
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#5C5952] hover:text-[#1C1B18] hover:bg-[#F4F2ED] rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#B84A5E] hover:bg-[#9E3C4E] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {resetting ? 'Сброс...' : 'Сбросить статистику'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
