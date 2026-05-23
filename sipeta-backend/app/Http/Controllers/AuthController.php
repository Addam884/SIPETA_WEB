<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Mail\ResetPasswordMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class AuthController extends Controller
{
    // REGISTER
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => 3 // default USER
        ]);

        return response()->json([
            'message' => 'Register berhasil',
            'user' => $user
        ]);
    }

    // LOGIN
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Email / password salah'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // 🔥 RESPONSE KONSISTEN
        return response()->json([
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'role' => $user->role->name // ✅ INI
            ]
        ]);
    }

    public function sendOtp(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);

        $user = User::where('email', $request->email)->first();
        
        // Generate 6 digit OTP
        $otp = rand(100000, 999999);
        
        // Simpan ke DB (berlaku 15 menit)
        $user->otp = $otp;
        $user->otp_expires_at = Carbon::now()->addMinutes(15);
        $user->save();

        // Kirim Email
        Mail::to($user->email)->send(new ResetPasswordMail($otp));

        return response()->json(['message' => 'OTP telah dikirim ke email Anda']);
    }

    // VERIFIKASI OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|digits:6'
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user->otp !== $request->otp || Carbon::now()->greaterThan($user->otp_expires_at)) {
            return response()->json(['message' => 'OTP tidak valid atau sudah kedaluwarsa'], 400);
        }

        return response()->json(['message' => 'OTP valid']);
    }

    // RESET PASSWORD
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|digits:6',
            'password' => 'required|min:6'
        ]);

        $user = User::where('email', $request->email)->first();

        // Double check OTP untuk keamanan
        if ($user->otp !== $request->otp || Carbon::now()->greaterThan($user->otp_expires_at)) {
            return response()->json(['message' => 'OTP tidak valid'], 400);
        }

        // Update password dan bersihkan OTP
        $user->password = Hash::make($request->password);
        $user->otp = null;
        $user->otp_expires_at = null;
        $user->save();

        return response()->json(['message' => 'Password berhasil diubah. Silakan login.']);
    }
}