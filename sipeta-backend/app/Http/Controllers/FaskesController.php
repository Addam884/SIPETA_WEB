<?php

namespace App\Http\Controllers;

use App\Models\Faskes;
use Illuminate\Http\Request;

class FaskesController extends Controller
{
    public function index(Request $request)
    {
        $query = Faskes::query();
        
        // Filter berdasarkan wilayah_id (untuk dropdown faskes by wilayah)
        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }
        
        // Search berdasarkan nama
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('nama_faskes', 'ilike', "%{$search}%");
        }
        
        $data = $query->orderBy('nama_faskes')->get();
        
        return response()->json($data);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_faskes' => 'required|string|max:255',
            'wilayah_id'  => 'required|exists:wilayah,id',
            'geom'        => 'nullable',
        ]);

        $faskes = Faskes::create($request->all());

        return response()->json([
            'message' => 'Data faskes berhasil ditambahkan',
            'data'    => $faskes,
        ], 201);
    }

    public function show($id)
    {
        $faskes = Faskes::findOrFail($id);
        return response()->json($faskes);
    }

    public function update(Request $request, $id)
    {
        $faskes = Faskes::findOrFail($id);

        $request->validate([
            'nama_faskes' => 'required|string|max:255',
            'wilayah_id'  => 'required|exists:wilayah,id',
            'geom'        => 'nullable',
        ]);

        $faskes->update($request->all());

        return response()->json([
            'message' => 'Data faskes berhasil diupdate',
            'data'    => $faskes,
        ]);
    }

    public function destroy($id)
    {
        $faskes = Faskes::findOrFail($id);
        $faskes->delete();

        return response()->json([
            'message' => 'Data faskes berhasil dihapus',
        ]);
    }
}