"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { plans } from "@/config/subscription-plans";

export function useSubscription() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [plan, setPlan] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<any>(null);

    useEffect(() => {
        async function checkSubscription() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsSubscribed(false);
                setIsLoading(false);
                return;
            }

            const { data: sub } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", user.id)
                .single();

            // Perform normalization if we have a subscription
            if (sub && (sub.status === "active" || sub.status === "trialing" || sub.status !== "canceled")) {
                setIsSubscribed(sub.status === "active" || sub.status === "trialing");
                
                // Normalize plan name to match configuration
                let normalizedPlanName = sub.plan_name;
                const lowerName = (sub.plan_name || "").toLowerCase();

                const matchedPlan = plans.find(p => p.name === sub.plan_name) || 
                                  plans.find(p => p.id === sub.plan_name) ||
                                  plans.find(p => lowerName.includes('starter') && p.id === 'starter') ||
                                  plans.find(p => lowerName.includes('pro') && p.id === 'pro') ||
                                  plans.find(p => lowerName.includes('enterprise') && p.id === 'enterprise');

                if (matchedPlan) {
                    normalizedPlanName = matchedPlan.name;
                }

                setPlan(normalizedPlanName);
                setSubscription(sub);
            } else {
                setIsSubscribed(false);
                setSubscription(sub);
            }
            
            setIsLoading(false);
        }

        checkSubscription();
    }, []);

    return { isLoading, isSubscribed, plan, subscription };
}
