<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        // ❌ belum login
        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 401);
        }

        // ❌ role tidak sesuai
        if (!in_array($user->role->name, $roles)) {
            return response()->json([
                'message' => 'Forbidden (akses ditolak)'
            ], 403);
        }

        return $next($request);
    }
}