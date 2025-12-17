

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
      <div className="relative">
        {/* Animated ring */}
        <div className="w-16 h-16 border-4 border-white/10 border-t-violet-500 rounded-full animate-spin" />
        {/* Inner dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-violet-500 rounded-full animate-pulse" />
        </div>
      </div>
      <p className="mt-4 text-gray-500 text-sm font-medium">Carregando...</p>
    </div>
  );
}
