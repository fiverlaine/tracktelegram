import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8 px-2 md:px-0 pt-2">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
            Online
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
          {title}
        </h1>
        {description && <p className="text-gray-400 text-sm">{description}</p>}
      </div>

      <div className="w-full xl:w-auto p-1 bg-white/[0.03] border border-white/5 backdrop-blur-md rounded-xl flex flex-col sm:flex-row gap-2">
        {children}
      </div>
    </header>
  );
}
