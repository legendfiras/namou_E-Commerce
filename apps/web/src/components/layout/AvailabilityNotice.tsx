import {
  useStore,
  type StoreConnectionStatus,
} from '../../store/StoreContext.tsx';

export function AvailabilityNotice() {
  const { stockStatus, retryStorefront } = useStore();

  if (stockStatus === 'ready') {
    return null;
  }

  if (stockStatus === 'loading') {
    return (
      <p className="status-panel" role="status">
        Checking availability. You can browse while the store connects.
      </p>
    );
  }

  return (
    <div className="status-panel status-panel-error" role="alert">
      <p>
        Live products and stock could not be loaded. You can keep browsing,
        then try again.
      </p>
      <button
        type="button"
        className="secondary-button"
        onClick={retryStorefront}
      >
        Try again
      </button>
    </div>
  );
}

export function confirmedStockText(
  stockStatus: StoreConnectionStatus,
  stock: number,
  readyText: (stock: number) => string,
): string {
  if (stockStatus === 'loading') {
    return 'Checking availability';
  }
  if (stockStatus === 'error') {
    return 'Availability unavailable';
  }
  return readyText(stock);
}
