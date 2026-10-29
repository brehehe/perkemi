<?php

use App\Models\User;
use App\Services\Security\DataMasker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

test('http responses include standard security headers', function () {
    $response = $this->get('/');

    $response->assertSuccessful();
    $response->assertHeader('X-Content-Type-Options', 'nosniff');
    $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    $response->assertHeader('X-XSS-Protection', '0');
    expect($response->headers->get('Permissions-Policy'))->toContain('camera=(self)');
});

test('user private broadcast channel prevents idor and correctly matches uuid strings', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $broadcaster = Broadcast::driver();
    $ref = new ReflectionClass($broadcaster);
    $prop = $ref->getProperty('channels');
    $prop->setAccessible(true);
    $channels = $prop->getValue($broadcaster);
    $channelCallback = $channels['App.Models.User.{id}'] ?? null;

    expect($channelCallback)->not->toBeNull();

    // User A authorizing their own channel -> allowed
    $canAccessOwn = $channelCallback($userA, (string) $userA->id);
    expect($canAccessOwn)->toBeTrue();

    // User A attempting to authorize User B channel -> forbidden
    $canAccessOther = $channelCallback($userA, (string) $userB->id);
    expect($canAccessOther)->toBeFalse();
});

test('panitera token login enforces rate limiting against brute force attempts', function () {
    RateLimiter::clear('panitera-token:999999|127.0.0.1');

    for ($i = 0; $i < 5; $i++) {
        $this->post('/login/panitera-token', [
            'token' => '999999',
        ]);
    }

    // 6th attempt must trigger rate limiter lockout
    $lockedResponse = $this->post('/login/panitera-token', [
        'token' => '999999',
    ]);

    $lockedResponse->assertSessionHasErrors('token');
    $errors = session('errors')->get('token');
    expect($errors[0])->toContain('Terlalu banyak percobaan login');
});

test('data masker masks sensitive personal identifiable information correctly', function () {
    // NIK (16 digits)
    expect(DataMasker::maskNik('3578012345670001'))->toBe('357801******0001');
    expect(DataMasker::maskNik(null))->toBeNull();
    expect(DataMasker::maskNik('12345'))->toBe('12***');

    // Phone
    expect(DataMasker::maskPhone('081234567890'))->toBe('0812*****890');
    expect(DataMasker::maskPhone(null))->toBeNull();

    // BPJS
    expect(DataMasker::maskBpjs('0001234567891'))->toBe('0001******891');
    expect(DataMasker::maskBpjs(null))->toBeNull();

    // Email
    expect(DataMasker::maskEmail('johndoe@perkemi.org'))->toBe('j*****e@perkemi.org');
    expect(DataMasker::maskEmail(null))->toBeNull();
    expect(DataMasker::maskEmail('ab@test.com'))->toBe('a*@test.com');
});
