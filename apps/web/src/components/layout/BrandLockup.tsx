import { Link } from 'react-router-dom';

type BrandLockupProps = {
  size?: 'sm' | 'md';
};

export function BrandLockup({ size = 'sm' }: BrandLockupProps) {
  return (
    <Link
      className={`brand-lockup brand-lockup-${size}`}
      to="/"
      aria-label="Firas Cell home"
    >
      <img
        className="brand-mark"
        src="/images/brand/namou-mark.png"
        alt=""
        width={128}
        height={128}
      />
      <span className="wordmark">
        <span className="wordmark-full">Firas Cell</span>
        <span className="wordmark-short">Firas Cell</span>
      </span>
    </Link>
  );
}
