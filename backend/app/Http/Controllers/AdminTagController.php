<?php

namespace App\Http\Controllers;

use App\Models\FanficTag;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminTagController extends Controller
{
    public function index(Request $request)
    {
        $query = FanficTag::orderBy('name', 'asc');
        
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        
        $tags = $query->withCount('fanfics')->paginate(
            $request->input('per_page', 20)
        );
        
        return response()->json($tags);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:fanfic_tags,name',
            'slug' => 'nullable|string|max:100|unique:fanfic_tags,slug',
            'category' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500'
        ]);
        
        $tag = FanficTag::create([
            'name' => $request->name,
            'slug' => $request->slug ?? Str::slug($request->name),
            'category' => $request->category,
            'description' => $request->description
        ]);
        
        return response()->json(['message' => 'Тег создан', 'tag' => $tag], 201);
    }

    public function update(Request $request, $id)
    {
        $tag = FanficTag::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:100|unique:fanfic_tags,name,' . $id,
            'slug' => 'nullable|string|max:100|unique:fanfic_tags,slug,' . $id,
            'category' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500'
        ]);
        
        $tag->update([
            'name' => $request->name,
            'slug' => $request->slug ?? Str::slug($request->name),
            'category' => $request->category,
            'description' => $request->description
        ]);
        
        return response()->json(['message' => 'Тег обновлён', 'tag' => $tag]);
    }

    public function destroy($id)
    {
        $tag = FanficTag::findOrFail($id);
        
        if ($tag->fanfics()->count() > 0) {
            return response()->json([
                'error' => 'Нельзя удалить тег, который используется в фанфиках'
            ], 400);
        }
        
        $tag->delete();
        return response()->json(['message' => 'Тег удалён']);
    }
}