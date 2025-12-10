import ClientTracking from "./client-tracking";

// This is a Server Component - Next.js 15 requires params to be awaited
export default async function TrackingPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    // In Next.js 15, params is a Promise and must be awaited
    const { slug } = await params;

    return (
        <>
            <ClientTracking slug={slug} />
        </>
    );
}
