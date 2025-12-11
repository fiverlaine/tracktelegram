export interface Plan {
    id: string;
    name: string;
    price: string;
    description: string;
    features: string[];
    highlight?: boolean;
    buttonText?: string;
    color: string;
    checkoutUrl?: string; // Added field
    limits: {
        domains: number;
        pixels: number;
        channels: number;
        funnels: number | 'unlimited';
        entries: number | 'unlimited';
    };
}

export const plans: Plan[] = [
    {
        id: "starter",
        name: "Starter (Teste)",
        price: "5",
        description: "Ideal para quem está começando a escalar suas campanhas.",
        color: "blue",
        checkoutUrl: "https://pay.cakto.com.br/whxxcwj_684643",
        features: [
            "5 Domínios Personalizados",
            "5 Pixels do Facebook",
            "2 Canais/Bots Telegram",
            "10 Funis de Rastreamento",
            "Entradas Ilimitadas",
            "Suporte por Email"
        ],
        limits: {
            domains: 5,
            pixels: 5,
            channels: 2,
            funnels: 10,
            entries: 'unlimited'
        }
    },
    {
        id: "pro",
        name: "Pro Scale",
        price: "197",
        description: "Para players que precisam de mais volume e estrutura.",
        highlight: true,
        color: "violet",
        buttonText: "Assinar Plano Pro",
        features: [
            "15 Domínios Personalizados",
            "15 Pixels do Facebook",
            "5 Canais/Bots Telegram",
            "Funis Ilimitados",
            "Entradas Ilimitadas",
            "Suporte Prioritário",
            "Acesso à API (Em breve)"
        ],
        limits: {
            domains: 15,
            pixels: 15,
            channels: 5,
            funnels: 'unlimited',
            entries: 'unlimited'
        }
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: "297",
        description: "Liberdade total para grandes operações e agências.",
        color: "emerald",
        features: [
            "Domínios Ilimitados",
            "Pixels Ilimitados",
            "Canais Ilimitados",
            "Funis Ilimitados",
            "Entradas Ilimitadas",
            "Gerente de Conta Dedicado",
            "White Label (Em breve)"
        ],
        limits: {
            domains: 9999, // "Unlimited" for practical purposes
            pixels: 9999,
            channels: 9999,
            funnels: 'unlimited',
            entries: 'unlimited'
        }
    }
];

export function getPlanLimits(planName: string | null) {
    if (!planName) return null;
    return plans.find(p => p.name === planName)?.limits || null;
}
