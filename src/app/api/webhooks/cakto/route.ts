import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the SERVICE ROLE key to bypass RLS
// This is safe because this code runs on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Verify Secret
    // Ensure you add CAKTO_WEBHOOK_SECRET to your .env.local and Vercel Environment Variables
    if (body.secret !== process.env.CAKTO_WEBHOOK_SECRET) {
      console.error("Invalid Webhook Secret");
      return NextResponse.json({ error: 'Unauthorized: Invalid secret' }, { status: 401 });
    }

    const { event, data } = body;
    const email = data?.customer?.email;

    if (!email) {
      return NextResponse.json({ message: 'No customer email found in payload' }, { status: 200 });
    }

    // 2. Find User by Email
    // We query the 'profiles' table which should be synced with auth.users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {

      return NextResponse.json({ message: 'User not found' }, { status: 200 });
    }

    const userId = profile.id;
    let status = 'active';

    // 3. Determine Status based on Event
    switch(event) {
        case 'subscription_canceled':
            status = 'canceled';
            break;
        case 'purchase_refused':
            status = 'past_due';
            break;
        case 'refund':
        case 'chargeback':
            status = 'canceled'; 
            break;
        case 'purchase_approved':
        case 'subscription_renewed':
            status = 'active';
            break;
        case 'boleto_gerado':
        case 'pix_gerado':
            status = 'waiting_payment';
            break;
        default:
            // For other events like 'checkout_abandonment', we might not want to update the main status
            // unless we have specific logic.
            // If it's a status we don't track, we might just return success.
            if (!['purchase_approved', 'subscription_renewed', 'subscription_canceled', 'refund'].includes(event)) {
                 return NextResponse.json({ message: `Event ${event} ignored` }, { status: 200 });
            }
            break;
    }

    // 4. Prepare Subscription Data
    const subData = data.subscription || {};

    // Helper to determine plan name based on price or name triggers
    const rawPlanName = data.offer?.name || data.product?.name || 'Starter (Teste)';
    const amount = parseFloat(data.offer?.price || data.amount || '0');

    let finalPlanName = rawPlanName;

    // Fix: Map exact plan names from Cakto Dashboard
    if (rawPlanName === 'Enterprise') {
        finalPlanName = 'Enterprise';
    } else if (rawPlanName === 'ProScale') {
        finalPlanName = 'Pro Scale';
    } else if (rawPlanName === 'Oferta Principal') {
        finalPlanName = 'Starter (Teste)';
    } else if (rawPlanName === 'TrackGram' || rawPlanName === 'TrackGram Assinatura') {
        // Fallback for legacy/generic product names
        if (amount >= 290) {
            finalPlanName = 'Enterprise';
        } else if (amount >= 190) {
            finalPlanName = 'Pro Scale';
        } else {
            finalPlanName = 'Starter (Teste)';
        }
    }

    const subscriptionPayload = {
        user_id: userId,
        cakto_id: subData.id || data.id,
        status: status,
        plan_name: finalPlanName,
        amount: amount,
        current_period_end: subData.next_payment_date 
            ? new Date(subData.next_payment_date).toISOString() 
            : null,
        updated_at: new Date().toISOString()
    };

    // 5. Upsert to Supabase
    const { error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert(subscriptionPayload, { onConflict: 'user_id' });

    if (upsertError) {
        console.error('Error updating subscription:', upsertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
