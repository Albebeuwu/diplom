<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Fanfic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CommentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['index']);
    }

    // Получить комментарии для фанфика
    public function index($fanficId)
    {
        $fanfic = Fanfic::findOrFail($fanficId);
        
        $comments = Comment::with('user')
            ->where('fanfic_id', $fanficId)
            ->latest()
            ->paginate(20);

        return response()->json($comments);
    }

    // Создать комментарий
    public function store(Request $request, $fanficId)
    {
        $fanfic = Fanfic::findOrFail($fanficId);

        $validator = Validator::make($request->all(), [
            'content' => 'required|string|min:2|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment = Comment::create([
            'user_id' => Auth::id(),
            'fanfic_id' => $fanficId,
            'content' => $request->content,
        ]);

        return response()->json([
            'message' => 'Комментарий добавлен',
            'comment' => $comment->load('user')
        ], 201);
    }

    // Обновить комментарий
    public function update(Request $request, $id)
    {
        $comment = Comment::where('user_id', Auth::id())->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'content' => 'required|string|min:2|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment->update([
            'content' => $request->content,
            'is_edited' => true,
        ]);

        return response()->json([
            'message' => 'Комментарий обновлен',
            'comment' => $comment->load('user')
        ]);
    }

    // Удалить комментарий
    public function destroy($id)
    {
        $comment = Comment::where('user_id', Auth::id())->findOrFail($id);
        $comment->delete();

        return response()->json(['message' => 'Комментарий удален']);
    }
}