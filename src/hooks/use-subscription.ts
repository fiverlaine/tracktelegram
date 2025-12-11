"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

            // Check if status is active or trial
            if (sub && (sub.status === "active" || sub.status === "trialing")) {
                setIsSubscribed(true);
                setPlan(sub.plan_name);
                setSubscription(sub);
            } else {
                setIsSubscribed(false);
                setSubscription(sub); // maintain subscription data even if inactive (e.g. canceled)
            }
            
            setIsLoading(false);
        }

        checkSubscription();
    }, []);

    return { isLoading, isSubscribed, plan, subscription };
}
