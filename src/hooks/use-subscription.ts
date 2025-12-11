"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useSubscription() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [plan, setPlan] = useState<string | null>(null);

    useEffect(() => {
        async function checkSubscription() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsSubscribed(false);
                setIsLoading(false);
                return;
            }

            const { data: subscription } = await supabase
                .from("subscriptions")
                .select("status, plan_name")
                .eq("user_id", user.id)
                .single();

            // Check if status is active or trial
            if (subscription && (subscription.status === "active" || subscription.status === "trialing")) {
                setIsSubscribed(true);
                setPlan(subscription.plan_name);
            } else {
                setIsSubscribed(false);
            }
            
            setIsLoading(false);
        }

        checkSubscription();
    }, []);

    return { isLoading, isSubscribed, plan };
}
