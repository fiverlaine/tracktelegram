export default function Loading() {
    return (
        <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md font-sans animate-in fade-in duration-300">
            {/* Spinner Grande */}
            <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mb-8"></div>

            {/* Texto Principal */}
            <div className="text-white text-2xl font-bold tracking-[3px] uppercase mb-6 drop-shadow-lg animate-pulse">
                REDIRECIONANDO
            </div>

            {/* Status discreto */}
            <div className="absolute bottom-10 text-white/30 text-xs">
                Iniciando...
            </div>
        </div>
    );
}
