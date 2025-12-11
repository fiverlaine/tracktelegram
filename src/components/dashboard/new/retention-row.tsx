interface RetentionData {
  dia: string;
  entradas: string | number;
  saidas: string | number;
  retencao: string;
  status: 'high' | 'med' | 'low';
}

export const RetentionRow = ({ data }: { data: RetentionData }) => {
  const getStatusColor = (status: string) => {
    if (status === 'high') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (status === 'med') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  return (
    <div className="group flex items-center justify-between p-3 mb-1.5 bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5 rounded-xl transition-all cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-300 group-hover:bg-white/10 transition-colors">
          {data.dia.split('/')[0]}
        </div>
        <div>
          <div className="text-sm font-medium text-white leading-none mb-1">{data.dia}</div>
          <div className="text-[10px] text-gray-500">Relatório</div>
        </div>
      </div>

      <div className="hidden sm:block text-right min-w-[60px]">
        <div className="text-sm font-bold text-gray-200 leading-none mb-1">{data.entradas}</div>
        <div className="text-[9px] uppercase tracking-wide text-gray-600">Entradas</div>
      </div>

      <div className="hidden sm:block text-right min-w-[60px]">
        <div className="text-sm font-bold text-gray-200 leading-none mb-1">{data.saidas}</div>
        <div className="text-[9px] uppercase tracking-wide text-gray-600">Saídas</div>
      </div>

      <div className={`px-2.5 py-1 rounded-md border text-[10px] font-bold ${getStatusColor(data.status)}`}>
        {data.retencao}
      </div>
    </div>
  );
};
