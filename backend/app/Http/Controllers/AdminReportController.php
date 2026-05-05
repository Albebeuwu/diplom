<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\ReportStatus;
use App\Models\Fanfic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('admin');
    }

    // Получить все жалобы для админа
    public function index(Request $request)
    {
        $query = Report::with(['user', 'fanfic', 'status'])
            ->orderBy('created_at', 'desc');

        // Фильтр по статусу
        if ($request->has('status')) {
            $status = ReportStatus::where('name', $request->status)->first();
            if ($status) {
                $query->where('report_status_id', $status->id);
            }
        }

        // Поиск по названию фанфика или имени пользователя
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('fanfic', function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%");
                })->orWhereHas('user', function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                })->orWhere('reason', 'like', "%{$search}%");
            });
        }

        $reports = $query->paginate(20);

        return response()->json($reports);
    }

    // Получить статистику по жалобам
    public function stats()
    {
        $stats = [
            'total' => Report::count(),
            'pending' => Report::whereHas('status', fn($q) => $q->where('name', 'pending'))->count(),
            'approved' => Report::whereHas('status', fn($q) => $q->where('name', 'approved'))->count(),
            'rejected' => Report::whereHas('status', fn($q) => $q->where('name', 'rejected'))->count(),
        ];

        return response()->json($stats);
    }

    // Одобрить жалобу и принять меры к фанфику
    public function approve(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:warn,block,delete',
            'admin_note' => 'nullable|string|max:500',
        ]);

        $report = Report::with('fanfic')->findOrFail($id);
        
        $approvedStatus = ReportStatus::where('name', 'approved')->first();
        $report->update([
            'report_status_id' => $approvedStatus->id,
            'admin_comment' => $request->admin_note,
        ]);

        // Действия с фанфиком
        $fanfic = $report->fanfic;
        
        switch ($request->action) {
            case 'block':
                // Скрыть фанфик или заблокировать
                $fanfic->update(['status' => 'blocked']);
                break;
            case 'delete':
                // Удалить фанфик
                $fanfic->delete();
                break;
            case 'warn':
            default:
                // Просто предупреждение, ничего не делаем с фанфиком
                break;
        }

        return response()->json([
            'message' => 'Жалоба одобрена',
            'report' => $report->load('status')
        ]);
    }

    // Отклонить жалобу
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $report = Report::findOrFail($id);
        
        $rejectedStatus = ReportStatus::where('name', 'rejected')->first();
        $report->update([
            'report_status_id' => $rejectedStatus->id,
            'admin_comment' => $request->reason,
        ]);

        return response()->json([
            'message' => 'Жалоба отклонена',
            'report' => $report->load('status')
        ]);
    }

    // Получить детали жалобы
    public function show($id)
    {
        $report = Report::with(['user', 'fanfic.user', 'status'])->findOrFail($id);
        return response()->json($report);
    }
}