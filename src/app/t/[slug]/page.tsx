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

    return (
        <>
            <ClientTracking slug={slug} ip={ip} />
        </>
    );
}
