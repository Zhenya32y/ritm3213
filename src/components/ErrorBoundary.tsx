import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Непредвиденная ошибка приложения',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let friendlyText =
        'Произошла ошибка при синхронизации или отображении данных. Попробуйте обновить страницу.';
      if (this.state.errorMessage.includes('Quota exceeded')) {
        friendlyText =
          'Превышен дневной лимит бесплатного тарифа базы данных. Лимит обновится завтра.';
      } else if (this.state.errorMessage.includes('Missing or insufficient permissions')) {
        friendlyText =
          'Недостаточно прав для выполнения операции в базе данных. Попробуйте перезайти в аккаунт Google.';
      }

      return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E5E2DA] rounded-xl p-8 text-center">
            <div className="w-11 h-11 rounded-full bg-[#F9EBEE] text-[#B84A5E] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-[#1C1B18] mb-2">
              Не удалось загрузить трекер
            </h2>
            <p className="text-sm text-[#5C5952] leading-relaxed mb-6">{friendlyText}</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1C1B18] rounded-lg hover:bg-[#33312C] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
