import { headers } from "next/headers";
import ClientTracking from "./client-tracking";

// This is a Server Component - Next.js 15 requires params to be awaited
export default async function TrackingPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    // In Next.js 15, params is a Promise and must be awaited
    const { slug } = await params;
    
    // Capturar IP do servidor
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "0.0.0.0";

    // Capturar Headers de Geolocalização (Vercel)
    const city = headersList.get("x-vercel-ip-city");
    const country = headersList.get("x-vercel-ip-country");
    const region = headersList.get("x-vercel-ip-country-region"); // State

    return (
        <>
            <ClientTracking 
                slug={slug} 
                ip={ip} 
                geo={{
                    city: city ? decodeURIComponent(city) : undefined,
                    country: country || undefined,
                    region: region || undefined
                }}
            />
        </>
    );
}
