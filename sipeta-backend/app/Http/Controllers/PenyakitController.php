<?php

namespace App\Http\Controllers;

use App\Models\Penyakit;
use Illuminate\Http\Request;

class PenyakitController extends Controller
{
    protected $model = Penyakit::class;
    public function index()
    {
        // Ambil semua penyakit, dipakai untuk dropdown di frontend
        return response()->json(Penyakit::orderBy('nama_penyakit')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_penyakit' => 'required|string|max:100',
            'kode_icd'      => 'nullable|string|max:20',
            'kategori'      => 'nullable|string',
            'threshold_ews' => 'nullable|integer',
        ]);

        return response()->json(Penyakit::create($request->all()), 201);
    }

    public function show($id)
    {
        return response()->json(Penyakit::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $data = Penyakit::findOrFail($id);
        $data->update($request->all());
        return response()->json($data);
    }

    public function destroy($id)
    {
        Penyakit::destroy($id);
        return response()->json(['message' => 'Penyakit berhasil dihapus']);
    }
}