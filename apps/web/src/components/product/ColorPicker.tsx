export type ColorOption = {
  color: string;
  colorSlug: string;
  colorHex: string;
};

export function ColorPicker({
  options,
  value,
  onChange,
  unavailable,
}: {
  options: ColorOption[];
  value: string;
  onChange: (colorSlug: string) => void;
  unavailable?: (colorSlug: string) => boolean;
}) {
  const selected = options.find((option) => option.colorSlug === value);

  return (
    <div className="color-picker">
      <div className="color-picker-heading">
        <span className="muted">Finish</span>
        <strong className="color-picker-name">
          {selected?.color ?? 'Choose a color'}
        </strong>
      </div>
      <div className="color-picker-swatches" role="listbox" aria-label="Color">
        {options.map((option) => {
          const soldOut = unavailable?.(option.colorSlug) ?? false;
          return (
            <button
              key={option.colorSlug}
              type="button"
              role="option"
              className="color-swatch-btn"
              aria-selected={value === option.colorSlug}
              aria-label={
                soldOut ? `${option.color}, out of stock` : option.color
              }
              disabled={soldOut}
              onClick={() => onChange(option.colorSlug)}
            >
              <span
                className="color-swatch-disc"
                style={{ background: option.colorHex }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
