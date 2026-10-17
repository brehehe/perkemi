<?php

namespace App\Services\Admin\Master;

use App\Actions\Admin\Master\SyncLoginAccountAction;
use App\Enums\ContingentStatus;
use App\Models\Athlete;
use App\Models\Clerk;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\FieldCoordinator;
use App\Models\Kyu;
use App\Models\Official;
use App\Models\PaymentMethod;
use App\Models\Referee;
use App\Models\Technique;
use App\Models\User;
use App\Models\WeightClass;
use App\Support\PhoneNumber;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class MasterDataTransferService
{
    /** @var array<string, array{headers: list<string>, required: list<string>, login: bool}> */
    private const TYPES = [
        'contingent' => [
            'headers' => ['id', 'event_id', 'event_name', 'name', 'city', 'manager_name', 'phone', 'email', 'address', 'status'],
            'required' => ['name', 'city', 'manager_name', 'phone', 'email'],
            'login' => true,
        ],
        'athlete' => [
            'headers' => ['id', 'contingent_id', 'contingent_name', 'name', 'nik', 'kenshi_number', 'gender', 'birth_place', 'blood_type', 'home_address', 'dojo_name', 'kyu_dan', 'weight', 'height', 'birth_date', 'bpjs_number', 'bpjs_status', 'school_name', 'school_level', 'school_entry_year', 'school_grade'],
            'required' => ['name', 'gender', 'kyu_dan'],
            'login' => false,
        ],
        'official' => [
            'headers' => ['id', 'contingent_id', 'contingent_name', 'name', 'role', 'gender', 'phone', 'email', 'id_card_number', 'notes'],
            'required' => ['name', 'role', 'gender'],
            'login' => false,
        ],
        'kyu' => [
            'headers' => ['id', 'name', 'belt_color', 'order', 'is_active', 'description'],
            'required' => ['name', 'order'],
            'login' => false,
        ],
        'technique' => [
            'headers' => ['id', 'kyu_id', 'kyu_name', 'name', 'category', 'description', 'order', 'is_active'],
            'required' => ['name', 'order'],
            'login' => false,
        ],
        'weight-class' => [
            'headers' => ['id', 'name', 'gender', 'min_weight', 'max_weight', 'order', 'is_active', 'description'],
            'required' => ['name', 'gender', 'order'],
            'login' => false,
        ],
        'payment-method' => [
            'headers' => ['id', 'name', 'code', 'type', 'provider', 'account_name', 'account_number', 'instructions', 'order', 'is_active'],
            'required' => ['name', 'code', 'type', 'order'],
            'login' => false,
        ],
        'referee' => [
            'headers' => ['id', 'name', 'gender', 'dan_grade', 'license_number', 'certification_level', 'region', 'phone', 'email', 'notes', 'is_active'],
            'required' => ['name', 'gender'],
            'login' => true,
        ],
        'clerk' => [
            'headers' => ['id', 'name', 'employee_number', 'certification', 'region', 'phone', 'email', 'notes', 'is_active'],
            'required' => ['name'],
            'login' => true,
        ],
        'field-coordinator' => [
            'headers' => ['id', 'name', 'coordinator_number', 'region', 'phone', 'email', 'notes', 'is_active'],
            'required' => ['name'],
            'login' => true,
        ],
        'user' => [
            'headers' => ['id', 'name', 'email', 'phone', 'role'],
            'required' => ['name', 'email', 'role'],
            'login' => true,
        ],
    ];

    public function __construct(private readonly SyncLoginAccountAction $syncLoginAccount) {}

    public function template(string $type): string
    {
        $definition = $this->definition($type);
        $headers = $definition['headers'];

        if ($definition['login']) {
            $headers[] = 'password';
        }

        return $this->writeCsv($headers, []);
    }

    public function export(string $type, Request $request): string
    {
        $definition = $this->definition($type);

        return $this->writeCsv(
            $definition['headers'],
            $this->exportRows($type, $this->resolveEvent($request)),
        );
    }

    public function import(string $type, UploadedFile $file, Request $request): int
    {
        $definition = $this->definition($type);
        [$headers, $rows] = $this->readCsv($file);
        $missingHeaders = array_diff($definition['required'], $headers);

        if ($missingHeaders !== []) {
            throw ValidationException::withMessages([
                'file' => 'Kolom wajib tidak ditemukan: '.implode(', ', $missingHeaders).'. Gunakan template terbaru.',
            ]);
        }

        if (count($rows) > 1000) {
            throw ValidationException::withMessages(['file' => 'Maksimal 1.000 baris untuk satu kali import.']);
        }

        $event = $this->resolveEvent($request);

        DB::transaction(function () use ($type, $rows, $event): void {
            foreach ($rows as $index => $row) {
                try {
                    $this->importRow($type, $row, $event);
                } catch (ValidationException $exception) {
                    $message = collect($exception->errors())->flatten()->first() ?? 'Data tidak valid.';

                    throw ValidationException::withMessages([
                        'file' => 'Baris '.($index + 2).": {$message}",
                    ]);
                }
            }
        });

        return count($rows);
    }

    /** @return array{headers: list<string>, required: list<string>, login: bool} */
    private function definition(string $type): array
    {
        abort_unless(array_key_exists($type, self::TYPES), 404);

        return self::TYPES[$type];
    }

    private function resolveEvent(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            if ($request->filled('event_id')) {
                abort_unless($request->string('event_id')->toString() === $tenantEvent->id, 404);
            }

            return $tenantEvent;
        }

        if ($request->filled('event_id')) {
            return Event::findOrFail($request->string('event_id')->toString());
        }

        return Event::query()->where('is_active', true)->first();
    }

    /** @return list<array<int, mixed>> */
    private function exportRows(string $type, ?Event $event): array
    {
        return match ($type) {
            'contingent' => Contingent::query()->with(['event:id,name', 'user:id,email'])
                ->when($event, fn ($query) => $query->whereBelongsTo($event))->orderBy('name')->get()
                ->map(fn (Contingent $item) => [
                    $item->id, $item->event_id, $item->event?->name, $item->name, $item->city,
                    $item->manager_name, $item->phone, $item->email ?: $item->user?->email,
                    $item->address, $item->status?->value ?? $item->status,
                ])->all(),
            'athlete' => Athlete::query()->with('contingent:id,event_id,name')
                ->when($event, fn ($query) => $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($event)))
                ->orderBy('name')->get()->map(fn (Athlete $item) => [
                    $item->id, $item->contingent_id, $item->contingent?->name, $item->name, $item->nik,
                    $item->kenshi_number, $item->gender, $item->birth_place, $item->blood_type,
                    $item->home_address, $item->dojo_name, $item->kyu_dan, $item->weight, $item->height,
                    $item->birth_date?->format('Y-m-d'), $item->bpjs_number, $item->bpjs_status,
                    $item->school_name, $item->school_level, $item->school_entry_year, $item->school_grade,
                ])->all(),
            'official' => Official::query()->with('contingent:id,event_id,name')
                ->when($event, fn ($query) => $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($event)))
                ->orderBy('name')->get()->map(fn (Official $item) => [
                    $item->id, $item->contingent_id, $item->contingent?->name, $item->name, $item->role,
                    $item->gender, $item->phone, $item->email, $item->id_card_number, $item->notes,
                ])->all(),
            'kyu' => Kyu::query()->orderBy('order')->get()->map(fn (Kyu $item) => [
                $item->id, $item->name, $item->belt_color, $item->order, $item->is_active, $item->description,
            ])->all(),
            'technique' => Technique::query()->with('kyu:id,name')->orderBy('order')->get()->map(fn (Technique $item) => [
                $item->id, $item->kyu_id, $item->kyu?->name, $item->name, $item->category,
                $item->description, $item->order, $item->is_active,
            ])->all(),
            'weight-class' => WeightClass::query()->orderBy('order')->get()->map(fn (WeightClass $item) => [
                $item->id, $item->name, $item->gender, $item->min_weight, $item->max_weight,
                $item->order, $item->is_active, $item->description,
            ])->all(),
            'payment-method' => PaymentMethod::query()->orderBy('order')->get()->map(fn (PaymentMethod $item) => [
                $item->id, $item->name, $item->code, $item->type, $item->provider, $item->account_name,
                $item->account_number, $item->instructions, $item->order, $item->is_active,
            ])->all(),
            'referee' => Referee::query()->orderBy('name')->get()->map(fn (Referee $item) => [
                $item->id, $item->name, $item->gender, $item->dan_grade, $item->license_number,
                $item->certification_level, $item->region, $item->phone, $item->email, $item->notes, $item->is_active,
            ])->all(),
            'clerk' => Clerk::query()->orderBy('name')->get()->map(fn (Clerk $item) => [
                $item->id, $item->name, $item->employee_number, $item->certification, $item->region,
                $item->phone, $item->email, $item->notes, $item->is_active,
            ])->all(),
            'field-coordinator' => FieldCoordinator::query()->orderBy('name')->get()->map(fn (FieldCoordinator $item) => [
                $item->id, $item->name, $item->coordinator_number, $item->region, $item->phone,
                $item->email, $item->notes, $item->is_active,
            ])->all(),
            'user' => User::query()->with('roles:id,name')->orderBy('name')->get()->map(fn (User $item) => [
                $item->id, $item->name, $item->email, $item->phone, $item->roles->first()?->name,
            ])->all(),
        };
    }

    /** @param array<string, mixed> $row */
    private function importRow(string $type, array $row, ?Event $event): void
    {
        match ($type) {
            'contingent' => $this->importContingent($row, $event),
            'athlete' => $this->importAthlete($row, $event),
            'official' => $this->importOfficial($row, $event),
            'kyu' => $this->importKyu($row),
            'technique' => $this->importTechnique($row),
            'weight-class' => $this->importWeightClass($row),
            'payment-method' => $this->importPaymentMethod($row),
            'referee' => $this->importReferee($row),
            'clerk' => $this->importClerk($row),
            'field-coordinator' => $this->importFieldCoordinator($row),
            'user' => $this->importUser($row),
        };
    }

    /** @param array<string, mixed> $row */
    private function importContingent(array $row, ?Event $event): void
    {
        $event = $this->eventForRow($row, $event);
        $model = $this->existingModel(Contingent::class, $row['id'] ?? null)
            ?? Contingent::query()->whereBelongsTo($event)->where('name', $row['name'] ?? '')->first();

        if ($model && $model->event_id !== $event->id) {
            $this->failRow('Data kontingen bukan milik event yang sedang dibuka.');
        }

        $existingUser = $model?->user;
        $data = $this->validateRow($row, [
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'manager_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(array_column(ContingentStatus::cases(), 'value'))],
            'password' => ['nullable', Password::defaults()],
        ]);
        $user = $this->syncLoginAccount->execute(
            $data['manager_name'],
            $data['email'],
            $data['password'] ?? null,
            'Contingent',
            $existingUser,
            $data['phone'],
        );

        if (! $user) {
            $this->failRow('Password wajib diisi untuk membuat akun kontingen baru.');
        }

        $linkedContingent = Contingent::query()
            ->where('user_id', $user->id)
            ->when($model, fn ($query) => $query->whereKeyNot($model->id))
            ->first();

        if ($linkedContingent) {
            $this->failRow('Email login sudah digunakan oleh kontingen lain.');
        }

        $model ??= new Contingent;
        $model->fill(collect($data)->except('password')->all());
        $model->event_id = $event->id;
        $model->user_id = $user->id;
        $model->status ??= ContingentStatus::Pending;
        $model->save();
    }

    /** @param array<string, mixed> $row */
    private function importAthlete(array $row, ?Event $event): void
    {
        $contingent = $this->contingentForRow($row, $event);
        $model = $this->existingModel(Athlete::class, $row['id'] ?? null);
        $this->ensureRelatedContingent($model, $event);
        $model ??= Athlete::query()
            ->whereBelongsTo($contingent)
            ->when(filled($row['nik'] ?? null), fn ($query) => $query->where('nik', $row['nik']))
            ->when(blank($row['nik'] ?? null) && filled($row['kenshi_number'] ?? null), fn ($query) => $query->where('kenshi_number', $row['kenshi_number']))
            ->when(blank($row['nik'] ?? null) && blank($row['kenshi_number'] ?? null), fn ($query) => $query->where('name', $row['name'] ?? ''))
            ->first();
        $data = $this->validateRow($row, [
            'name' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'digits:16'],
            'kenshi_number' => ['nullable', 'string', 'max:50'],
            'gender' => ['required', Rule::in(['male', 'female', 'putra', 'putri'])],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'blood_type' => ['nullable', Rule::in(['A', 'B', 'AB', 'O'])],
            'home_address' => ['nullable', 'string', 'max:2000'],
            'dojo_name' => ['nullable', 'string', 'max:255'],
            'kyu_dan' => ['required', 'string', 'max:50'],
            'weight' => ['nullable', 'numeric', 'between:20,200'],
            'height' => ['nullable', 'numeric', 'between:80,250'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'bpjs_number' => ['nullable', 'string', 'max:40'],
            'bpjs_status' => ['nullable', Rule::in(['active', 'inactive', 'none'])],
            'school_name' => ['nullable', 'string', 'max:255'],
            'school_level' => ['nullable', Rule::in(['SMP', 'MTs', 'SMA', 'SMK', 'MA'])],
            'school_entry_year' => ['nullable', 'integer', 'between:1990,2100'],
            'school_grade' => ['nullable', 'integer', 'between:7,13'],
        ]);
        $model ??= new Athlete;
        $model->fill($data);
        $model->contingent_id = $contingent->id;
        $model->save();
    }

    /** @param array<string, mixed> $row */
    private function importOfficial(array $row, ?Event $event): void
    {
        $contingent = $this->contingentForRow($row, $event);
        $model = $this->existingModel(Official::class, $row['id'] ?? null);
        $this->ensureRelatedContingent($model, $event);
        $model ??= Official::query()
            ->whereBelongsTo($contingent)
            ->where('name', $row['name'] ?? '')
            ->when(filled($row['id_card_number'] ?? null), fn ($query) => $query->where('id_card_number', $row['id_card_number']))
            ->first();
        $data = $this->validateRow($row, [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:100'],
            'gender' => ['required', Rule::in(['male', 'female', 'putra', 'putri', 'L', 'P'])],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'id_card_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        $model ??= new Official;
        $model->fill($data);
        $model->contingent_id = $contingent->id;
        $model->save();
    }

    /** @param array<string, mixed> $row */
    private function importKyu(array $row): void
    {
        $model = $this->existingModel(Kyu::class, $row['id'] ?? null)
            ?? Kyu::query()->where('name', $row['name'] ?? '')->first();
        $data = $this->validateRow($this->normalizeBoolean($row), [
            'name' => ['required', 'string', 'max:50', Rule::unique('kyus', 'name')->ignore($model?->id)],
            'belt_color' => ['nullable', 'string', 'max:50'],
            'order' => ['required', 'integer', 'between:0,100'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);
        $this->fillAndSave($model ?? new Kyu, $data, ['is_active' => true]);
    }

    /** @param array<string, mixed> $row */
    private function importTechnique(array $row): void
    {
        $kyu = $this->kyuForRow($row);
        $model = $this->existingModel(Technique::class, $row['id'] ?? null)
            ?? Technique::query()->where('name', $row['name'] ?? '')->where('kyu_id', $kyu?->id)->first();
        $data = $this->validateRow($this->normalizeBoolean($row), [
            'name' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['required', 'integer', 'between:0,1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $data['kyu_id'] = $kyu?->id;
        $this->fillAndSave($model ?? new Technique, $data, ['is_active' => true]);
    }

    /** @param array<string, mixed> $row */
    private function importWeightClass(array $row): void
    {
        $model = $this->existingModel(WeightClass::class, $row['id'] ?? null)
            ?? WeightClass::query()->where('name', $row['name'] ?? '')->first();
        $data = $this->validateRow($this->normalizeBoolean($row), [
            'name' => ['required', 'string', 'max:100', Rule::unique('weight_classes', 'name')->ignore($model?->id)],
            'gender' => ['required', Rule::in(['male', 'female', 'mixed'])],
            'min_weight' => ['nullable', 'numeric', 'between:0,300'],
            'max_weight' => ['nullable', 'numeric', 'between:0,300', 'gte:min_weight'],
            'order' => ['required', 'integer', 'between:0,1000'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);
        $this->fillAndSave($model ?? new WeightClass, $data, ['is_active' => true]);
    }

    /** @param array<string, mixed> $row */
    private function importPaymentMethod(array $row): void
    {
        $model = $this->existingModel(PaymentMethod::class, $row['id'] ?? null)
            ?? PaymentMethod::query()->where('code', $row['code'] ?? '')->first();
        $data = $this->validateRow($this->normalizeBoolean($row), [
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'alpha_dash', 'max:50', Rule::unique('payment_methods', 'code')->ignore($model?->id)],
            'type' => ['required', Rule::in(['bank_transfer', 'qris', 'ewallet', 'cash'])],
            'provider' => ['nullable', 'string', 'max:100'],
            'account_name' => ['nullable', 'string', 'max:150'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'instructions' => ['nullable', 'string', 'max:1000'],
            'order' => ['required', 'integer', 'between:0,1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $this->fillAndSave($model ?? new PaymentMethod, $data, ['is_active' => true]);
    }

    /** @param array<string, mixed> $row */
    private function importReferee(array $row): void
    {
        $model = $this->existingModel(Referee::class, $row['id'] ?? null)
            ?? Referee::query()
                ->when(filled($row['license_number'] ?? null), fn ($query) => $query->where('license_number', $row['license_number']))
                ->when(blank($row['license_number'] ?? null) && filled($row['email'] ?? null), fn ($query) => $query->where('email', $row['email']))
                ->when(blank($row['license_number'] ?? null) && blank($row['email'] ?? null), fn ($query) => $query->where('name', $row['name'] ?? ''))
                ->first();
        $data = $this->validateRow($this->normalizeBoolean($row), [
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'license_number' => ['nullable', 'string', 'max:100', Rule::unique('referees', 'license_number')->ignore($model?->id)],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
            'password' => ['nullable', Password::defaults()],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $model ??= new Referee;
        $model->fill(collect($data)->except('password')->all());
        $model->is_active ??= true;
        $user = $this->syncLoginAccount->execute(
            $data['name'],
            $data['email'] ?? null,
            $data['password'] ?? null,
            'Wasit',
            $model->user,
            $data['phone'] ?? null,
        );

        if ($user && Referee::query()->where('user_id', $user->id)->when($model->exists, fn ($query) => $query->whereKeyNot($model->id))->exists()) {
            $this->failRow('Email login sudah terhubung ke data wasit lain.');
        }

        $model->user_id = $user?->id;
        $model->save();
    }

    /** @param array<string, mixed> $row */
    private function importClerk(array $row): void
    {
        $model = $this->existingModel(Clerk::class, $row['id'] ?? null)
            ?? Clerk::query()
                ->when(filled($row['employee_number'] ?? null), fn ($query) => $query->where('employee_number', $row['employee_number']))
                ->when(blank($row['employee_number'] ?? null) && filled($row['email'] ?? null), fn ($query) => $query->where('email', $row['email']))
                ->first();
        $account = $this->userByEmail($model?->email);
        $data = $this->validateRow($this->normalizeBoolean($row), [
            'name' => ['required', 'string', 'max:150'],
            'employee_number' => ['nullable', 'string', 'max:100', Rule::unique('clerks', 'employee_number')->ignore($model?->id)],
            'certification' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
            'password' => ['nullable', Password::defaults()],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $this->syncLoginAccount->execute($data['name'], $data['email'] ?? null, $data['password'] ?? null, 'Panitera', $account, $data['phone'] ?? null);
        $this->fillAndSave($model ?? new Clerk, collect($data)->except('password')->all(), ['is_active' => true]);
    }

    /** @param array<string, mixed> $row */
    private function importFieldCoordinator(array $row): void
    {
        $model = $this->existingModel(FieldCoordinator::class, $row['id'] ?? null)
            ?? FieldCoordinator::query()
                ->when(filled($row['coordinator_number'] ?? null), fn ($query) => $query->where('coordinator_number', $row['coordinator_number']))
                ->when(blank($row['coordinator_number'] ?? null) && filled($row['email'] ?? null), fn ($query) => $query->where('email', $row['email']))
                ->first();
        $account = $this->userByEmail($model?->email);
        $data = $this->validateRow($this->normalizeBoolean($row), [
            'name' => ['required', 'string', 'max:150'],
            'coordinator_number' => ['nullable', 'string', 'max:100', Rule::unique('field_coordinators', 'coordinator_number')->ignore($model?->id)],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
            'password' => ['nullable', Password::defaults()],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $this->syncLoginAccount->execute($data['name'], $data['email'] ?? null, $data['password'] ?? null, 'Koordinator Lapangan', $account, $data['phone'] ?? null);
        $this->fillAndSave($model ?? new FieldCoordinator, collect($data)->except('password')->all(), ['is_active' => true]);
    }

    /** @param array<string, mixed> $row */
    private function importUser(array $row): void
    {
        $row['phone'] = PhoneNumber::normalize($row['phone'] ?? null);
        $model = $this->existingModel(User::class, $row['id'] ?? null)
            ?? User::query()->whereRaw('LOWER(email) = ?', [Str::lower((string) ($row['email'] ?? ''))])->first();
        $data = $this->validateRow($row, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($model?->id)],
            'phone' => ['nullable', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($model?->id)],
            'password' => [$model ? 'nullable' : 'required', Password::defaults()],
            'role' => ['required', 'string', 'exists:roles,name'],
        ]);
        $model ??= new User;
        $model->name = $data['name'];
        $model->email = Str::lower($data['email']);
        $model->phone = $data['phone'] ?? null;
        $model->email_verified_at ??= now();

        if (filled($data['password'] ?? null)) {
            $model->password = $data['password'];
        }

        $model->save();
        $model->syncRoles([$data['role']]);
    }

    /** @param array<string, mixed> $row */
    private function eventForRow(array $row, ?Event $event): Event
    {
        if ($event) {
            if (filled($row['event_id'] ?? null) && $row['event_id'] !== $event->id) {
                $this->failRow('event_id tidak sesuai dengan event yang sedang dibuka.');
            }

            return $event;
        }

        $rowEvent = Event::query()->find($row['event_id'] ?? null);

        if (! $rowEvent) {
            $this->failRow('event_id wajib diisi dan harus valid.');
        }

        return $rowEvent;
    }

    /** @param array<string, mixed> $row */
    private function contingentForRow(array $row, ?Event $event): Contingent
    {
        $query = Contingent::query()->when($event, fn ($builder) => $builder->whereBelongsTo($event));
        $contingent = filled($row['contingent_id'] ?? null)
            ? (clone $query)->find($row['contingent_id'])
            : (clone $query)->where('name', $row['contingent_name'] ?? '')->first();

        if (! $contingent) {
            $this->failRow('Kontingen tidak ditemukan. Isi contingent_id atau contingent_name yang valid.');
        }

        return $contingent;
    }

    /** @param array<string, mixed> $row */
    private function kyuForRow(array $row): ?Kyu
    {
        if (filled($row['kyu_id'] ?? null)) {
            $kyu = Kyu::query()->find($row['kyu_id']);

            if (! $kyu) {
                $this->failRow('kyu_id tidak ditemukan.');
            }

            return $kyu;
        }

        if (filled($row['kyu_name'] ?? null)) {
            $kyu = Kyu::query()->where('name', $row['kyu_name'])->first();

            if (! $kyu) {
                $this->failRow('kyu_name tidak ditemukan.');
            }

            return $kyu;
        }

        return null;
    }

    /**
     * @template TModel of Model
     *
     * @param  class-string<TModel>  $modelClass
     * @return TModel|null
     */
    private function existingModel(string $modelClass, mixed $id): ?Model
    {
        if (blank($id)) {
            return null;
        }

        $model = $modelClass::query()->find($id);

        if (! $model) {
            $this->failRow('ID data tidak ditemukan. Hapus nilai id jika ingin membuat data baru.');
        }

        return $model;
    }

    private function ensureRelatedContingent(Athlete|Official|null $model, ?Event $event): void
    {
        if ($model && $event && $model->contingent?->event_id !== $event->id) {
            $this->failRow('Data bukan milik event yang sedang dibuka.');
        }
    }

    private function userByEmail(?string $email): ?User
    {
        if (blank($email)) {
            return null;
        }

        return User::query()->whereRaw('LOWER(email) = ?', [Str::lower(trim($email))])->first();
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    private function validateRow(array $data, array $rules): array
    {
        return Validator::make($data, $rules)->validate();
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $defaults
     */
    private function fillAndSave(Model $model, array $data, array $defaults = []): void
    {
        $model->fill($data);

        foreach ($defaults as $attribute => $value) {
            $model->{$attribute} ??= $value;
        }

        $model->save();
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeBoolean(array $row): array
    {
        if (! array_key_exists('is_active', $row) || $row['is_active'] === null) {
            return $row;
        }

        $value = Str::lower(trim((string) $row['is_active']));

        if (in_array($value, ['1', 'true', 'yes', 'ya', 'aktif'], true)) {
            $row['is_active'] = true;
        } elseif (in_array($value, ['0', 'false', 'no', 'tidak', 'nonaktif', 'non-aktif'], true)) {
            $row['is_active'] = false;
        }

        return $row;
    }

    private function failRow(string $message): never
    {
        throw ValidationException::withMessages(['row' => $message]);
    }

    /** @return array{0: list<string>, 1: list<array<string, mixed>>} */
    private function readCsv(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        $contents = file_get_contents($path);

        if ($contents === false || trim($contents) === '') {
            throw ValidationException::withMessages(['file' => 'File CSV kosong.']);
        }

        $firstLine = Str::before($contents, "\n");
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'File CSV tidak dapat dibaca.']);
        }

        $rawHeaders = fgetcsv($handle, 0, $delimiter, '"', '');

        if (! is_array($rawHeaders)) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'Header CSV tidak valid.']);
        }

        $headers = array_map(function (mixed $header, int $index): string {
            $value = trim((string) $header);

            if ($index === 0) {
                $value = preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;
            }

            return Str::snake($value);
        }, $rawHeaders, array_keys($rawHeaders));

        if (count($headers) !== count(array_unique($headers)) || in_array('', $headers, true)) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'Header CSV kosong atau berulang.']);
        }

        $rows = [];

        while (($values = fgetcsv($handle, 0, $delimiter, '"', '')) !== false) {
            $values = array_slice(array_pad($values, count($headers), null), 0, count($headers));

            if (collect($values)->every(fn ($value) => blank($value))) {
                continue;
            }

            $row = array_combine($headers, $values);
            $rows[] = array_map(
                fn ($value) => is_string($value) && trim($value) === '' ? null : (is_string($value) ? trim($value) : $value),
                $row,
            );
        }

        fclose($handle);

        if ($rows === []) {
            throw ValidationException::withMessages(['file' => 'CSV belum memiliki baris data untuk diimpor.']);
        }

        return [$headers, $rows];
    }

    /**
     * @param  list<string>  $headers
     * @param  list<array<int, mixed>>  $rows
     */
    private function writeCsv(array $headers, array $rows): string
    {
        $stream = fopen('php://temp', 'w+b');
        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, $headers, ',', '"', '');

        foreach ($rows as $row) {
            fputcsv($stream, array_map($this->sanitizeCsvValue(...), $row), ',', '"', '');
        }

        rewind($stream);
        $contents = stream_get_contents($stream);
        fclose($stream);

        return $contents ?: '';
    }

    private function sanitizeCsvValue(mixed $value): mixed
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }

        if (is_string($value) && preg_match('/^[=+\-@]/', $value) === 1) {
            return "'{$value}";
        }

        return $value;
    }
}
