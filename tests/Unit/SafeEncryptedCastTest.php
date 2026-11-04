<?php

use App\Casts\SafeEncrypted;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

uses(TestCase::class);

class SafeEncryptedCastDummyModel extends Model
{
    protected $guarded = [];
}

test('it encrypts string values when setting', function () {
    $cast = new SafeEncrypted;
    $model = new SafeEncryptedCastDummyModel;

    $encrypted = $cast->set($model, 'secret', 'Alamat Rahasia 123', []);

    expect($encrypted)->not->toBe('Alamat Rahasia 123')
        ->and(Crypt::decryptString($encrypted))->toBe('Alamat Rahasia 123');
});

test('it decrypts encrypted string values when getting', function () {
    $cast = new SafeEncrypted;
    $model = new SafeEncryptedCastDummyModel;

    $cipher = Crypt::encryptString('Data Sangat Rahasia');
    $decrypted = $cast->get($model, 'secret', $cipher, []);

    expect($decrypted)->toBe('Data Sangat Rahasia');
});

test('it gracefully returns legacy plaintext if decryption fails', function () {
    $cast = new SafeEncrypted;
    $model = new SafeEncryptedCastDummyModel;

    $plaintext = 'Jl. Mawar No. 10 Surabaya (Plaintext Lama)';
    $result = $cast->get($model, 'secret', $plaintext, []);

    expect($result)->toBe($plaintext);
});

test('it handles null and empty string correctly', function () {
    $cast = new SafeEncrypted;
    $model = new SafeEncryptedCastDummyModel;

    expect($cast->set($model, 'secret', null, []))->toBeNull()
        ->and($cast->set($model, 'secret', '', []))->toBe('')
        ->and($cast->get($model, 'secret', null, []))->toBeNull()
        ->and($cast->get($model, 'secret', '', []))->toBe('');
});
