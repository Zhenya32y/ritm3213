import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import {
  CATEGORY_META,
  Habit,
  HabitCategory,
  HabitIconKey,
  ICON_OPTIONS,
} from '../types/habit';
import { HabitIcon } from './HabitIcon';

interface HabitModalProps {
  isOpen: boolean;
  editingHabit: Habit | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    icon: HabitIconKey;
    category: HabitCategory;
    goalPerMonth: number;
  }) => Promise<void> | void;
  onDelete?: (habit: Habit) => Promise<void> | void;
}

const GOAL_PRESETS = [4, 10, 15, 20, 31];
const CATEGORIES: HabitCategory[] = [
  'mindfulness',
  'health',
  'sport',
  'growth',
  'routine',
  'other',
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  editingHabit,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<HabitIconKey>('sparkles');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [goalPerMonth, setGoalPerMonth] = useState(20);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingHabit) {
        setName(editingHabit.name);
        setIcon(editingHabit.icon);
        setCategory(editingHabit.category);
        setGoalPerMonth(editingHabit.goalPerMonth);
      } else {
        setName('');
        setIcon('sparkles');
        setCategory('health');
        setGoalPerMonth(20);
      }
      setConfirmDelete(false);
      setError('');
      setSaving(false);
    }
  }, [isOpen, editingHabit]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Введите название привычки.');
      return;
    }
    if (trimmed.length > 80) {
      setError('Название должно быть короче 80 символов.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: trimmed,
        icon,
        category,
        goalPerMonth: Math.max(1, Math.min(31, Math.round(goalPerMonth))),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить привычку.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingHabit || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(editingHabit);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить привычку.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B18]/35 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-[#E5E2DA] rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECEAE4]">
          <h2 id="habit-modal-title" className="text-base font-semibold text-[#1C1B18]">
            {editingHabit ? 'Редактировать привычку' : 'Новая привычка'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6E6A61] hover:text-[#1C1B18] hover:bg-[#F4F2ED] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="habit-name" className="text-sm font-medium text-[#2E2C27]">
                Название
              </label>
              <span className="text-xs text-[#8C877C] tabular-nums">{name.length}/80</span>
            </div>
            <input
              id="habit-name"
              type="text"
              value={name}
              maxLength={80}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Медитация 15 минут"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1B18] placeholder:text-[#9E998E] focus:outline-none focus:border-[#1C1B18] focus:bg-white transition-colors"
            />
          </div>

          {/* Goal per month */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="habit-goal" className="text-sm font-medium text-[#2E2C27]">
                Цель на месяц (дней)
              </label>
              <span className="font-mono text-sm font-semibold text-[#1C1B18] tabular-nums">
                {goalPerMonth} дн.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="habit-goal"
                type="range"
                min={1}
                max={31}
                value={goalPerMonth}
                onChange={(e) => setGoalPerMonth(Number(e.target.value))}
                className="flex-1 accent-[#5A8D63] cursor-pointer"
              />
              <input
                type="number"
                min={1}
                max={31}
                value={goalPerMonth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) setGoalPerMonth(Math.max(1, Math.min(31, val)));
                }}
                aria-label="Цель на месяц числом"
                className="w-16 px-2.5 py-1.5 text-sm font-mono text-center bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg tabular-nums focus:outline-none focus:border-[#1C1B18]"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoalPerMonth(preset)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
                    goalPerMonth === preset
                      ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                      : 'bg-white text-[#5C5952] border-[#E5E2DA] hover:border-[#BDB8AD]'
                  }`}
                >
                  {preset === 31 ? 'Каждый день (31)' : `${preset} дн.`}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <span className="block text-sm font-medium text-[#2E2C27] mb-2">Категория</span>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#1C1B18] bg-[#1C1B18] text-white'
                        : 'border-[#E5E2DA] bg-white text-[#4A4740] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <span className="block text-sm font-medium text-[#2E2C27] mb-2">Иконка</span>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
              {ICON_OPTIONS.map((opt) => {
                const active = icon === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    title={opt.label}
                    aria-label={opt.label}
                    onClick={() => setIcon(opt.key)}
                    className={`h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'border-[#1C1B18] bg-[#1C1B18] text-white'
                        : 'border-[#E5E2DA] bg-white text-[#4A4740] hover:bg-[#F4F2ED]'
                    }`}
                  >
                    <HabitIcon icon={opt.key} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#B84A5E] bg-[#F9EBEE] px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#ECEAE4]">
            <div>
              {editingHabit && onDelete && (
                <>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#B84A5E] hover:bg-[#F9EBEE] rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleDelete}
                        className="px-3 py-2 text-xs font-medium text-white bg-[#B84A5E] hover:bg-[#9E3C4E] rounded-lg transition-colors cursor-pointer"
                      >
                        Подтвердить удаление
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2.5 py-2 text-xs text-[#6E6A61] hover:text-[#1C1B18] cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[#5C5952] hover:text-[#1C1B18] hover:bg-[#F4F2ED] rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-[#1C1B18] hover:bg-[#33312C] disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {saving ? 'Сохранение...' : editingHabit ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
