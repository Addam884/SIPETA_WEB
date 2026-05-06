<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class SettingsController extends Controller
{
    // ✅ GET PROFILE (CONSISTENT)
    public function profile(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'role_id' => $user->role_id
        ]);
    }

    // ✅ UPDATE PROFILE
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|required',
            'email' => 'sometimes|required|email',
            'phone' => 'nullable|max:20',
            'avatar' => 'nullable|image|mimes:jpg,jpeg,png|max:2048'
        ]);

        // avatar
        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }

            $manager = new ImageManager(new Driver());

            $image = $manager->read($request->file('avatar'))
                ->cover(300, 300)
                ->toJpeg(80);

            $filename = time() . '.jpg';
            $path = 'avatars/' . $filename;

            Storage::disk('public')->put($path, $image);

            $user->avatar = $path;
        }

        $user->update($request->only(['name', 'email', 'phone']));
        $user->save();

        return response()->json([
            'message' => 'Profile updated',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'role_id' => $user->role_id
            ]
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
            'newPass' => 'required|min:6'
        ]);

        $user->update([
            'password' => Hash::make($request->newPass)
        ]);

        return response()->json([
            'message' => 'Password updated'
        ]);
    }
}