import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    // Atualiza a sessão do Supabase (cookies)
    const { response, user } = await updateSession(request);
    
    // Array de rotas que requerem autenticação
    const protectedRoutes = [
        "/channels",
        "/domains",
        "/funnels",
        "/logs",
        "/messages",
        "/pixels",
        "/postbacks",
        "/subscription",
        "/utms",
        "/dashboard" 
    ];

    // Verifica se a rota atual é protegida
    const isProtectedRoute = protectedRoutes.some(route => 
        request.nextUrl.pathname.startsWith(route) || request.nextUrl.pathname === "/"
    );

    // Se estiver em rota protegida e não tiver usuário, redireciona para login
    if (isProtectedRoute && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - login (auth page)
         * - t (public tracking routes)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|login|t/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
