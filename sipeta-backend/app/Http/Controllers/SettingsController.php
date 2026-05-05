<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SettingsController extends Controller
{
    // ✅ GET PROFILE
    public function profile(Request $request)
    {
        return response()->json($request->user());
    }

    // ✅ UPDATE PROFILE
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required',
            'email' => 'required|email',
            'phone' => 'nullable',
        ]);

        $user->update($request->only('name', 'email', 'phone'));

        return response()->json([
            'message' => 'Profile updated',
            'user' => $user
        ]);
    }

    // ✅ UPDATE PASSWORD
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        if (!Hash::check($request->current, $user->password)) {
            return response()->json([
                'message' => 'Password salah'
            ], 400);
        }

        $request->validate([
            'newPass' => 'required|min:8'
        ]);

        $user->update([
            'password' => Hash::make($request->newPass)
        ]);

        return response()->json([
            'message' => 'Password updated'
        ]);
    }
}