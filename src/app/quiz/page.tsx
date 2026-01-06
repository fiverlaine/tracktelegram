"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Dados das perguntas
const questions = [
  {
    id: 1,
    question: "Qual nicho você atua?",
    subtitle: "Selecione o que mais se aproxima do seu negócio",
    options: [
      { value: "igaming", label: "iGaming / Apostas", icon: "🎰", multiplier: 1.5 },
      { value: "infoproduto", label: "Infoprodutos / Cursos", icon: "📚", multiplier: 1.2 },
      { value: "ecommerce", label: "E-commerce / Dropshipping", icon: "🛒", multiplier: 1.0 },
      { value: "servicos", label: "Serviços / Agência", icon: "💼", multiplier: 1.1 },
      { value: "outro", label: "Outro nicho", icon: "🚀", multiplier: 1.0 },
    ],
  },
  {
    id: 2,
    question: "Quanto você investe em anúncios por mês?",
    subtitle: "Considere todos os canais (Meta, Google, TikTok)",
    options: [
      { value: "1000", label: "Até R$ 1.000", icon: "💵", amount: 1000 },
      { value: "5000", label: "R$ 1.000 a R$ 5.000", icon: "💰", amount: 5000 },
      { value: "15000", label: "R$ 5.000 a R$ 15.000", icon: "💎", amount: 15000 },
      { value: "30000", label: "R$ 15.000 a R$ 30.000", icon: "🏆", amount: 30000 },
      { value: "50000", label: "Mais de R$ 30.000", icon: "👑", amount: 50000 },
    ],
  },
  {
    id: 3,
    question: "Você usa Telegram como canal de vendas?",
    subtitle: "Canais, grupos ou bot para captação de leads",
    options: [
      { value: "sim_principal", label: "Sim, é meu canal principal", icon: "✅", weight: 1.0 },
      { value: "sim_secundario", label: "Sim, mas é secundário", icon: "📱", weight: 0.7 },
      { value: "pretendo", label: "Pretendo começar", icon: "🎯", weight: 0.5 },
      { value: "nao", label: "Não uso Telegram", icon: "❌", weight: 0.3 },
    ],
  },
  {
    id: 4,
    question: "Como você rastreia seus leads do Telegram hoje?",
    subtitle: "Seja honesto, isso afeta seu diagnóstico",
    options: [
      { value: "nao_rastreia", label: "Não rastreio, só vejo membros", icon: "😢", lossRate: 0.45 },
      { value: "planilha", label: "Planilha manual / UTMs", icon: "📊", lossRate: 0.35 },
      { value: "ferramenta_basica", label: "Ferramenta básica (sem CAPI)", icon: "🔧", lossRate: 0.25 },
      { value: "ferramenta_capi", label: "Já uso CAPI para Telegram", icon: "🚀", lossRate: 0.10 },
    ],
  },
  {
    id: 5,
    question: "Qual sua maior dor com Telegram Ads?",
    subtitle: "O que mais te frustra no dia a dia",
    options: [
      { value: "cpl_alto", label: "CPL muito alto / Lead caro", icon: "📈", pain: "cpl" },
      { value: "otimizacao", label: "Não consigo otimizar campanhas", icon: "🎯", pain: "otimizacao" },
      { value: "atribuicao", label: "Não sei qual anúncio converte", icon: "❓", pain: "atribuicao" },
      { value: "escala", label: "Não consigo escalar", icon: "📉", pain: "escala" },
    ],
  },
];

// Função para formatar número como moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Componente de Progresso
const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const progress = (current / total) * 100;
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
};

