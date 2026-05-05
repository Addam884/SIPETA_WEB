<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use Illuminate\Http\Request;

class WilayahController extends Controller
{
    public function index()
    {
        // Ambil semua wilayah, dipakai untuk dropdown di frontend
        return response()->json(Wilayah::orderBy('nama_wilayah')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_wilayah' => 'required|string|max:100',
            'level'        => 'nullable|string',
            'parent_id'    => 'nullable|integer|exists:wilayah,id',
        ]);

        return response()->json(Wilayah::create($request->all()), 201);
    }

    public function show($id)
    {
        return response()->json(Wilayah::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $w = Wilayah::findOrFail($id);
        $w->update($request->all());
        return response()->json($w);
    }

    public function destroy($id)
    {
        Wilayah::destroy($id);
        return response()->json(['message' => 'Wilayah berhasil dihapus']);
    }
}