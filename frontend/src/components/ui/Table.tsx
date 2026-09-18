import { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

/** Tabela com header fixo de estilo, hover de linha e rolagem horizontal no mobile. */
export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-line bg-surface shadow-card ${className}`}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-canvas text-ink-muted">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-t border-line transition-colors first:border-t-0 hover:bg-canvas/70 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TH({ children, className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({ children, className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-middle text-ink ${className}`} {...props}>
      {children}
    </td>
  );
}