// Componente de Opção
const OptionCard = ({
  option,
  isSelected,
  onClick,
}: {
  option: any;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`
        relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-300
        ${
          isSelected
            ? "border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20"
            : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
        }
      `}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl">{option.icon}</span>
        <span className={`text-lg font-medium ${isSelected ? "text-emerald-300" : "text-white"}`}>
          {option.label}
        </span>
      </div>
      {isSelected && (
        <motion.div
          className="absolute top-4 right-4 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <svg className="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
};

// Componente de Resultado
const ResultCard = ({
  answers,
  onWhatsApp,
}: {
  answers: Record<number, any>;
  onWhatsApp: () => void;
}) => {
  // Cálculos baseados nas respostas
  const investimento = answers[2]?.amount || 5000;
  const multiplier = answers[1]?.multiplier || 1.0;
  const weight = answers[3]?.weight || 0.5;
  const lossRate = answers[4]?.lossRate || 0.35;
  const pain = answers[5]?.pain || "atribuicao";

  // Cálculo do prejuízo mensal
  const prejuizoMensal = Math.round(investimento * lossRate * multiplier * weight);
  const prejuizoAnual = prejuizoMensal * 12;

  // Potencial de economia
  const economiaEstimada = Math.round(prejuizoMensal * 0.7);
  const roiPotencial = Math.round((economiaEstimada / 197) * 100); // Assumindo plano de R$ 197

  // Mensagens personalizadas por dor
  const painMessages: Record<string, { title: string; tip: string }> = {
    cpl: {
      title: "Seu CPL está alto porque o algoritmo não sabe quem realmente converte.",
      tip: "Com rastreamento CAPI, o Meta aprende a encontrar pessoas parecidas com quem realmente entra no seu canal.",
    },
    otimizacao: {
      title: "Sem dados reais, você otimiza no escuro.",
      tip: "O TeleTrack mostra exatamente qual criativo, público e posicionamento gera membros reais.",
    },
    atribuicao: {
      title: "Você está jogando dinheiro fora sem saber.",
      tip: "Cada membro que entra no seu canal é vinculado ao anúncio de origem com 100% de precisão.",
    },
    escala: {
      title: "Escalar sem dados é multiplicar o prejuízo.",
      tip: "Primeiro, descubra o que funciona. Depois, escale com confiança usando dados reais.",
    },
  };

  const message = painMessages[pain] || painMessages.atribuicao;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header do Resultado */}
      <div className="text-center mb-8">
        <motion.div
          className="inline-block mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        >
          <span className="text-6xl">📊</span>
        </motion.div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Seu Diagnóstico</h2>
        <p className="text-white/60">Baseado nas suas respostas</p>
      </div>

      {/* Card Principal - Prejuízo */}
      <motion.div
        className="relative p-8 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/30 mb-6 overflow-hidden"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-red-300 text-sm font-medium mb-2 uppercase tracking-wider">
            Você está perdendo por mês
          </p>
          <motion.p
            className="text-5xl md:text-6xl font-bold text-red-400 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {formatCurrency(prejuizoMensal)}
          </motion.p>
          <p className="text-white/60">
            Isso representa <span className="text-red-400 font-bold">{formatCurrency(prejuizoAnual)}</span> por ano
            em verba desperdiçada.
          </p>
        </div>
      </motion.div>

      {/* Card de Insight */}
      <motion.div
        className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex gap-4">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-white font-semibold mb-2">{message.title}</p>
            <p className="text-white/60 text-sm">{message.tip}</p>
          </div>
        </div>
      </motion.div>

      {/* Card de Economia */}
      <motion.div
        className="relative p-8 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 mb-8 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-emerald-300 text-sm font-medium mb-2 uppercase tracking-wider">
            Economia estimada com TeleTrack
          </p>
          <motion.p
            className="text-4xl md:text-5xl font-bold text-emerald-400 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {formatCurrency(economiaEstimada)}/mês
          </motion.p>
          <div className="flex items-center gap-2 text-white/60">
            <span className="text-emerald-400 font-bold">{roiPotencial}%</span>
            <span>de ROI potencial sobre a assinatura</span>
          </div>
        </div>
      </motion.div>

      {/* Benefícios */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[
          { icon: "🎯", text: "Atribuição 100% precisa" },
          { icon: "📈", text: "CPL até 50% menor" },
          { icon: "⚡", text: "Setup em 5 minutos" },
        ].map((benefit, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <span className="text-xl">{benefit.icon}</span>
            <span className="text-white/80 text-sm">{benefit.text}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA WhatsApp */}
      <motion.button
        onClick={onWhatsApp}
        className="w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center gap-3"
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        Quero parar de perder dinheiro
      </motion.button>

      <p className="text-center text-white/40 text-sm mt-4">
        Fale com um especialista e comece a rastrear hoje mesmo
      </p>
    </motion.div>
  );
};

// Componente Principal
export default function QuizPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [selectedOption, setSelectedOption] = useState<any>(null);

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;

  const handleSelect = (option: any) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (!selectedOption) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedOption,
    }));

    if (isLastQuestion) {
      setIsComplete(true);
    } else {
      setCurrentStep((prev) => prev + 1);
      setSelectedOption(null);
    }
  };

  const handleWhatsApp = () => {
    const investimento = answers[2]?.amount || 5000;
    const multiplier = answers[1]?.multiplier || 1.0;
    const weight = answers[3]?.weight || 0.5;
    const lossRate = answers[4]?.lossRate || 0.35;
    const nicho = answers[1]?.label || "Não informado";
    const dor = answers[5]?.label || "Não informado";

    const prejuizoMensal = Math.round(investimento * lossRate * multiplier * weight);

    const message = `🎯 *Diagnóstico TeleTrack*

Olá! Acabei de fazer o diagnóstico no site e descobri que estou perdendo aproximadamente *${formatCurrency(prejuizoMensal)}/mês* em verba de anúncios.

📊 *Meus dados:*
• Nicho: ${nicho}
• Investimento mensal: ${formatCurrency(investimento)}
• Principal dor: ${dor}

Quero saber como o TeleTrack pode me ajudar a parar de perder dinheiro e otimizar minhas campanhas para o Telegram.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = "5511999999999"; // Substitua pelo seu número
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4"
          >
            <span className="text-emerald-400 text-sm font-medium">⚡ Diagnóstico Gratuito</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-white mb-2"
          >
            Quanto você está{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              perdendo
            </span>{" "}
            sem rastrear?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60 max-w-lg mx-auto"
          >
            Responda 5 perguntas rápidas e descubra quanto dinheiro você está deixando na mesa
          </motion.p>
        </div>

        {/* Progress */}
        {!isComplete && (
          <motion.div
            className="max-w-xl mx-auto w-full mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex justify-between text-sm text-white/40 mb-2">
              <span>Pergunta {currentStep + 1} de {questions.length}</span>
              <span>{Math.round(((currentStep + 1) / questions.length) * 100)}% completo</span>
            </div>
            <ProgressBar current={currentStep + 1} total={questions.length} />
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isComplete ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-xl mx-auto"
              >
                {/* Question */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {currentQuestion.question}
                  </h2>
                  <p className="text-white/50">{currentQuestion.subtitle}</p>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-8">
                  {currentQuestion.options.map((option) => (
                    <OptionCard
                      key={option.value}
                      option={option}
                      isSelected={selectedOption?.value === option.value}
                      onClick={() => handleSelect(option)}
                    />
                  ))}
                </div>

                {/* Next Button */}
                <motion.button
                  onClick={handleNext}
                  disabled={!selectedOption}
                  className={`
                    w-full py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300
                    ${
                      selectedOption
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }
                  `}
                  whileHover={selectedOption ? { scale: 1.02 } : {}}
                  whileTap={selectedOption ? { scale: 0.98 } : {}}
                >
                  {isLastQuestion ? "Ver meu diagnóstico" : "Próxima pergunta"}
                </motion.button>
              </motion.div>
            ) : (
              <ResultCard answers={answers} onWhatsApp={handleWhatsApp} />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-white/30 text-sm">
            🔒 Suas respostas são confidenciais e não serão compartilhadas
          </p>
        </motion.div>
      </div>
    </div>
  );
}
