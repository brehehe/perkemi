<?php

use App\Models\Event;
use App\Models\Kyu;
use App\Models\Referee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

dataset('master transfer types', [
    'contingent' => ['contingent', true],
    'athlete' => ['athlete', false],
    'official' => ['official', false],
    'kyu' => ['kyu', false],
    'technique' => ['technique', false],
    'weight class' => ['weight-class', false],
    'payment method' => ['payment-method', false],
    'referee' => ['referee', true],
    'clerk' => ['clerk', true],
    'field coordinator' => ['field-coordinator', true],
    'user' => ['user', true],
]);

test('authenticated admin can download every master template', function (string $type, bool $hasLogin) {
    $response = $this->actingAs(User::factory()->create())
        ->get("/admin/master/data-transfer/{$type}/template");

    $response
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8')
        ->assertHeader('content-disposition', "attachment; filename=\"template-{$type}.csv\"");

    $contents = $response->getContent();

    expect($contents)->toStartWith("\xEF\xBB\xBF");

    if ($hasLogin) {
        expect($contents)->toContain('password');
    } else {
        expect($contents)->not->toContain('password');
    }
})->with('master transfer types');

test('referee csv import creates a login account with wasit role', function () {
    Role::findOrCreate('Wasit', 'web');
    $admin = User::factory()->create();
    $csv = implode("\n", [
        'name,gender,dan_grade,license_number,certification_level,region,phone,email,notes,is_active,password',
        'Sensei Import,male,Dan IV,WST-IMP-01,Nasional A,Jawa Timur,081234567890,wasit.import@example.test,Imported,1,WasitAman123!',
    ]);

    $this->actingAs($admin)
        ->post('/admin/master/data-transfer/referee/import', [
            'file' => UploadedFile::fake()->createWithContent('referee.csv', $csv),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $referee = Referee::query()->where('license_number', 'WST-IMP-01')->firstOrFail();
    $login = User::query()->where('email', 'wasit.import@example.test')->firstOrFail();

    expect($referee->user_id)->toBe($login->id)
        ->and($login->phone)->toBe('6281234567890')
        ->and($login->hasRole('Wasit'))->toBeTrue()
        ->and(password_verify('WasitAman123!', $login->password))->toBeTrue();
});

test('master export never includes password data', function () {
    Role::findOrCreate('Wasit', 'web');
    $admin = User::factory()->create();
    $login = User::factory()->create([
        'email' => 'safe.export@example.test',
        'password' => 'PasswordRahasia123!',
    ]);
    $login->assignRole('Wasit');
    Referee::create([
        'user_id' => $login->id,
        'name' => 'Wasit Aman',
        'gender' => 'male',
        'email' => $login->email,
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->get('/admin/master/data-transfer/referee/export');

    $response->assertOk();
    $contents = $response->getContent();

    expect($contents)
        ->toContain('safe.export@example.test')
        ->not->toContain('password')
        ->not->toContain('PasswordRahasia123!');
});

test('simple master csv import creates and updates kyu data', function () {
    $admin = User::factory()->create();
    $createCsv = implode("\n", [
        'name,belt_color,order,is_active,description',
        'Kyu Import,Coklat,7,ya,Tingkatan import',
    ]);

    $this->actingAs($admin)
        ->post('/admin/master/data-transfer/kyu/import', [
            'file' => UploadedFile::fake()->createWithContent('kyu.csv', $createCsv),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $kyu = Kyu::query()->where('name', 'Kyu Import')->firstOrFail();
    $updateCsv = implode("\n", [
        'id,name,belt_color,order,is_active,description',
        "{$kyu->id},Kyu Import,Hitam,8,tidak,Diperbarui",
    ]);

    $this->actingAs($admin)
        ->post('/admin/master/data-transfer/kyu/import', [
            'file' => UploadedFile::fake()->createWithContent('kyu.csv', $updateCsv),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $kyu->refresh();

    expect($kyu->belt_color)->toBe('Hitam')
        ->and($kyu->order)->toBe(8)
        ->and($kyu->is_active)->toBeFalse();
});

test('csv import supports every master data shape', function () {
    $admin = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Import Lengkap',
        'slug' => 'event-import-lengkap',
        'venue' => 'GOR Import',
        'city' => 'Surabaya',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'is_active' => true,
    ]);

    foreach (['Admin', 'Contingent', 'Wasit', 'Panitera', 'Koordinator Lapangan'] as $role) {
        Role::findOrCreate($role, 'web');
    }

    $import = function (string $type, string $csv) use ($admin, $event): void {
        $this->actingAs($admin)
            ->post("/admin/master/data-transfer/{$type}/import", [
                'event_id' => $event->id,
                'file' => UploadedFile::fake()->createWithContent("{$type}.csv", $csv),
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
    };

    $import('contingent', "name,city,manager_name,phone,email,status,password\nKontingen CSV,Surabaya,Manager CSV,081200000001,kontingen.csv@example.test,verified,KontingenAman123!");
    $import('athlete', "contingent_name,name,gender,kyu_dan,weight,height\nKontingen CSV,Atlet CSV,male,Kyu 1,60,170");
    $import('official', "contingent_name,name,role,gender,email\nKontingen CSV,Official CSV,Pelatih,male,official.csv@example.test");
    $import('kyu', "name,belt_color,order,is_active\nKyu CSV,Coklat,3,1");
    $import('technique', "kyu_name,name,category,order,is_active\nKyu CSV,Teknik CSV,Embu,1,1");
    $import('weight-class', "name,gender,min_weight,max_weight,order,is_active\nKelas CSV,mixed,50,60,1,1");
    $import('payment-method', "name,code,type,order,is_active\nBank CSV,BANK_CSV,bank_transfer,1,1");
    $import('referee', "name,gender,email,password,is_active\nWasit CSV,male,wasit.csv@example.test,WasitCsv123!,1");
    $import('clerk', "name,email,password,is_active\nPanitera CSV,panitera.csv@example.test,PaniteraCsv123!,1");
    $import('field-coordinator', "name,email,password,is_active\nKoordinator CSV,koordinator.csv@example.test,KoordinatorCsv123!,1");
    $import('user', "name,email,role,password\nAdmin CSV,admin.csv@example.test,Admin,AdminCsv123!");

    $this->assertDatabaseHas('contingents', ['event_id' => $event->id, 'name' => 'Kontingen CSV']);
    $this->assertDatabaseHas('athletes', ['name' => 'Atlet CSV']);
    $this->assertDatabaseHas('officials', ['name' => 'Official CSV']);
    $this->assertDatabaseHas('techniques', ['name' => 'Teknik CSV']);
    $this->assertDatabaseHas('weight_classes', ['name' => 'Kelas CSV']);
    $this->assertDatabaseHas('payment_methods', ['code' => 'BANK_CSV']);

    expect(User::query()->where('email', 'kontingen.csv@example.test')->firstOrFail()->hasRole('Contingent'))->toBeTrue()
        ->and(User::query()->where('email', 'wasit.csv@example.test')->firstOrFail()->hasRole('Wasit'))->toBeTrue()
        ->and(User::query()->where('email', 'panitera.csv@example.test')->firstOrFail()->hasRole('Panitera'))->toBeTrue()
        ->and(User::query()->where('email', 'koordinator.csv@example.test')->firstOrFail()->hasRole('Koordinator Lapangan'))->toBeTrue()
        ->and(User::query()->where('email', 'admin.csv@example.test')->firstOrFail()->hasRole('Admin'))->toBeTrue();
});

test('invalid csv rolls back all imported rows', function () {
    $admin = User::factory()->create();
    $csv = implode("\n", [
        'name,belt_color,order,is_active,description',
        'Kyu Valid,Putih,1,1,Valid',
        'Kyu Tidak Valid,Merah,bukan-angka,1,Tidak valid',
    ]);

    $this->actingAs($admin)
        ->from('/admin/master/kyu')
        ->post('/admin/master/data-transfer/kyu/import', [
            'file' => UploadedFile::fake()->createWithContent('kyu.csv', $csv),
        ])
        ->assertRedirect('/admin/master/kyu')
        ->assertSessionHasErrors('file');

    expect(Kyu::query()->whereIn('name', ['Kyu Valid', 'Kyu Tidak Valid'])->exists())->toBeFalse();
});

test('event scoped export only contains contingents from the selected event', function () {
    $admin = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Export Utama',
        'slug' => 'event-export-utama',
        'venue' => 'GOR Utama',
        'city' => 'Jakarta',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-02',
    ]);
    $otherEvent = Event::create([
        'name' => 'Event Export Lain',
        'slug' => 'event-export-lain',
        'venue' => 'GOR Lain',
        'city' => 'Bandung',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-02',
    ]);
    $eventUser = User::factory()->create();
    $otherUser = User::factory()->create();
    $event->contingents()->create([
        'user_id' => $eventUser->id,
        'name' => 'Kontingen Event Utama',
        'city' => 'Jakarta',
        'manager_name' => 'Manajer Utama',
        'phone' => '081111111111',
    ]);
    $otherEvent->contingents()->create([
        'user_id' => $otherUser->id,
        'name' => 'Kontingen Event Lain',
        'city' => 'Bandung',
        'manager_name' => 'Manajer Lain',
        'phone' => '082222222222',
    ]);

    $response = $this->actingAs($admin)
        ->get("/admin/master/data-transfer/contingent/export?event_id={$event->id}");

    $contents = $response->getContent();

    expect($contents)
        ->toContain('Kontingen Event Utama')
        ->not->toContain('Kontingen Event Lain');
});
