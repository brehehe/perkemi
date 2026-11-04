<?php

test('security headers are present on web responses', function () {
    $response = $this->get('/');

    $response->assertHeader('X-Content-Type-Options', 'nosniff');
    $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    $response->assertHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
});

test('hsts header is present on secure https requests', function () {
    $response = $this->get('https://localhost/');

    $response->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
});
