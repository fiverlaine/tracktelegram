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
        name: "Starter",
        price: "97",
        description: "Mais recursos que a concorrência pelo menor preço.",
        color: "blue",
        checkoutUrl: "https://pay.cakto.com.br/whxxcwj_684643", // Atualize com o link correto depois
        features: [
            "2 Domínios Personalizados",
            "2 Pixels do Facebook",
            "1 Canal Telegram",
            "5 Funis",
            "Até 20.000 Leads/mês",
            "Suporte Prioritário"
        ],
        limits: {
            domains: 2,
            pixels: 2,
            channels: 1,
            funnels: 5,
            entries: 20000
        }
    },
    {
        id: "pro",
        name: "Pro Scale",
        price: "197",
        description: "O melhor custo-benefício para quem está escalando.",
        highlight: true,
        color: "violet",
        buttonText: "Assinar Plano Pro",
        checkoutUrl: "https://pay.cakto.com.br/link_pro", // Atualize com o link correto
        features: [
            "4 Domínios Personalizados",
            "4 Pixels do Facebook",
            "2 Canais Telegram",
            "10 Funis",
            "Até 100.000 Leads/mês",
            "Suporte Prioritário",
        ],
        limits: {
            domains: 4,
            pixels: 4,
            channels: 2,
            funnels: 10,
            entries: 100000
        }
    },
    {
        id: "agency",
        name: "Agency",
        price: "297",
        description: "Infraestrutura robusta para grandes operações.",
        color: "emerald",
        checkoutUrl: "https://pay.cakto.com.br/link_agency", // Atualize com o link correto
        features: [
            "10 Domínios Personalizados",
            "10 Pixels do Facebook",
            "5 Canais Telegram",
            "Funis ilimitados",
            "Leads ilimitados",
            "Suporte Prioritário",
        ],
        limits: {
            domains: 10,
            pixels: 10,
            channels: 5,
            funnels: 'unlimited',
            entries: 'unlimited'
        }
    }
];

export function getPlanLimits(planName: string | null) {
    if (!planName) return null;
    
    // 1. Try exact match by name
    let plan = plans.find(p => p.name === planName);
    if (plan) return plan.limits;

    // 2. Try match by ID (case insensitive)
    plan = plans.find(p => p.id.toLowerCase() === planName.toLowerCase());
    if (plan) return plan.limits;

    // 3. Try partial matches for common cases (fallback)
    const lowerName = planName.toLowerCase();
    
    if (lowerName.includes('starter')) return plans.find(p => p.id === 'starter')?.limits || null;
    if (lowerName.includes('pro')) return plans.find(p => p.id === 'pro')?.limits || null;
    if (lowerName.includes('agency')) return plans.find(p => p.id === 'agency')?.limits || null;

    return null;
}
