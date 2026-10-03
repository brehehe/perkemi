<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of users and roles.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $role = $request->input('role', 'all');

        $query = User::query()
            ->with(['roles:id,name', 'contingent:id,user_id,name,city'])
            ->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhereHas('contingent', function ($cq) use ($search) {
                        $cq->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($role && $role !== 'all') {
            $query->whereHas('roles', function ($rq) use ($role) {
                $rq->where('name', $role);
            });
        }

        $users = $query->paginate(15)->withQueryString();

        $users->getCollection()->transform(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'primary_role' => $user->roles->first()?->name ?? 'Pengguna',
                'contingent' => $user->contingent ? [
                    'id' => $user->contingent->id,
                    'name' => $user->contingent->name,
                    'city' => $user->contingent->city,
                ] : null,
                'created_at' => $user->created_at?->translatedFormat('d M Y') ?? '-',
            ];
        });

        $rolesList = Role::select(['id', 'name'])->orderBy('name')->get();

        $stats = [
            'total_users' => User::count(),
            'admin_users' => User::whereHas('roles', fn ($q) => $q->whereIn('name', ['Super Admin', 'Admin']))->count(),
            'contingent_users' => User::whereHas('roles', fn ($q) => $q->whereIn('name', ['kontingen', 'Contingent']))->count(),
            'referee_users' => User::whereHas('roles', fn ($q) => $q->whereIn('name', ['Wasit', 'Arbitrase', 'Perwasitan', 'Panitera']))->count(),
        ];

        return Inertia::render('Admin/Master/User/Index', [
            'users' => $users,
            'stats' => $stats,
            'rolesList' => $rolesList,
            'filters' => [
                'search' => $search ?? '',
                'role' => $role,
            ],
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'string', 'exists:roles,name'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        return redirect()->back()->with('success', "Pengguna {$user->name} berhasil ditambahkan dengan role {$validated['role']}.");
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', Password::defaults()],
            'role' => ['required', 'string', 'exists:roles,name'],
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => ! empty($validated['password']) ? Hash::make($validated['password']) : $user->password,
        ]);

        $user->syncRoles([$validated['role']]);

        return redirect()->back()->with('success', "Data pengguna {$user->name} berhasil diperbarui.");
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(User $user): RedirectResponse
    {
        if (auth()->id() === $user->id) {
            return redirect()->back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        DB::transaction(function () use ($user) {
            if ($user->contingent) {
                $user->contingent->registrations()->delete();
                $user->contingent->delete();
            }

            $user->forceDelete();
        });

        return redirect()->back()->with('success', 'Pengguna berhasil dihapus.');
    }
}
