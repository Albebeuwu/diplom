<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\Fanfic;
use App\Models\ReportStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    // Получить жалобы текущего пользователя
    public function myReports(Request $request)
    {
        $reports = Report::with(['fanfic', 'status'])
            ->where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($reports);
    }

    // Создать жалобу на фанфик
    public function store(Request $request, $fanficId)
    {
        $fanfic = Fanfic::findOrFail($fanficId);

        // Проверяем, не отправлял ли пользователь уже жалобу на этот фанфик
        $existingReport = Report::where('user_id', Auth::id())
            ->where('fanfic_id', $fanficId)
            ->whereHas('status', function($q) {
                $q->where('name', 'pending');
            })
            ->first();

        if ($existingReport) {
            return response()->json([
                'error' => 'Вы уже отправили жалобу на этот фанфик. Она находится на рассмотрении.'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|min:10|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $pendingStatus = ReportStatus::where('name', 'pending')->first();

        $report = Report::create([
            'user_id' => Auth::id(),
            'fanfic_id' => $fanficId,
            'report_status_id' => $pendingStatus->id,
            'reason' => $request->reason,
        ]);

        return response()->json([
            'message' => 'Жалоба отправлена на рассмотрение',
            'report' => $report->load('status')
        ], 201);
    }

    // Получить детали жалобы
    public function show($id)
    {
        $report = Report::with(['fanfic', 'status', 'user'])
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        return response()->json($report);
    }
}